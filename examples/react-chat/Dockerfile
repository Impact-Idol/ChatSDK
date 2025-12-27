# Multi-stage build for React Chat App
# Stage 1: Build the app
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/react/package*.json ./packages/react/
COPY examples/react-chat/package*.json ./examples/react-chat/

# Install dependencies
RUN npm ci

# Rebuild esbuild for Alpine Linux (fixes binary mismatch)
RUN npm rebuild esbuild

# Copy source code
COPY packages/core ./packages/core
COPY packages/react ./packages/react
COPY examples/react-chat ./examples/react-chat

# Build core and react packages first
WORKDIR /app/packages/core
RUN npm run build

WORKDIR /app/packages/react
RUN npm run build

# Build the React app
WORKDIR /app/examples/react-chat
RUN npm rebuild esbuild
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY examples/react-chat/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/examples/react-chat/dist /usr/share/nginx/html

# Expose port 5500
EXPOSE 5500

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5500/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
