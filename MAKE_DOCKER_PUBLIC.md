# Making Docker Image Public

This guide helps you publish and configure the ChatSDK Docker image for public access.

If the Docker image `ghcr.io/piper5ul/chatsdk/api` exists but clients can't pull it, follow these steps to make it public:

## Steps to Make Package Public

1. **Navigate to the package**:
   - Go to: https://github.com/piper5ul?tab=packages
   - Click on the `chatsdk/api` package

2. **Change visibility**:
   - Click **"Package settings"** (on the right sidebar)
   - Scroll down to **"Danger Zone"**
   - Click **"Change visibility"**
   - Select **"Public"**
   - Confirm by typing the package name

3. **Verify public access**:
   ```bash
   docker pull ghcr.io/piper5ul/chatsdk/api:latest
   ```
   This should now work without authentication!

## If Package Doesn't Exist Yet

If you don't see the package at all:

1. Check the workflow run: https://github.com/piper5ul/ChatSDK/actions/workflows/docker-publish.yml
2. Look for any errors in the build logs
3. The most recent commit that should have triggered it: `c87f428 fix: Complete Docker build fixes - tested and verified`

## Alternative: Manual Workflow Trigger

If the workflow hasn't run yet:

1. Go to: https://github.com/piper5ul/ChatSDK/actions/workflows/docker-publish.yml
2. Click **"Run workflow"** button
3. Select branch: `main`
4. Click **"Run workflow"**
5. Wait 5-10 minutes for it to complete
6. Check packages again

## Quick Verification Commands

Once public, your client can verify:

```bash
# Pull the image
docker pull ghcr.io/piper5ul/chatsdk/api:latest

# Verify it works
docker run --rm ghcr.io/piper5ul/chatsdk/api:latest node --version

# Check image details
docker inspect ghcr.io/piper5ul/chatsdk/api:latest | grep -A5 "Architecture"
```

## For Your Client

Once the image is public, send them:

**Image Details:**
- **Registry**: GitHub Container Registry (GHCR)
- **Image name**: `ghcr.io/piper5ul/chatsdk/api`
- **Available tags**:
  - `latest` - Always points to the most recent build from main branch
  - `main` - Latest development build
  - `v2.0.0` - Specific version (create by tagging: `git tag v2.0.0 && git push origin v2.0.0`)

**Pull command:**
```bash
docker pull ghcr.io/piper5ul/chatsdk/api:latest
```

**No authentication required** - Image is publicly accessible

**Multi-platform support:**
- `linux/amd64` (Intel/AMD processors)
- `linux/arm64` (Apple Silicon, AWS Graviton)

Docker automatically pulls the correct platform for your architecture.
