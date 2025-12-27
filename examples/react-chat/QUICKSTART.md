# React Chat Demo - Quick Start

## 🚀 Deploy in 3 Steps

### Step 1: Start Docker Desktop

Open Docker Desktop application on your Mac. Wait for it to show "Running" status.

### Step 2: Deploy the App

```bash
cd /Users/pushkar/Downloads/ChatSDK/examples/react-chat
./deploy.sh
```

Or use Docker Compose directly:

```bash
cd /Users/pushkar/Downloads/ChatSDK
docker compose -f docker/docker-compose.yml up -d react-chat
```

### Step 3: Access the App

Open your browser to: **http://localhost:5500**

---

## 📋 Management Commands

### Start the app
```bash
cd /Users/pushkar/Downloads/ChatSDK
docker compose -f docker/docker-compose.yml up -d react-chat
```

### Stop the app (port-specific)
```bash
# Stop Docker container
docker compose -f docker/docker-compose.yml stop react-chat

# Or kill anything on port 5500
lsof -ti:5500 | xargs kill -9
```

### View logs
```bash
docker compose -f docker/docker-compose.yml logs -f react-chat
```

### Rebuild after code changes
```bash
docker compose -f docker/docker-compose.yml build react-chat
docker compose -f docker/docker-compose.yml up -d react-chat
```

### Check status
```bash
docker compose -f docker/docker-compose.yml ps react-chat
```

---

## 🔧 Troubleshooting

### "Port 5500 already in use"
```bash
# Check what's using it
lsof -i:5500

# Kill it
lsof -ti:5500 | xargs kill -9

# Restart the container
docker compose -f docker/docker-compose.yml restart react-chat
```

### "Cannot connect to Docker daemon"
1. Open Docker Desktop
2. Wait for the status to show "Running"
3. Try the deploy command again

### Container won't start
```bash
# Check logs
docker compose -f docker/docker-compose.yml logs react-chat

# Rebuild from scratch
docker compose -f docker/docker-compose.yml build --no-cache react-chat
```

---

## 📁 What Was Created

- **[Dockerfile](./Dockerfile)** - Multi-stage build (Node.js → Nginx)
- **[nginx.conf](./nginx.conf)** - Web server config for port 5500
- **[.env.production](./.env.production)** - Production environment vars
- **[deploy.sh](./deploy.sh)** - Automated deployment script
- **[docker-compose.yml](../../docker/docker-compose.yml)** - Added `react-chat` service

---

## 🎯 Port 5500 Configuration

The app is locked to port 5500:
- ✅ Vite dev server: port 5500
- ✅ Docker container: port 5500
- ✅ Nginx: listens on port 5500
- ✅ `strictPort: true` - won't use alternative ports

This ensures it won't conflict with other engineers' servers on different ports.
