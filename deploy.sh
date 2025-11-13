#!/bin/bash
set -e

# ============================================================================
# World API - Deployment Script
# ============================================================================
# This script builds, pushes, and deploys the world-api to production
#
# Prerequisites:
# - Docker installed and logged in to Docker Hub
# - SSH access to production VM (172.16.1.244)
# - .env.production file exists on the VM at /home/smesj/world-api/.env.production
# - PostgreSQL database container running (world-postgres)
# ============================================================================

# Configuration
APP_NAME="world-api"
DOCKER_IMAGE="smesjman/world-api"
CONTAINER_NAME="world-api"
VM_HOST="172.16.1.244"
VM_USER="smesj"
VM_ENV_PATH="/home/${VM_USER}/${APP_NAME}/.env.production"
CONTAINER_PORT="3003"
HOST_PORT="3003"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get version tag (defaults to 'latest' or can be passed as argument)
VERSION="${1:-latest}"

log_info "Starting deployment for ${APP_NAME}:${VERSION}"

# ============================================================================
# Step 1: Build Docker Image
# ============================================================================
log_info "Building Docker image..."
docker build \
    --platform linux/amd64 \
    --target prod \
    -t ${DOCKER_IMAGE}:${VERSION} \
    -t ${DOCKER_IMAGE}:latest \
    .

log_success "Docker image built successfully"

# ============================================================================
# Step 2: Push to Docker Hub
# ============================================================================
log_info "Pushing image to Docker Hub..."
docker push ${DOCKER_IMAGE}:${VERSION}

if [ "${VERSION}" != "latest" ]; then
    docker push ${DOCKER_IMAGE}:latest
fi

log_success "Image pushed to Docker Hub"

# ============================================================================
# Step 3: Deploy to Production VM
# ============================================================================
log_info "Deploying to production VM (${VM_HOST})..."

ssh ${VM_USER}@${VM_HOST} bash -s << EOF
set -e

echo "[VM] Checking if .env.production exists..."
if [ ! -f "${VM_ENV_PATH}" ]; then
    echo "[VM] ERROR: .env.production not found at ${VM_ENV_PATH}"
    echo "[VM] Please create it with required environment variables"
    exit 1
fi

echo "[VM] Pulling latest image..."
docker pull ${DOCKER_IMAGE}:${VERSION}

echo "[VM] Stopping existing container (if running)..."
docker stop ${CONTAINER_NAME} 2>/dev/null || true
docker rm ${CONTAINER_NAME} 2>/dev/null || true

echo "[VM] Starting new container..."
docker run -d \\
    --name ${CONTAINER_NAME} \\
    --restart unless-stopped \\
    -p ${HOST_PORT}:${CONTAINER_PORT} \\
    --env-file ${VM_ENV_PATH} \\
    --link world-postgres \\
    ${DOCKER_IMAGE}:${VERSION}

echo "[VM] Waiting for migrations to complete and app to start..."
sleep 8

echo "[VM] Checking container status..."
docker ps | grep ${CONTAINER_NAME}

echo "[VM] Checking migration and startup logs..."
docker logs ${CONTAINER_NAME} --tail 30

echo "[VM] Verifying migrations ran successfully..."
if docker logs ${CONTAINER_NAME} 2>&1 | grep -q "prisma migrate deploy"; then
    echo "[VM] ✓ Prisma migrations detected in logs"
else
    echo "[VM] ⚠ WARNING: Migration logs not found - check manually"
fi

if docker logs ${CONTAINER_NAME} 2>&1 | grep -q "Nest application successfully started"; then
    echo "[VM] ✓ Application started successfully"
else
    echo "[VM] ⚠ WARNING: Application may not have started - check logs"
    exit 1
fi

EOF

log_success "Deployment completed successfully"

# ============================================================================
# Step 4: Verify Deployment
# ============================================================================
log_info "Verifying deployment..."

# Test the endpoint through Cloudflare tunnel
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://world-api.smesj.world/invitations 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "401" ]; then
    log_success "API is responding (HTTP $HTTP_CODE)"
    log_success "🚀 Deployment complete! API is live at https://world-api.smesj.world"
else
    log_warning "API returned HTTP $HTTP_CODE - please check logs"
    log_info "Check logs with: ssh ${VM_USER}@${VM_HOST} 'docker logs ${CONTAINER_NAME}'"
fi

echo ""
log_info "Deployment Summary:"
echo "  - Image: ${DOCKER_IMAGE}:${VERSION}"
echo "  - Container: ${CONTAINER_NAME}"
echo "  - URL: https://world-api.smesj.world"
echo "  - Modules: Identity, Footy, Imperial"
echo "  - Migrations: Automatically run on startup via Dockerfile CMD"
echo ""
log_info "Migration Info:"
echo "  - Migrations are applied automatically when container starts"
echo "  - Check logs with: ssh ${VM_USER}@${VM_HOST} 'docker logs ${CONTAINER_NAME} | grep -A5 prisma'"
echo ""
