#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# Suzalink Socket.IO – VPS Deployment Script
# ═══════════════════════════════════════════════════════
#
# Usage:
#   ./deploy.sh              → Full deploy (build + start)
#   ./deploy.sh --ssl-init   → First-time SSL setup
#   ./deploy.sh --update     → Quick update (rebuild + restart)
#   ./deploy.sh --logs       → Tail container logs
#   ./deploy.sh --status     → Show container status
#
# VPS: 173.212.231.174
# Domain: socket.suzalink.cloud
# ═══════════════════════════════════════════════════════

set -euo pipefail

# ── Config ──
VPS_USER="root"
VPS_HOST="173.212.231.174"
VPS_DIR="/opt/suzalink-socket"
DOMAIN="socket.suzalink.cloud"
EMAIL="contact@suzalink.cloud"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[→]${NC} $1"; }

SSH_CMD="ssh ${VPS_USER}@${VPS_HOST}"
SCP_CMD="scp -r"

# ── Functions ──

upload_files() {
    info "Uploading socket server files to VPS…"

    # Create remote directory
    $SSH_CMD "mkdir -p ${VPS_DIR}/nginx/conf.d ${VPS_DIR}/nginx/certbot/conf ${VPS_DIR}/nginx/certbot/www"

    # Upload only necessary files (no node_modules)
    $SCP_CMD \
        Dockerfile \
        .dockerignore \
        docker-compose.yml \
        package.json \
        package-lock.json \
        server.js \
        "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"

    # Upload nginx config
    $SCP_CMD \
        nginx/conf.d/socket.conf \
        "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/nginx/conf.d/"

    log "Files uploaded to ${VPS_HOST}:${VPS_DIR}"
}

build_and_start() {
    info "Building and starting containers on VPS…"

    $SSH_CMD << 'REMOTE_SCRIPT'
        cd /opt/suzalink-socket

        # Stop existing containers
        docker compose down --remove-orphans 2>/dev/null || true

        # Build fresh image
        docker compose build --no-cache suzalink-socket

        # Start containers
        docker compose up -d

        echo ""
        echo "Container status:"
        docker compose ps
        echo ""
        echo "Health check:"
        sleep 3
        curl -s http://localhost:4000/health || echo "Health check pending..."
REMOTE_SCRIPT

    log "Containers are running!"
}

ssl_init() {
    info "Setting up SSL certificate for ${DOMAIN}…"

    # First, deploy without SSL (HTTP only) to pass ACME challenge
    warn "Step 1: Starting with HTTP-only config for ACME challenge…"

    $SSH_CMD << REMOTE_SSL
        cd /opt/suzalink-socket

        # Create a temporary HTTP-only nginx config
        cat > nginx/conf.d/socket.conf << 'NGINX_TEMP'
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://suzalink-socket:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGINX_TEMP

        # Start services
        docker compose up -d suzalink-socket nginx
        sleep 5

        # Request certificate
        docker compose run --rm certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email ${EMAIL} \
            --agree-tos \
            --no-eff-email \
            -d ${DOMAIN}
REMOTE_SSL

    log "SSL certificate obtained!"

    # Now upload the full SSL nginx config
    info "Step 2: Applying full HTTPS nginx config…"
    $SCP_CMD nginx/conf.d/socket.conf "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/nginx/conf.d/"

    $SSH_CMD << 'REMOTE_RESTART'
        cd /opt/suzalink-socket
        docker compose restart nginx
        echo "Nginx restarted with SSL"
        docker compose ps
REMOTE_RESTART

    log "SSL setup complete! Socket server is live at https://${DOMAIN}"
}

show_logs() {
    info "Tailing logs (Ctrl+C to stop)…"
    $SSH_CMD "cd ${VPS_DIR} && docker compose logs -f --tail=100"
}

show_status() {
    info "Checking container status…"
    $SSH_CMD << 'REMOTE_STATUS'
        cd /opt/suzalink-socket
        echo "═══════════════════════════════════════"
        echo "Container Status:"
        echo "═══════════════════════════════════════"
        docker compose ps
        echo ""
        echo "═══════════════════════════════════════"
        echo "Health Check:"
        echo "═══════════════════════════════════════"
        curl -s http://localhost:4000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:4000/health
        echo ""
        echo "═══════════════════════════════════════"
        echo "Resource Usage:"
        echo "═══════════════════════════════════════"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep suzalink
REMOTE_STATUS
}

quick_update() {
    info "Quick update: uploading files and restarting…"
    upload_files

    $SSH_CMD << 'REMOTE_UPDATE'
        cd /opt/suzalink-socket
        docker compose build --no-cache suzalink-socket
        docker compose up -d suzalink-socket
        docker compose restart nginx 2>/dev/null || true
        sleep 3
        echo "Updated! Status:"
        docker compose ps
        curl -s http://localhost:4000/health
REMOTE_UPDATE

    log "Quick update complete!"
}

# ── Main ──

case "${1:-}" in
    --ssl-init)
        upload_files
        build_and_start
        ssl_init
        ;;
    --update)
        upload_files
        quick_update
        ;;
    --logs)
        show_logs
        ;;
    --status)
        show_status
        ;;
    *)
        echo ""
        echo -e "${CYAN}═══════════════════════════════════════${NC}"
        echo -e "${CYAN}  Suzalink Socket.IO VPS Deployment${NC}"
        echo -e "${CYAN}═══════════════════════════════════════${NC}"
        echo ""
        upload_files
        build_and_start
        echo ""
        log "Deployment complete!"
        echo ""
        echo -e "  ${CYAN}HTTP:${NC}   http://${VPS_HOST}:4000/health"
        echo -e "  ${CYAN}WSS:${NC}    wss://${DOMAIN}/socket.io/"
        echo ""
        echo -e "  ${YELLOW}First time? Run: ./deploy.sh --ssl-init${NC}"
        echo ""
        ;;
esac
