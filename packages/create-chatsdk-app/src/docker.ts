import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

interface DockerSetupResult {
  success: boolean;
  message: string;
}

export async function setupDocker(projectPath: string): Promise<DockerSetupResult> {
  // Check if Docker is running
  try {
    await execa('docker', ['info'], { stdio: 'ignore' });
  } catch {
    return {
      success: false,
      message: 'Docker is not running. Start Docker Desktop and run: docker compose up -d',
    };
  }

  // Copy docker-compose.yml if not exists
  const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
  if (!(await fs.pathExists(dockerComposePath))) {
    const dockerComposeContent = `# ChatSDK Docker Services
# Includes all backing services needed for development

services:
  # PostgreSQL - Primary Database
  postgres:
    image: postgres:16-alpine
    container_name: chatsdk-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: chatsdk
      POSTGRES_PASSWORD: \${DB_PASSWORD:-changeme}
      POSTGRES_DB: chatsdk
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chatsdk"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Centrifugo - Real-time WebSocket Server
  centrifugo:
    image: centrifugo/centrifugo:v5
    container_name: chatsdk-centrifugo
    ports:
      - "8001:8000"
    environment:
      CENTRIFUGO_API_KEY: chatsdk-api-key-change-in-production
      CENTRIFUGO_TOKEN_HMAC_SECRET_KEY: chatsdk-dev-secret-key-change-in-production
      CENTRIFUGO_ADMIN_PASSWORD: admin
      CENTRIFUGO_ADMIN_SECRET: admin-secret
      CENTRIFUGO_LOG_LEVEL: info
    command: centrifugo --config=/dev/null
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8000/health"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis - Pub/Sub & Caching
  redis:
    image: redis:7-alpine
    container_name: chatsdk-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # MinIO - S3-compatible Storage
  minio:
    image: minio/minio:latest
    container_name: chatsdk-minio
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console
    environment:
      MINIO_ROOT_USER: chatsdk
      MINIO_ROOT_PASSWORD: \${MINIO_PASSWORD:-changeme123}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Meilisearch - Full-text Search
  meilisearch:
    image: getmeili/meilisearch:v1.6
    container_name: chatsdk-meilisearch
    ports:
      - "7700:7700"
    environment:
      MEILI_MASTER_KEY: \${MEILISEARCH_KEY:-changeme_key}
      MEILI_ENV: development
    volumes:
      - meilisearch_data:/meili_data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7700/health"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  postgres_data:
  redis_data:
  minio_data:
  meilisearch_data:

networks:
  default:
    name: chatsdk-network
`;

    await fs.writeFile(dockerComposePath, dockerComposeContent);
  }

  // Start Docker services
  try {
    await execa('docker', ['compose', 'up', '-d'], {
      cwd: projectPath,
      stdio: 'ignore',
    });

    return {
      success: true,
      message: 'Docker services started successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to start Docker services. Run manually: docker compose up -d`,
    };
  }
}
