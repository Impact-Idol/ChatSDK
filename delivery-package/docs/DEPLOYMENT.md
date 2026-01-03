# ChatSDK Deployment Guide

Production deployment guide for ChatSDK across different platforms.

## Deployment Options

| Platform | Best For | Est. Monthly Cost | Setup Time |
|----------|----------|-------------------|------------|
| **AWS** | Enterprise, scalability | $105-500 | 2-4 hours |
| **DigitalOcean** | Simplicity, SMBs | $114-300 | 1-2 hours |
| **Google Cloud** | ML/AI features | $120-450 | 2-4 hours |
| **Kubernetes** | Large scale, multi-cloud | Variable | 4-8 hours |
| **Self-Hosted** | Full control, existing infra | Hardware only | 3-6 hours |

## AWS Deployment

### Infrastructure Setup

```bash
# 1. Create RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier chatsdk-prod \
  --db-instance-class db.t3.small \
  --engine postgres \
  --engine-version 14.7 \
  --master-username chatsdk \
  --master-user-password <STRONG_PASSWORD> \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted

# 2. Create ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id chatsdk-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1

# 3. Create S3 bucket
aws s3 mb s3://chatsdk-uploads-prod
aws s3api put-bucket-cors \
  --bucket chatsdk-uploads-prod \
  --cors-configuration file://s3-cors.json

# 4. Create EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name your-key \
  --security-group-ids sg-xxxxxxxx \
  --subnet-id subnet-xxxxxxxx
```

### Deploy Application

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@<ec2-ip>

# Install Docker
sudo apt update && sudo apt install -y docker.io docker-compose

# Transfer deployment package
scp chatsdk-delivery-package-*.tar.gz ubuntu@<ec2-ip>:/home/ubuntu/

# Extract and configure
tar -xzf chatsdk-delivery-package-*.tar.gz
cd delivery-package
cp .env.production.example .env

# Edit .env with AWS resources
nano .env
# Set DB_HOST to RDS endpoint
# Set S3_ENDPOINT to https://s3.us-east-1.amazonaws.com
# Set REDIS_HOST to ElastiCache endpoint

# Start services
cd docker
docker compose -f docker-compose.prod.yml up -d
```

### Cost Breakdown (AWS)
- EC2 t3.medium: ~$30/month
- RDS db.t3.small: ~$40/month
- ElastiCache t3.micro: ~$15/month
- S3 + Data Transfer: ~$10/month
- CloudFront (optional): ~$10/month
- **Total: ~$105/month**

## DigitalOcean Deployment

### One-Command Setup

```bash
# Install doctl
brew install doctl  # macOS
# or: snap install doctl  # Linux

# Authenticate
doctl auth init

# Create infrastructure
doctl compute droplet create chatsdk-prod \
  --size s-2vcpu-4gb \
  --image ubuntu-22-04-x64 \
  --region nyc3 \
  --enable-monitoring \
  --enable-backups

# Create managed database
doctl databases create chatsdk-db \
  --engine pg \
  --version 14 \
  --region nyc3 \
  --size db-s-2vcpu-4gb

# Create Spaces (S3-compatible)
doctl spaces create chatsdk-uploads --region nyc3

# Create Redis
doctl databases create chatsdk-redis \
  --engine redis \
  --region nyc3 \
  --size db-s-1vcpu-1gb
```

### Deploy

```bash
# Get droplet IP
IP=$(doctl compute droplet get chatsdk-prod --format PublicIPv4 --no-header)

# SSH and install
ssh root@$IP

# Install Docker
curl -fsSL https://get.docker.com | sh

# Deploy application (same as AWS steps above)
```

### Cost Breakdown (DigitalOcean)
- Droplet 4GB: ~$24/month
- Managed PostgreSQL: ~$55/month
- Managed Redis: ~$30/month
- Spaces: ~$5/month
- **Total: ~$114/month**

## Google Cloud Platform

```bash
# Create Cloud SQL instance
gcloud sql instances create chatsdk-prod \
  --database-version=POSTGRES_14 \
  --tier=db-custom-2-7680 \
  --region=us-central1 \
  --backup

# Create GCS bucket
gsutil mb -l us-central1 gs://chatsdk-uploads-prod

# Create Compute Engine instance
gcloud compute instances create chatsdk-api \
  --machine-type=e2-standard-2 \
  --zone=us-central1-a \
  --image-family=ubuntu-2204-lts \
  --boot-disk-size=50GB

# Deploy application (similar to AWS)
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (EKS, GKE, AKS, or self-managed)
- kubectl configured
- Helm 3 installed

### Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatsdk-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chatsdk-api
  template:
    metadata:
      labels:
        app: chatsdk-api
    spec:
      containers:
      - name: api
        image: your-registry/chatsdk-api:latest
        ports:
        - containerPort: 5500
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: chatsdk-secrets
              key: db-host
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5500
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 5500
---
apiVersion: v1
kind: Service
metadata:
  name: chatsdk-api
spec:
  selector:
    app: chatsdk-api
  ports:
  - port: 80
    targetPort: 5500
  type: LoadBalancer
```

```bash
# Create secrets
kubectl create secret generic chatsdk-secrets \
  --from-literal=db-host=<db-host> \
  --from-literal=db-password=<password> \
  --from-literal=jwt-secret=<secret>

# Deploy
kubectl apply -f k8s/deployment.yaml

# Auto-scaling
kubectl autoscale deployment chatsdk-api \
  --min=2 --max=10 \
  --cpu-percent=70
```

## Production Best Practices

### 1. Security

```bash
# Generate strong secrets
openssl rand -hex 32  # For all secrets

# Enable SSL/TLS
certbot --nginx -d yourdomain.com

# Firewall rules
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw enable

# Database security
# - Enable SSL connections
# - Use private networks
# - Regular security patches
# - Strong passwords (16+ chars)
```

### 2. Backups

```bash
# Database backups (automated)
# AWS RDS: 7-30 day retention
# DigitalOcean: Daily automated backups

# Manual backup script
#!/bin/bash
BACKUP_DIR=/backups/$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Database
docker exec chatsdk-postgres pg_dump -U chatsdk_user chatsdk_production \
  > $BACKUP_DIR/database.sql

# Upload to S3
aws s3 sync $BACKUP_DIR s3://chatsdk-backups/$(date +%Y%m%d)/
```

### 3. Monitoring

```yaml
# docker-compose includes Prometheus + Grafana
# Access Grafana at http://localhost:3000
# Default login: admin/admin

# Key metrics to monitor:
# - API response time (p50, p95, p99)
# - Error rate (5xx responses)
# - Database connections
# - Memory/CPU usage
# - WebSocket connections
```

### 4. Scaling

**Horizontal Scaling:**
```bash
# Add more API servers behind load balancer
# Scale Centrifugo with Redis broker
# Use read replicas for database

# Auto-scaling (Kubernetes)
kubectl autoscale deployment chatsdk-api \
  --min=2 --max=10 \
  --cpu-percent=70
```

**Vertical Scaling:**
```bash
# Upgrade server size
# t3.medium → t3.large → t3.xlarge

# Database
# db.t3.small → db.t3.medium → db.t3.large
```

### 5. CDN Configuration

```bash
# CloudFront for frontend
aws cloudfront create-distribution \
  --origin-domain-name your-bucket.s3.amazonaws.com \
  --default-root-object index.html

# Cache static assets
# JS/CSS/Images: 1 year
# API responses: No cache
```

### 6. Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);

-- Enable query logging (temporarily)
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Regular maintenance
VACUUM ANALYZE messages;
VACUUM ANALYZE channels;
```

### 7. SSL/TLS Setup

```bash
# Using Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

## Environment-Specific Configurations

### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
METRICS_ENABLED=false
```

### Staging
```bash
NODE_ENV=staging
LOG_LEVEL=info
METRICS_ENABLED=true
# Use separate database/S3 bucket
```

### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
METRICS_ENABLED=true
RATE_LIMIT_ENABLED=true
```

## Disaster Recovery

### Backup Strategy
1. **Database:** Daily automated backups, 30-day retention
2. **Files (S3):** Versioning enabled, cross-region replication
3. **Configuration:** Version control (.env templates in git)

### Recovery Procedure
```bash
# 1. Restore database
pg_restore -h localhost -U chatsdk_user -d chatsdk_production \
  --clean --if-exists backup.dump

# 2. Restore S3 files (if needed)
aws s3 sync s3://chatsdk-backups/20250103/ s3://chatsdk-uploads-prod/

# 3. Restart services
docker compose -f docker-compose.prod.yml restart
```

## Performance Tuning

### Node.js Optimization
```bash
NODE_OPTIONS="--max-old-space-size=2048"
NODE_ENV=production
```

### PostgreSQL Tuning
```ini
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
max_connections = 100
```

### nginx Tuning
```nginx
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
client_max_body_size 50M;
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

## Monitoring & Alerts

### Health Checks
```bash
# API health endpoint
curl https://api.yourdomain.com/health

# WebSocket health
curl https://api.yourdomain.com/ws/health

# Database health
docker exec chatsdk-postgres pg_isready
```

### Log Aggregation
- Use CloudWatch (AWS)
- Use DigitalOcean Monitoring
- Use ELK Stack (self-hosted)
- Use Datadog/New Relic

### Alerts
- Database down
- High error rate (>5%)
- High response time (>2s p95)
- Disk space >80%
- Memory usage >90%

## Support & Maintenance

### Regular Tasks
- Weekly: Review logs for errors
- Monthly: Update dependencies, security patches
- Quarterly: Database performance review
- Annually: Infrastructure cost optimization

### Update Procedure
```bash
# 1. Pull new version
docker pull your-registry/chatsdk-api:latest

# 2. Run migrations (if any)
docker exec chatsdk-api npm run migrate

# 3. Restart with new version
docker compose -f docker-compose.prod.yml up -d --force-recreate api
```

## Support

For deployment assistance: support@yourdomain.com
