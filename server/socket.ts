import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
// import { createAdapter } from "@socket.io/redis-adapter";
// import { createClient } from "redis";

const prisma = new PrismaClient();
const httpServer = createServer();

// Initialize Redis for scaling (optional but good practice)
// const pubClient = createClient({
//   url: process.env.REDIS_URL || "redis://localhost:6379",
// });
// const subClient = pubClient.duplicate();

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // In development, allow no origin (like mobile apps) or any origin for LAN testing
      if (!origin || process.env.NODE_ENV !== "production") {
        callback(null, true);
        return;
      }

      const allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL,
        "http://localhost:3000",
        "http://localhost:3002",
      ].filter(Boolean) as string[];

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Presence tracking (in-memory for simplicity, use Redis for production scaling)
// Map<userId, Set<socketId>>
const onlineUsers = new Map<string, Set<string>>();

// Helper to broadcast presence
const broadcastPresence = (userId: string, isOnline: boolean) => {
  io.emit("presence_update", { userId, isOnline });
};

// Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
//   io.adapter(createAdapter(pubClient, subClient));

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;

  if (userId) {
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      broadcastPresence(userId, true);
    }
    onlineUsers.get(userId)?.add(socket.id);

    // Send initial online list to the connecting user
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit("initial_presence", onlineUserIds);

    console.log(`User connected: ${userId}`);
  }

  // Join thread room
  socket.on("join_thread", (threadId: string) => {
    socket.join(`thread:${threadId}`);
    console.log(`User ${userId} joined thread ${threadId}`);
  });

  // Leave thread room
  socket.on("leave_thread", (threadId: string) => {
    socket.leave(`thread:${threadId}`);
  });

  // Typing indicators
  socket.on(
    "typing_start",
    ({ threadId, userName }: { threadId: string; userName: string }) => {
      socket.to(`thread:${threadId}`).emit("typing_start", {
        threadId,
        userId,
        userName,
      });
    },
  );

  socket.on(
    "typing_stop",
    ({ threadId, userName }: { threadId: string; userName: string }) => {
      socket.to(`thread:${threadId}`).emit("typing_stop", {
        threadId,
        userId,
        userName,
      });
    },
  );

  // Handle new message (if not using API route)
  // Note: Usually we use the API route for persistence, then emit event.
  // However, if the client emits 'send_message', we can handle it here:
  socket.on(
    "send_message",
    async (payload: {
      threadId: string;
      content: string;
      attachments?: {
        filename: string;
        mimeType: string;
        size: number;
        storageKey: string;
        url?: string;
      }[];
      replyToId?: string;
    }) => {
      try {
        // Save to DB
        const { threadId, content, replyToId } = payload;

        // 1. Validate thread access (omitted for brevity)

        // 2. Create message
        const message = await prisma.commsMessage.create({
          data: {
            threadId,
            authorId: userId,
            content,
            parentMessageId: replyToId,
            type: "TEXT", // or infer from attachments
          },
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        });

        // 3. Broadcast to room
        io.to(`thread:${threadId}`).emit("message_created", {
          threadId,
          messageId: message.id,
          content: message.content,
          userId: message.author.id,
          userName: message.author.name,
          createdAt: message.createdAt.toISOString(),
          // ... mapping to frontend payload format
        });

        // 4. Update thread metadata
        await prisma.commsThread.update({
          where: { id: threadId },
          data: {
            lastMessageAt: new Date(),
            lastMessageById: message.id,
            messageCount: { increment: 1 },
          },
        });
      } catch (error) {
        console.error("Error sending message via socket:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    },
  );

  // Message Seen
  socket.on(
    "message_seen",
    async ({
      messageId,
      threadId,
    }: {
      messageId: string;
      threadId: string;
    }) => {
      try {
        // Update DB
        // Check if already seen to avoid duplicates
        // basic code:
        await prisma.commsMessageReadReceipt.upsert({
          where: {
            messageId_userId: { messageId, userId },
          },
          create: { messageId, userId },
          update: { readAt: new Date() }, // Update timestamp if re-read?
        });

        // Broadcast to thread that this user read this message
        io.to(`thread:${threadId}`).emit("message_read", {
          messageId,
          userId,
          readAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error(e);
      }
    },
  );

  // Disconnect
  socket.on("disconnect", () => {
    if (userId && onlineUsers.has(userId)) {
      const userSockets = onlineUsers.get(userId);
      userSockets?.delete(socket.id);

      if (userSockets?.size === 0) {
        onlineUsers.delete(userId);
        broadcastPresence(userId, false);
      }
    }
    console.log(`User disconnected: ${userId}`);
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
// });
