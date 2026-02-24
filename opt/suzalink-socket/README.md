# 🚀 Suzalink Socket.IO Server

Real-time WebSocket service for Suzalink communications (typing indicators, message delivery, online status, read receipts).

## Architecture

```
┌──────────────┐    WS/4000     ┌──────────────────┐
│   Browser    │ ────────────→  │   Docker         │
│  (Next.js)   │ ←────────────  │   suzalink-socket│
└──────────────┘                │   (Node.js)      │
                                │   Port 4000      │
                                └──────────────────┘
                                VPS: 173.212.231.174
```

> **Note**: Mailcow already owns ports 80/443 on the VPS. The socket server runs on port 4000 directly.

## 📦 Stack

| Component       | Technology                              | Port |
| --------------- | --------------------------------------- | ---- |
| Socket Server   | Node.js 20 Alpine + Express + Socket.IO | 4000 |
| Container       | Docker + Compose                        | -    |
| Process Manager | tini (PID 1)                            | -    |

## 🖥️ Local Development

```bash
# From project root
npm run dev:socket

# Or from this directory
cd opt/suzalink-socket
npm install
npm start
```

## 🌐 VPS Deployment

### Prerequisites

1. **VPS**: Docker and Docker Compose installed on `173.212.231.174`
2. **SSH**: Access to `root@173.212.231.174`

### Deploy / Update

```powershell
# From opt/suzalink-socket directory
cd opt/suzalink-socket

# Upload files
scp Dockerfile .dockerignore docker-compose.yml package.json package-lock.json server.js root@173.212.231.174:/opt/suzalink-socket/

# SSH in and rebuild
ssh root@173.212.231.174
cd /opt/suzalink-socket
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose ps
curl http://localhost:4000/health
```

### Quick Commands (on VPS)

```bash
# View status
docker compose -f /opt/suzalink-socket/docker-compose.yml ps

# View logs
docker logs suzalink-socket --tail 100 -f

# Restart
docker compose -f /opt/suzalink-socket/docker-compose.yml restart

# Rebuild after code changes
cd /opt/suzalink-socket
docker compose build --no-cache && docker compose up -d
```

## 🔧 Environment Variables

| Variable   | Default      | Description        |
| ---------- | ------------ | ------------------ |
| `PORT`     | `4000`       | Socket server port |
| `NODE_ENV` | `production` | Environment mode   |

### Frontend (Next.js `.env`)

For **production** (Vercel):

```env
NEXT_PUBLIC_SOCKET_URL=http://173.212.231.174:4000
```

For **local development**:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## 🏥 Health Check

```bash
curl http://173.212.231.174:4000/health
# → {"status":"up","clients":3}
```

The Docker container has a built-in healthcheck that auto-restarts if the server becomes unresponsive.

## 📁 File Structure

```
opt/suzalink-socket/
├── Dockerfile           # Alpine + tini + non-root user
├── .dockerignore         # Exclude node_modules, etc.
├── docker-compose.yml    # Container orchestration
├── package.json          # Dependencies
├── package-lock.json     # Lock file
├── server.js             # Socket.IO server
└── README.md             # This file
```

## ⚠️ Notes

- **Mailcow** runs on the same VPS at `/opt/mailcow-dockerized/` and owns ports 80/443.
- The socket server uses port 4000 directly (no reverse proxy needed for WebSockets).
- Docker `restart: always` ensures the container auto-starts after VPS reboots.
- The healthcheck runs every 30s and will mark the container as unhealthy after 3 failures.
