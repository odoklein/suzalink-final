# 🔌 Suzalink Socket.IO Server

Standalone real-time WebSocket service for Suzalink communications.

Handles: typing indicators, message delivery, online presence, read receipts, and server-to-server broadcasting.

## 📦 Stack

| Component | Technology             |
| --------- | ---------------------- |
| Runtime   | Node.js 20             |
| Framework | Express + Socket.IO 4  |
| Container | Docker (Alpine + tini) |

## 🖥️ Local Development

```bash
# From project root
npm run dev:socket

# Or from this directory
npm install
npm start        # production
npm run dev      # with nodemon hot-reload
```

The server starts on **port 3001** locally (or `PORT` env var).

## 🐳 Docker (Production)

The server runs as a Docker container on the VPS (`173.212.231.174:4000`).

```bash
# Build & run locally with Docker
docker compose build
docker compose up -d

# Check health
curl http://localhost:4000/health
# → {"status":"up","clients":0}
```

### Deploy to VPS

```bash
# Upload files
scp Dockerfile .dockerignore docker-compose.yml package.json package-lock.json server.js root@173.212.231.174:/opt/suzalink-socket/

# SSH in and rebuild
ssh root@173.212.231.174
cd /opt/suzalink-socket
docker compose build --no-cache
docker compose up -d
```

## 📡 API

### Health Check

```
GET /health → {"status":"up","clients":3}
```

### Broadcast (Server-to-Server)

```
POST /broadcast
Body: { "event": "message_created", "payload": { "threadId": "...", ... } }
```

### Socket Events

| Event                          | Direction       | Description       |
| ------------------------------ | --------------- | ----------------- |
| `send_message`                 | Client → Server | New message       |
| `message_created`              | Server → All    | Message broadcast |
| `typing_start` / `typing_stop` | Client ↔ Thread | Typing indicators |
| `message_seen`                 | Client → Thread | Read receipt      |
| `online_users`                 | Server → All    | Presence list     |
| `join_thread` / `leave_thread` | Client → Server | Room management   |

## 🔧 Environment

| Variable   | Default       | Description |
| ---------- | ------------- | ----------- |
| `PORT`     | `4000`        | Server port |
| `NODE_ENV` | `development` | Environment |

### Frontend `.env`

```env
# Local dev
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Production (Vercel)
NEXT_PUBLIC_SOCKET_URL=http://173.212.231.174:4000
```
