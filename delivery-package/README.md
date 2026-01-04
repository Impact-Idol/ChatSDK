# ChatSDK - Self-Hosted Deployment Package

> Mobile-first chat platform | Production-ready | Self-hosted

## 📦 Package Contents

- **SDK Packages**: Core, React, React Native SDKs (built & ready)
- **Docker Configs**: Production deployment files
- **Example App**: Full-featured React chat (react-chat-huly)
- **Documentation**: Complete installation, deployment, and API guides

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Extract package
tar -xzf chatsdk-delivery-package-*.tar.gz
cd delivery-package

# 2. Bootstrap (Generate secrets & create first app)
node scripts/bootstrap.mjs --app-name="My Chat App"
# This creates .env.production with all secrets automatically

# 3. Start services
cd docker
docker compose -f docker-compose.prod.yml up -d

# 4. Run migrations & bootstrap SQL
docker exec chatsdk-api npm run migrate
docker exec -i chatsdk-postgres psql -U chatsdk -d chatsdk < ../credentials/bootstrap-*.sql

# 5. Test authentication
export API_KEY=$(cat ../credentials/app-*.json | grep apiKey | cut -d'"' -f4)
curl -X POST http://localhost:5500/api/tokens \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "name": "Test User"}'

# 6. Build frontend
cd ../examples/react-chat-huly
npm install && npm run build

# 7. Deploy dist/ to your server or CDN
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [**AUTHENTICATION.md**](docs/AUTHENTICATION.md) | **🔑 Auth setup, JWT tokens, secret management** |
| [INSTALLATION.md](docs/INSTALLATION.md) | Complete installation guide with prerequisites |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Platform-specific deployment (AWS, DO, GCP, K8s) |
| [API_REFERENCE.md](docs/API_REFERENCE.md) | Full REST API & WebSocket documentation |
| [QUICK_START.md](docs/QUICK_START.md) | 5-minute quickstart guide |

## ✅ Prerequisites

- Docker & Docker Compose
- PostgreSQL 14+ (AWS RDS, DigitalOcean, Google Cloud SQL)
- S3-compatible storage (AWS S3, Spaces, R2)
- Domain with SSL certificate
- Node.js 18+ (for frontend builds)

## 🏗️ Architecture

```
┌──────────────┐         ┌─────────────┐
│ Load Balancer│◄────────│  CloudFront │
│  (nginx/ALB) │         │     (CDN)   │
└──────┬───────┘         └─────────────┘
       │
  ┌────▼────────┬─────────────┐
  │ API Server  │ Centrifugo  │
  │  (Node.js)  │ (WebSocket) │
  └────┬────────┴──────┬──────┘
       │               │
  ┌────▼───────────────▼───┐
  │    PostgreSQL DB       │
  └────────┬───────────────┘
           │
    ┌──────▼──────┐
    │  S3/MinIO   │
    └─────────────┘
```

## 🔑 Key Features

### Core
- ✅ Real-time messaging (WebSocket)
- ✅ Direct messages & group channels
- ✅ Rich attachments (images, videos, files)
- ✅ Reactions, threads, mentions
- ✅ Typing indicators & read receipts
- ✅ File uploads (S3-compatible)
- ✅ Full-text search
- ✅ User presence tracking

### Enterprise
- ✅ Workspaces for multi-tenancy
- ✅ Roles & permissions
- ✅ Audit logging
- ✅ Webhooks
- ✅ Rate limiting
- ✅ Prometheus metrics
- ✅ Mobile SDKs (React Native, iOS)

## 🔐 Environment Configuration

Generate strong secrets:
```bash
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For CENTRIFUGO_TOKEN_SECRET
openssl rand -hex 32  # For CENTRIFUGO_API_KEY
```

Essential `.env` variables:
```bash
# Database
DB_HOST=your-postgres-host.com
DB_PASSWORD=strong_password
DB_SSL=true

# S3 Storage
S3_ACCESS_KEY=your_key
S3_SECRET_KEY=your_secret
S3_BUCKET=chatsdk-uploads

# Secrets
JWT_SECRET=<generated>
CENTRIFUGO_TOKEN_SECRET=<generated>
CENTRIFUGO_API_KEY=<generated>

# Domain
DOMAIN=yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
```

## 📊 Deployment Costs

| Platform | Monthly Cost | Best For |
|----------|-------------|----------|
| AWS | $105-500 | Enterprise, scalability |
| DigitalOcean | $114-300 | Simplicity, SMBs |
| Google Cloud | $120-450 | ML/AI features |
| Kubernetes | Variable | Large scale |

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js 18+ (Hono framework) |
| Database | PostgreSQL 14+ |
| Real-time | Centrifugo 5.0+ (WebSocket) |
| Caching | Redis 7+ |
| Storage | S3-compatible (AWS S3, Spaces, R2) |
| Frontend | React 18+ + TypeScript |
| Mobile | React Native + Expo |
| iOS | Swift SDK (iOS 15+) |

## 📦 Package Structure

```
delivery-package/
├── packages/
│   ├── core/              # @chatsdk/core (built)
│   ├── react/             # @chatsdk/react (built)
│   ├── react-native/      # @chatsdk/react-native (built)
│   └── api/               # Backend API server (built)
├── docker/
│   ├── docker-compose.prod.yml
│   ├── Dockerfile.api
│   ├── centrifugo.json
│   ├── nginx.prod.conf
│   └── migrations/        # Database migrations
├── examples/
│   └── react-chat-huly/   # Full React chat app (source)
├── docs/
│   ├── INSTALLATION.md
│   ├── DEPLOYMENT.md
│   ├── API_REFERENCE.md
│   └── QUICK_START.md
├── .env.production.example
└── README.md (this file)
```

## 🔒 Security Features

- JWT authentication with refresh tokens
- API key authentication for server-to-server
- Rate limiting (configurable)
- CORS protection
- SQL injection prevention
- XSS protection
- Webhook signature verification
- SSL/TLS encryption

## 📈 Scaling Guide

| Users | Recommended Setup |
|-------|-------------------|
| <100 | Single server (2 vCPU, 4GB RAM) |
| 100-500 | Load balanced (2x servers) |
| 500-2K | Multi-server + read replicas |
| 2K+ | Kubernetes auto-scaling |

## 🧪 Verification

After deployment:

```bash
# 1. Health check
curl https://api.yourdomain.com/health
# Expected: {"status":"healthy"}

# 2. WebSocket check
curl https://yourdomain.com/ws/health
# Expected: {"status":"ok"}

# 3. Test frontend
# Open browser to https://yourdomain.com
```

## 🐛 Troubleshooting

### Database connection failed
```bash
docker exec chatsdk-api pg_isready -h $DB_HOST -p $DB_PORT
```

### S3 upload fails
```bash
aws s3 ls s3://your-bucket
```

### WebSocket not connecting
```bash
docker ps | grep centrifugo
```

See [INSTALLATION.md#troubleshooting](docs/INSTALLATION.md#troubleshooting) for complete guide.

## 🔄 Updates & Maintenance

### Regular Tasks
- Weekly: Review logs
- Monthly: Security patches
- Quarterly: Performance review
- Backups: Automated daily

### Update Procedure
```bash
# Pull new version
docker pull your-registry/chatsdk-api:latest

# Run migrations
docker exec chatsdk-api npm run migrate

# Restart services
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

## 📞 Support

- **Email**: support@yourdomain.com
- **Documentation**: See `docs/` folder
- **Emergency**: contact@yourdomain.com

## 📜 License

Licensed for use by **[Client Name]**.

- ✅ Self-hosting and deployment rights
- ✅ Customization and white-labeling
- ✅ Internal use within your organization
- ❌ Redistribution or resale prohibited

## 🎯 Next Steps

1. **Read**: [docs/INSTALLATION.md](docs/INSTALLATION.md) for detailed setup
2. **Deploy**: Follow platform-specific guide in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
3. **Integrate**: Review [docs/API_REFERENCE.md](docs/API_REFERENCE.md)
4. **Customize**: Edit `examples/react-chat-huly` for your brand

---

**Package Version**: 1.0.0  
**Build Date**: January 3, 2025  
**Support Valid Until**: January 3, 2026  

🎉 **Ready for production deployment!**
