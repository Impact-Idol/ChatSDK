# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

think like a rockstar mobile chat product manager. Make an exceotional mobile first product.  

## Repository Overview

This repository contains three independent open-source chat/messaging platforms:

| Project | Path | Description | Tech Stack |
|---------|------|-------------|------------|
| **Huly** | `assets/huly/` | Enterprise business application platform (Chat, CRM, HRM, ATS) | Rush.js monorepo, TypeScript, Svelte, CockroachDB, 30+ microservices |
| **Raven** | `assets/ravenchat/` | Team messaging with ERP integration (ERPNext, FrappeHR) | Frappe Framework (Python), React, React Native/Expo |
| **Zulip** | `assets/zulip/` | Topic-based threaded team chat | Django (Python), JavaScript, PostgreSQL |

## Build Commands by Project

### Huly (`assets/huly/`)

```bash
# Install Rush globally
npm install -g @microsoft/rush

# Install dependencies and build
rush install
rush build

# Fast start (setup script)
sh ./scripts/fast-start.sh

# Development mode
cd dev/prod && rushx dev-server  # http://localhost:8080

# Docker deployment
rush docker:build
rush docker:up  # Access at http://huly.local:8087

# Testing
rush test                  # All tests
rushx test                 # Single package tests (run in package dir)
rush validate              # TypeScript validation
rush svelte-check          # Svelte validation

# Update after branch switch
rush update && rush build
```

**Note:** Requires GitHub npm authentication for `@hcengineering` packages - see README for token setup.

### Raven (`assets/ravenchat/`)

```bash
yarn install               # Installs all workspaces
yarn build                 # Build web frontend
yarn dev                   # Dev server at http://localhost:8080

# Mobile app
cd apps/mobile
yarn ios                   # iOS simulator
yarn android               # Android emulator
yarn nuke                  # Clean all build artifacts

# Docker setup
cd docker && docker compose up -d  # Access at http://raven.localhost:8000/raven
```

### Zulip (`assets/zulip/`)

```bash
# Development environment (Vagrant/Docker)
vagrant up                 # Start VM/container

# Inside dev environment
./tools/provision          # Update environment after branch switch
./tools/run-dev            # Start dev server at http://localhost:9991
./tools/rebuild-dev-database  # Reset database

# Testing
./tools/test-backend       # Python tests
./tools/test-js-with-node  # JavaScript tests
./tools/lint               # Run linters
```

## Architecture Highlights

### Huly Architecture
- 30+ microservices with event-driven architecture via Redpanda (Kafka-compatible)
- **Primary DB:** CockroachDB for all business data
- **Key services:** Account (auth), Transactor (real-time WebSocket), Collaborator (Y.js CRDT), Fulltext (Elasticsearch)
- **Storage:** MinIO (S3-compatible) for blobs, Redis for pub/sub
- See `assets/huly/ARCHITECTURE_OVERVIEW.md` for detailed service documentation

### Raven Architecture
- Monorepo with yarn workspaces: `frontend/`, `apps/mobile/`, `packages/lib/`, `packages/types/`
- **Backend:** Frappe Framework (Python) in `raven/` directory
- **Frontend:** React with frappe-react-sdk, Jotai state management, RadixUI, TipTap editor
- **Mobile:** React Native/Expo with NativeWind (Tailwind CSS)
- See `assets/ravenchat/CLAUDE.md` for detailed guidance

### Zulip Architecture
- Django backend with Tornado for real-time
- PostgreSQL database with full-text search
- Webpack-bundled JavaScript frontend
- Extensive documentation at `docs/` (185K+ words)

## Code Style

### Python (Huly/Raven/Zulip)
- Formatter: Black (line-length: 99 for Raven)
- Import sorting: isort
- Linting: flake8/Ruff

### TypeScript/JavaScript
- Huly: Rush.js phases handle validation
- Raven: Pre-commit hooks
- Zulip: ESLint + Prettier, stylelint for CSS

## Development Hosts

Add to `/etc/hosts` as needed:
```
127.0.0.1 huly.local      # Huly
127.0.0.1 raven.localhost # Raven
```
