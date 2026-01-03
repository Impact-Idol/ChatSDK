# ChatSDK Quick Start Guide

Get ChatSDK running in 5 minutes.

## Prerequisites

- Docker & Docker Compose
- PostgreSQL database URL
- S3-compatible storage credentials

## Steps

### 1. Configure Environment

```bash
cd delivery-package
cp .env.production.example .env
```

Edit `.env` with your credentials:
```bash
# Database
DB_HOST=your-db-host.com
DB_PASSWORD=your-password

# S3 Storage
S3_ACCESS_KEY=your-key
S3_SECRET_KEY=your-secret

# Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
```

### 2. Start Services

```bash
cd docker
docker compose -f docker-compose.prod.yml up -d
```

### 3. Run Migrations

```bash
docker exec chatsdk-api npm run migrate
```

### 4. Build Frontend

```bash
cd ../examples/react-chat-huly
npm install
npm run build
```

### 5. Deploy

Deploy the `dist/` folder to your web server or CDN.

## Next Steps

- Read [INSTALLATION.md](INSTALLATION.md) for detailed instructions
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- Review [API_REFERENCE.md](API_REFERENCE.md) for API docs

## Support

Email: support@yourdomain.com
