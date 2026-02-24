import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const onlineUsers = new Map(); // userId -> socketId

// --- Health Check ---
app.get("/health", (req, res) => {
  res.json({ status: "up", clients: io.engine.clientsCount });
});

// --- HTTP API for Server-to-Server broadcasting ---
// This allows the Next.js API to trigger events across all connected clients
app.post("/broadcast", (req, res) => {
  const { event, payload } = req.body;

  if (!event || !payload) {
    return res.status(400).json({ error: "Missing event or payload" });
  }

  console.log(`[API-BCAST] ${event} (Thread: ${payload.threadId || "Global"})`);
  io.emit(event, payload);
  res.json({ success: true });
});

// --- Socket logic ---
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    onlineUsers.set(userId, socket.id);
    console.log(`[CONN] User ${userId} connected (${socket.id})`);
    io.emit("online_users", Array.from(onlineUsers.keys()));
  }

  socket.on("join_thread", (threadId) => {
    socket.join(`thread:${threadId}`);
    console.log(`[ROOM] Socket ${socket.id} joined thread:${threadId}`);
  });

  socket.on("leave_thread", (threadId) => {
    socket.leave(`thread:${threadId}`);
    console.log(`[ROOM] Socket ${socket.id} left thread:${threadId}`);
  });

  // Relay functions for direct client-to-client events (typing, seen)
  const relayToThread = (eventName, payload) => {
    if (payload && payload.threadId) {
      console.log(`[RELAY] ${eventName} (Thread: ${payload.threadId})`);
      socket.to(`thread:${payload.threadId}`).emit(eventName, payload);
    }
  };

  const broadcastToAll = (eventName, payload) => {
    console.log(`[BCAST] ${eventName} to all users`);
    io.emit(eventName, payload);
  };

  // --- Real-time Events ---

  socket.on("send_message", (payload) => {
    console.log(`[MSG] New message in thread: ${payload.threadId}`);
    broadcastToAll("message_created", payload);
  });

  socket.on("message_updated", (payload) =>
    broadcastToAll("message_updated", payload),
  );

  socket.on("message_deleted", (payload) =>
    broadcastToAll("message_deleted", payload),
  );

  socket.on("typing_start", (payload) =>
    relayToThread("typing_start", payload),
  );

  socket.on("typing_stop", (payload) => relayToThread("typing_stop", payload));

  socket.on("message_seen", (payload) =>
    relayToThread("message_read", payload),
  );

  socket.on("thread_status_updated", (payload) =>
    broadcastToAll("thread_status_updated", payload),
  );

  socket.on("thread_updated", (payload) =>
    broadcastToAll("thread_updated", payload),
  );

  // --- Disconnection ---
  socket.on("disconnect", () => {
    if (userId) {
      onlineUsers.delete(userId);
      console.log(`[DISCO] User ${userId} disconnected`);
      io.emit("online_users", Array.from(onlineUsers.keys()));
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("=================================================");
  console.log(`🚀 SUZALINK EXPRESS REAL-TIME SERVICE`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔧 Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);
  console.log("=================================================");
});

// --- Graceful Shutdown ---
const shutdown = (signal) => {
  console.log(`\n[${signal}] Received. Shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forced shutdown after 5s.");
    process.exit(1);
  }, 5000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
