# ChatSDK Installation Guide

Complete guide for installing ChatSDK on your infrastructure.

## Quick Start (5 Minutes)

```bash
# 1. Extract and configure
tar -xzf chatsdk-delivery-package-*.tar.gz
cd delivery-package
cp .env.production.example .env
# Edit .env with your credentials

# 2. Start services
cd docker
docker compose -f docker-compose.prod.yml up -d

# 3. Run migrations
docker exec chatsdk-api npm run migrate

# 4. Build frontend
cd ../examples/react-chat-huly
npm install && npm run build

# Deploy dist/ folder
```

## Prerequisites

### Required
- **Docker** 20.10+ & **Docker Compose** 2.0+
- **PostgreSQL** 14+ (AWS RDS, DigitalOcean, Google Cloud SQL)
- **S3-compatible storage** (AWS S3, DigitalOcean Spaces, Cloudflare R2)
- **Domain name** with SSL certificate
- **Node.js** 18+ (for frontend builds)

### System Requirements

| Scale | CPU | RAM | Storage | Deployment Type |
|-------|-----|-----|---------|----------------|
| Small (<100 users) | 2 vCPU | 4GB | 20GB | Single server |
| Medium (100-500) | 4 vCPU | 8GB | 50GB | Load balanced |
| Large (500-2000) | 8 vCPU | 16GB | 100GB | Multi-server |
| Enterprise (2000+) | Auto-scale | 16GB+ | 200GB+ | Kubernetes |

## Installation Steps

### 1. Database Setup

**Create PostgreSQL database:**

```sql
-- Connect to PostgreSQL
CREATE DATABASE chatsdk_production;
CREATE USER chatsdk_user WITH ENCRYPTED PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE chatsdk_production TO chatsdk_user;
```

**For managed services:**
- AWS RDS: Use postgres 14+ with Multi-AZ deployment
- DigitalOcean: Managed PostgreSQL, 2GB+ RAM
- Google Cloud SQL: postgres-14, db-custom-2-7680

### 2. S3 Storage Setup

**AWS S3:**
```bash
aws s3 mb s3://chatsdk-uploads-production
aws s3api put-public-access-block \
  --bucket chatsdk-uploads-production \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

**CORS Configuration (cors.json):**
```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
  "AllowedOrigins": ["https://yourdomain.com"],
  "ExposeHeaders": ["ETag"]
}]
```

```bash
aws s3api put-bucket-cors --bucket chatsdk-uploads-production --cors-configuration file://cors.json
```

### 3. Bootstrap Setup (IMPORTANT!)

**Run the bootstrap script to generate all secrets and create your first app:**

```bash
# This generates JWT_SECRET, ADMIN_API_KEY, CENTRIFUGO_TOKEN_SECRET,
# creates your first application, and updates .env.production automatically
node scripts/bootstrap.mjs --app-name="My Chat App"
```

**What the bootstrap does:**
- ✅ Generates all cryptographically secure secrets
- ✅ Creates `.env.production` with proper configuration
- ✅ Creates your first application with API keys
- ✅ Generates SQL file to insert app into database
- ✅ Saves credentials securely in `credentials/` directory

**Alternative - Manual Setup:**
If you prefer to generate secrets manually:
```bash
cp .env.production.example .env

# Generate secrets manually
openssl rand -hex 64  # JWT_SECRET (128 chars)
openssl rand -hex 32  # ADMIN_API_KEY (64 chars)
openssl rand -hex 32  # CENTRIFUGO_TOKEN_SECRET (64 chars)
openssl rand -hex 32  # CENTRIFUGO_JWT_SECRET
```

**Edit .env with your values:**
```bash
# Database
DB_HOST=your-db.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=chatsdk_production
DB_USER=chatsdk_user
DB_PASSWORD=<your_db_password>
DB_SSL=true

# S3 Storage
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY=<your_access_key>
S3_SECRET_KEY=<your_secret_key>
S3_BUCKET=chatsdk-uploads-production
S3_PUBLIC_URL=https://cdn.yourdomain.com

# WebSocket (Centrifugo)
CENTRIFUGO_URL=wss://yourdomain.com/ws
CENTRIFUGO_API_URL=https://yourdomain.com/centrifugo/api
CENTRIFUGO_API_KEY=<generated_secret>
CENTRIFUGO_TOKEN_SECRET=<generated_secret>
CENTRIFUGO_JWT_SECRET=<generated_secret>

# Application
JWT_SECRET=<generated_secret>
DOMAIN=yourdomain.com
API_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
```

### 4. Docker Deployment

```bash
cd docker

# Build API image
docker build -t chatsdk-api:latest -f Dockerfile.api ..

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check service health
docker compose ps
docker compose logs -f api
```

### 5. Database Migrations

```bash
# Run all migrations
docker exec chatsdk-api npm run migrate

# Verify tables were created
docker exec -it chatsdk-postgres psql -U chatsdk_user -d chatsdk_production -c "\dt"

# Apply bootstrap SQL (created by bootstrap.mjs in step 3)
docker exec -i chatsdk-postgres psql -U chatsdk_user -d chatsdk_production < credentials/bootstrap-*.sql

# Verify your app was created
docker exec -it chatsdk-postgres psql -U chatsdk_user -d chatsdk_production -c "SELECT id, name, api_key FROM app;"
```

Expected tables:
- app, app_user, channels, messages, reactions, attachments
- channel_members, read_receipts, workspaces, threads
- polls, audit_logs, webhooks

**Important:** The bootstrap SQL creates your first application. Save the API key displayed - you'll need it to generate user tokens!

### 6. Frontend Setup

```bash
cd ../examples/react-chat-huly

# Create production .env
cat > .env.production << EOF
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com/ws
VITE_APP_NAME=Your Chat App
EOF

# Install dependencies and build
npm install
npm run build

# Output in dist/ folder
ls -lh dist/
```

### 7. Deploy Frontend

**Option A: nginx**
```bash
sudo cp -r dist/* /var/www/chatsdk/
sudo chown -R www-data:www-data /var/www/chatsdk/
```

**Option B: CloudFront + S3**
```bash
aws s3 sync dist/ s3://your-frontend-bucket/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### 8. nginx Configuration (Optional)

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:5500;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Proxy
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Static Files
    location / {
        root /var/www/chatsdk;
        try_files $uri $uri/ /index.html;
        expires 1h;
    }
}
```

## Verification

### 1. Health Checks

```bash
# API health
curl https://api.yourdomain.com/health
# Expected: {"status":"healthy"}

# WebSocket health
curl https://yourdomain.com/ws/health
# Expected: {"status":"ok"}
```

### 2. Test API

```bash
# Create test user
curl -X POST https://api.yourdomain.com/api/users \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"id":"test-1","name":"Test User","email":"test@example.com"}'
```

### 3. Access Frontend

Open browser to `https://yourdomain.com` - you should see the chat interface.

## Troubleshooting

### Database Connection Failed

```bash
# Check database is accessible
docker exec chatsdk-api pg_isready -h $DB_HOST -p $DB_PORT

# Test connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

### S3 Upload Fails

```bash
# Test S3 credentials
aws s3 ls s3://your-bucket

# Verify CORS configuration
aws s3api get-bucket-cors --bucket your-bucket
```

### WebSocket Connection Failed

```bash
# Check Centrifugo is running
docker ps | grep centrifugo

# Test WebSocket endpoint
wscat -c wss://yourdomain.com/ws
```

### View Logs

```bash
# API logs
docker compose -f docker-compose.prod.yml logs -f api

# Centrifugo logs
docker compose -f docker-compose.prod.yml logs -f centrifugo

# All services
docker compose -f docker-compose.prod.yml logs -f
```

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production best practices
- Review [API_REFERENCE.md](API_REFERENCE.md) for integration details
- Set up monitoring and backups
- Configure SSL/TLS certificates
- Enable auto-scaling

## Support

For help: support@yourdomain.com
