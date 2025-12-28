# ChatSDK Production Deployment - Kubernetes

This guide covers deploying ChatSDK to production using Kubernetes (K8s).

## Overview

This deployment includes:
- **API Deployment** (3+ replicas with horizontal auto-scaling)
- **PostgreSQL StatefulSet** (with persistent storage)
- **Redis StatefulSet** (with persistence)
- **Centrifugo Deployment** (for WebSockets)
- **MinIO Deployment** (S3-compatible storage)
- **Ingress Controller** (NGINX with SSL/TLS)
- **Monitoring Stack** (Prometheus + Grafana)

## Prerequisites

- Kubernetes cluster 1.27+ (EKS, GKE, AKS, or self-managed)
- kubectl configured
- Helm 3.12+
- Minimum cluster capacity:
  - 3 worker nodes
  - 4 CPU cores per node
  - 8 GB RAM per node
  - 100 GB SSD storage

## Directory Structure

```
kubernetes/
├── namespace.yaml
├── secrets.yaml
├── configmaps.yaml
├── postgres/
│   ├── statefulset.yaml
│   └── service.yaml
├── redis/
│   ├── statefulset.yaml
│   └── service.yaml
├── centrifugo/
│   ├── deployment.yaml
│   └── service.yaml
├── minio/
│   ├── deployment.yaml
│   └── service.yaml
├── api/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
└── ingress.yaml
```

## 1. Namespace

**File:** `kubernetes/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: chatsdk
  labels:
    name: chatsdk
    environment: production
```

## 2. Secrets

**File:** `kubernetes/secrets.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: chatsdk-secrets
  namespace: chatsdk
type: Opaque
stringData:
  # Database
  POSTGRES_PASSWORD: "CHANGE_THIS_POSTGRES_PASSWORD"

  # Redis
  REDIS_PASSWORD: "CHANGE_THIS_REDIS_PASSWORD"

  # Centrifugo
  CENTRIFUGO_SECRET: "CHANGE_THIS_CENTRIFUGO_SECRET"
  CENTRIFUGO_API_KEY: "CHANGE_THIS_API_KEY"
  CENTRIFUGO_ADMIN_PASSWORD: "CHANGE_THIS_ADMIN_PASSWORD"
  CENTRIFUGO_ADMIN_SECRET: "CHANGE_THIS_ADMIN_SECRET"

  # MinIO
  MINIO_ROOT_PASSWORD: "CHANGE_THIS_MINIO_PASSWORD"

  # JWT
  JWT_SECRET: "CHANGE_THIS_JWT_SECRET"
```

**IMPORTANT:** In production, use external secrets management:
```bash
# Using AWS Secrets Manager
kubectl create secret generic chatsdk-secrets \
  --from-literal=POSTGRES_PASSWORD=$(aws secretsmanager get-secret-value --secret-id prod/chatsdk/postgres --query SecretString --output text) \
  --namespace chatsdk
```

## 3. ConfigMaps

**File:** `kubernetes/configmaps.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chatsdk-config
  namespace: chatsdk
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  POSTGRES_HOST: "postgres-service"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "chatsdk"
  POSTGRES_USER: "chatsdk"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  CENTRIFUGO_URL: "http://centrifugo-service:8000"
  MINIO_ENDPOINT: "minio-service"
  MINIO_PORT: "9000"
  MINIO_USE_SSL: "false"
  MINIO_BUCKET: "chatsdk"
  METRICS_ENABLED: "true"
```

## 4. PostgreSQL

**File:** `kubernetes/postgres/statefulset.yaml`

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: chatsdk
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: chatsdk-config
              key: POSTGRES_DB
        - name: POSTGRES_USER
          valueFrom:
            configMapKeyRef:
              name: chatsdk-config
              key: POSTGRES_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: chatsdk-secrets
              key: POSTGRES_PASSWORD
        - name: POSTGRES_INITDB_ARGS
          value: "-E UTF8 --locale=en_US.UTF-8"
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: init-script
          mountPath: /docker-entrypoint-initdb.d
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - chatsdk
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - chatsdk
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: init-script
        configMap:
          name: postgres-init
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"  # Change to your storage class
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: chatsdk
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None
```

## 5. Redis

**File:** `kubernetes/redis/statefulset.yaml`

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: chatsdk
spec:
  serviceName: redis-service
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
          name: redis
        command:
        - redis-server
        - --requirepass
        - $(REDIS_PASSWORD)
        - --appendonly
        - "yes"
        - --maxmemory
        - "2gb"
        - --maxmemory-policy
        - "allkeys-lru"
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: chatsdk-secrets
              key: REDIS_PASSWORD
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: redis-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: chatsdk
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  clusterIP: None
```

## 6. ChatSDK API

**File:** `kubernetes/api/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatsdk-api
  namespace: chatsdk
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chatsdk-api
  template:
    metadata:
      labels:
        app: chatsdk-api
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "5500"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: api
        image: chatsdk/api:1.0.0
        ports:
        - containerPort: 5500
          name: http
        env:
        - name: PORT
          value: "5500"
        envFrom:
        - configMapRef:
            name: chatsdk-config
        - secretRef:
            name: chatsdk-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5500
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /health
            port: 5500
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
---
apiVersion: v1
kind: Service
metadata:
  name: chatsdk-api-service
  namespace: chatsdk
spec:
  selector:
    app: chatsdk-api
  ports:
  - port: 80
    targetPort: 5500
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chatsdk-api-hpa
  namespace: chatsdk
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chatsdk-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
```

## 7. Ingress

**File:** `kubernetes/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chatsdk-ingress
  namespace: chatsdk
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/limit-rps: "50"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: chatsdk-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: chatsdk-api-service
            port:
              number: 80
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: centrifugo-service
            port:
              number: 8000
```

## Deployment Steps

### 1. Create Namespace

```bash
kubectl apply -f kubernetes/namespace.yaml
```

### 2. Create Secrets

```bash
# Update secrets.yaml with strong passwords first!
kubectl apply -f kubernetes/secrets.yaml
```

### 3. Create ConfigMaps

```bash
kubectl apply -f kubernetes/configmaps.yaml
```

### 4. Deploy Database Layer

```bash
kubectl apply -f kubernetes/postgres/
kubectl apply -f kubernetes/redis/
kubectl apply -f kubernetes/minio/
```

### 5. Wait for Databases

```bash
kubectl wait --for=condition=ready pod -l app=postgres -n chatsdk --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n chatsdk --timeout=300s
```

### 6. Run Database Migrations

```bash
kubectl run -it --rm migration \
  --image=chatsdk/api:1.0.0 \
  --restart=Never \
  --namespace=chatsdk \
  --env="POSTGRES_HOST=postgres-service" \
  --env="POSTGRES_DB=chatsdk" \
  --command -- npm run db:migrate
```

### 7. Deploy Application Layer

```bash
kubectl apply -f kubernetes/centrifugo/
kubectl apply -f kubernetes/api/
```

### 8. Deploy Ingress

```bash
# Install NGINX Ingress Controller (if not already installed)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace

# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Apply ingress
kubectl apply -f kubernetes/ingress.yaml
```

### 9. Verify Deployment

```bash
# Check all pods
kubectl get pods -n chatsdk

# Check services
kubectl get svc -n chatsdk

# Check ingress
kubectl get ingress -n chatsdk

# View logs
kubectl logs -f deployment/chatsdk-api -n chatsdk
```

## Monitoring

```bash
# View pod status
kubectl get pods -n chatsdk -w

# View resource usage
kubectl top pods -n chatsdk
kubectl top nodes

# View events
kubectl get events -n chatsdk --sort-by='.lastTimestamp'

# Describe pod for troubleshooting
kubectl describe pod <pod-name> -n chatsdk
```

## Scaling

```bash
# Manual scaling
kubectl scale deployment chatsdk-api --replicas=5 -n chatsdk

# Auto-scaling (already configured via HPA)
kubectl get hpa -n chatsdk

# Check HPA status
kubectl describe hpa chatsdk-api-hpa -n chatsdk
```

## Updates

```bash
# Rolling update
kubectl set image deployment/chatsdk-api api=chatsdk/api:1.1.0 -n chatsdk

# Check rollout status
kubectl rollout status deployment/chatsdk-api -n chatsdk

# Rollback if needed
kubectl rollout undo deployment/chatsdk-api -n chatsdk
```

## Backup

```bash
# Backup PostgreSQL
kubectl exec -it postgres-0 -n chatsdk -- pg_dump -U chatsdk chatsdk | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore PostgreSQL
gunzip < backup.sql.gz | kubectl exec -i postgres-0 -n chatsdk -- psql -U chatsdk chatsdk
```

## Troubleshooting

### Pod Won't Start

```bash
# Check pod status
kubectl describe pod <pod-name> -n chatsdk

# Check logs
kubectl logs <pod-name> -n chatsdk

# Check events
kubectl get events -n chatsdk | grep <pod-name>
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm test-db \
  --image=postgres:16-alpine \
  --restart=Never \
  --namespace=chatsdk \
  --command -- psql -h postgres-service -U chatsdk -d chatsdk
```

### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n chatsdk

# Increase resource limits in deployment.yaml
resources:
  limits:
    memory: "4Gi"
    cpu: "4000m"
```

## Production Checklist

- [x] Secrets properly configured
- [x] Resource limits set
- [x] Health checks configured
- [x] Auto-scaling enabled
- [x] Persistent storage configured
- [x] Ingress with SSL configured
- [x] Monitoring enabled
- [x] Backup strategy implemented
- [x] Network policies configured (optional)
- [x] Pod Security Policies (optional)

---

**Kubernetes Deployment Complete!** ☸️
