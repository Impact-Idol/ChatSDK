# Production Deployment

Deploy ChatSDK to production with proper environment configuration, scaling, and monitoring.

## Environment Variables

### Required (3 variables minimum)

```bash
# .env.production
DATABASE_URL=postgresql://user:pass@prod-db.com:5432/chatsdk
JWT_SECRET=your-cryptographically-secure-random-secret-min-32-chars
CENTRIFUGO_TOKEN_SECRET=another-cryptographically-secure-secret
```

### Recommended

```bash
# Database
DATABASE_SSL=true
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis (caching & pub/sub)
REDIS_URL=redis://your-redis-cloud-url

# S3 Storage
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=your-production-bucket
S3_ACCESS_KEY_ID=your-aws-key
S3_SECRET_ACCESS_KEY=your-aws-secret

# Meilisearch (full-text search)
MEILISEARCH_HOST=https://your-meilisearch-url
MEILISEARCH_API_KEY=your-api-key

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
```

## Platform-Specific Guides

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add CENTRIFUGO_TOKEN_SECRET production
```

**vercel.json**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-18 chatsdk-app

# Create environment
eb create chatsdk-prod \
  --database.engine postgres \
  --database.size 10 \
  --instance_type t3.medium

# Deploy
eb deploy

# Set environment variables
eb setenv \
  JWT_SECRET=xxx \
  CENTRIFUGO_TOKEN_SECRET=yyy \
  NODE_ENV=production
```

### Docker (Self-Hosted)

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5500
CMD ["npm", "start"]
```

```bash
# Build
docker build -t chatsdk-app .

# Run
docker run -d \
  -p 5500:5500 \
  --env-file .env.production \
  --name chatsdk \
  chatsdk-app
```

### Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatsdk
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chatsdk
  template:
    metadata:
      labels:
        app: chatsdk
    spec:
      containers:
      - name: chatsdk
        image: your-registry/chatsdk:latest
        ports:
        - containerPort: 5500
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: chatsdk-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: chatsdk-secrets
              key: jwt-secret
```

## Database Setup

### PostgreSQL

```bash
# Create production database
psql -U postgres -h your-db-host -p 5432

CREATE DATABASE chatsdk_production;
CREATE USER chatsdk_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE chatsdk_production TO chatsdk_user;
```

### Managed Services

**AWS RDS:**
```bash
aws rds create-db-instance \
  --db-instance-identifier chatsdk-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --allocated-storage 100 \
  --master-username chatsdk \
  --master-user-password xxx
```

**Google Cloud SQL:**
```bash
gcloud sql instances create chatsdk-prod \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1
```

## Scaling Guidelines

### Horizontal Scaling

```bash
# Scale API servers
kubectl scale deployment chatsdk --replicas=5

# Load balancer (Nginx)
upstream chatsdk_backend {
  least_conn;
  server api1.yourdomain.com;
  server api2.yourdomain.com;
  server api3.yourdomain.com;
}

server {
  listen 443 ssl;
  server_name api.yourdomain.com;
  
  location / {
    proxy_pass http://chatsdk_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }
}
```

### Database Scaling

```sql
-- Enable read replicas
-- Add connection pooling (PgBouncer)
-- Partition large tables

-- Example: Partition messages by month
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP NOT NULL,
  ...
) PARTITION BY RANGE (created_at);

CREATE TABLE messages_2024_01 PARTITION OF messages
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Monitoring

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    centrifugo: await checkCentrifugo(),
  };
  
  const isHealthy = Object.values(checks).every((c) => c.status === 'ok');
  
  return Response.json(checks, {
    status: isHealthy ? 200 : 503,
  });
}
```

### Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

logger.info('Message sent', { userId: 'user-123', messageId: 'msg-456' });
```

### Error Tracking (Sentry)

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Metrics (Datadog)

```typescript
import StatsD from 'hot-shots';

const metrics = new StatsD({
  host: 'localhost',
  port: 8125,
  prefix: 'chatsdk.',
});

metrics.increment('messages.sent');
metrics.histogram('messages.latency', messageLatency);
```

## Backup Strategy

```bash
# Daily database backups
pg_dump -h your-db-host -U chatsdk chatsdk_production \
  | gzip > backup-$(date +%Y%m%d).sql.gz

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql.gz \
  s3://your-backup-bucket/db-backups/

# Retain backups for 30 days
```

## SSL/TLS Configuration

```bash
# Let's Encrypt with Certbot
certbot --nginx -d api.yourdomain.com

# Nginx SSL config
ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
```

## CDN Setup

```bash
# CloudFlare
# 1. Add domain to CloudFlare
# 2. Enable caching for static assets
# 3. Enable WebSocket proxying

# CloudFront (AWS)
aws cloudfront create-distribution \
  --origin-domain-name api.yourdomain.com \
  --default-cache-behavior MinTTL=0,MaxTTL=31536000
```

---

## Production Checklist

Before going live:

- [ ] Set all environment variables
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Enable error tracking (Sentry)
- [ ] Configure logging
- [ ] Set up monitoring/alerts
- [ ] Load test with expected traffic
- [ ] Enable rate limiting
- [ ] Review security settings
- [ ] Configure CDN for static assets
- [ ] Set up CI/CD pipeline
- [ ] Prepare rollback plan
- [ ] Document deployment process

---

## Next Steps

- **[Security →](./security.md)** - Security best practices
- **[Performance →](./performance.md)** - Optimization tips
- **[Monitoring Guide →](./monitoring.md)** - Detailed monitoring setup
