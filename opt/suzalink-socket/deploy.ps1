# ═══════════════════════════════════════════════════════
# Suzalink Socket.IO – VPS Deployment (PowerShell)
# ═══════════════════════════════════════════════════════
#
# Usage:
#   .\deploy.ps1              → Full deploy
#   .\deploy.ps1 -Action init → First-time SSL setup
#   .\deploy.ps1 -Action update → Quick update
#   .\deploy.ps1 -Action logs → Tail logs
#   .\deploy.ps1 -Action status → Show status
#
# ═══════════════════════════════════════════════════════

param(
    [ValidateSet("deploy", "init", "update", "logs", "status")]
    [string]$Action = "deploy"
)

# ── Config ──
$VPS_USER = "root"
$VPS_HOST = "173.212.231.174"
$VPS_DIR  = "/opt/suzalink-socket"
$DOMAIN   = "socket.suzalink.cloud"
$EMAIL    = "contact@suzalink.cloud"

$SSH = "$VPS_USER@$VPS_HOST"

function Write-Step($msg) { Write-Host "[→] $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "[✓] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }

# ── Upload files to VPS ──
function Upload-Files {
    Write-Step "Creating remote directories..."
    ssh $SSH "mkdir -p ${VPS_DIR}/nginx/conf.d ${VPS_DIR}/nginx/certbot/conf ${VPS_DIR}/nginx/certbot/www"

    Write-Step "Uploading files to VPS..."
    $files = @("Dockerfile", ".dockerignore", "docker-compose.yml", "package.json", "package-lock.json", "server.js")
    foreach ($f in $files) {
        scp $f "${SSH}:${VPS_DIR}/"
    }

    # Upload nginx config
    scp "nginx/conf.d/socket.conf" "${SSH}:${VPS_DIR}/nginx/conf.d/"

    Write-OK "Files uploaded to ${VPS_HOST}:${VPS_DIR}"
}

# ── Build & Start on VPS ──
function Start-Containers {
    Write-Step "Building and starting containers on VPS..."
    ssh $SSH @"
cd $VPS_DIR
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache suzalink-socket
docker compose up -d
echo ''
echo 'Container status:'
docker compose ps
echo ''
sleep 3
echo 'Health check:'
curl -s http://localhost:4000/health || echo 'Pending...'
"@
    Write-OK "Containers are running!"
}

# ── SSL Init ──
function Initialize-SSL {
    Write-Warn "Step 1: Starting HTTP-only config for ACME challenge..."
    ssh $SSH @"
cd $VPS_DIR
cat > nginx/conf.d/socket.conf << 'EOF'
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        proxy_pass http://suzalink-socket:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host `$host;
    }
}
EOF
docker compose up -d suzalink-socket nginx
sleep 5
docker compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN
"@

    Write-Step "Step 2: Applying full HTTPS nginx config..."
    scp "nginx/conf.d/socket.conf" "${SSH}:${VPS_DIR}/nginx/conf.d/"
    ssh $SSH "cd $VPS_DIR && docker compose restart nginx && docker compose ps"
    Write-OK "SSL setup complete! Live at https://$DOMAIN"
}

# ── Quick update ──
function Update-Server {
    Upload-Files
    Write-Step "Rebuilding and restarting..."
    ssh $SSH @"
cd $VPS_DIR
docker compose build --no-cache suzalink-socket
docker compose up -d suzalink-socket
docker compose restart nginx 2>/dev/null || true
sleep 3
docker compose ps
curl -s http://localhost:4000/health
"@
    Write-OK "Updated!"
}

# ── Main ──
Push-Location $PSScriptRoot

try {
    switch ($Action) {
        "deploy" {
            Write-Host ""
            Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
            Write-Host "  Suzalink Socket.IO VPS Deployment"     -ForegroundColor Cyan
            Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
            Write-Host ""
            Upload-Files
            Start-Containers
            Write-Host ""
            Write-OK "Deployment complete!"
            Write-Host ""
            Write-Host "  HTTP:  http://${VPS_HOST}:4000/health" -ForegroundColor Cyan
            Write-Host "  WSS:   wss://${DOMAIN}/socket.io/"     -ForegroundColor Cyan
            Write-Host ""
            Write-Warn "First time? Run: .\deploy.ps1 -Action init"
            Write-Host ""
        }
        "init" {
            Upload-Files
            Start-Containers
            Initialize-SSL
        }
        "update" {
            Update-Server
        }
        "logs" {
            ssh $SSH "cd $VPS_DIR && docker compose logs -f --tail=100"
        }
        "status" {
            ssh $SSH @"
cd $VPS_DIR
echo '══════════ Containers ══════════'
docker compose ps
echo ''
echo '══════════ Health ══════════'
curl -s http://localhost:4000/health
echo ''
echo '══════════ Resources ══════════'
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' | grep suzalink
"@
        }
    }
} finally {
    Pop-Location
}
