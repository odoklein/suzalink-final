# ── Suzalink Socket.IO Server ──
# Lightweight production image

FROM node:20-alpine AS base

# Add tini for proper signal handling in containers
RUN apk add --no-cache tini

WORKDIR /app

# Install production dependencies (maximise layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code
COPY server.js ./

# Non-root user for security
RUN addgroup -S appgrp && adduser -S appusr -G appgrp
USER appusr

# Environment
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Health check – auto-restart unhealthy containers
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:4000/health').then(r=>{if(!r.ok)throw 1;process.exit(0)}).catch(()=>process.exit(1))"

# Use tini as entrypoint for proper PID 1 behavior
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
