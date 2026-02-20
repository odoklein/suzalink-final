"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import type {
  CommsRealtimePayload,
  CommsRealtimeEventType,
} from "@/lib/comms/events";

export type CommsRealtimeHandler = (payload: CommsRealtimePayload) => void;

export interface UseCommsRealtimeOptions {
  enabled?: boolean;
  userId?: string;
  onEvent?: CommsRealtimeHandler;
  onPresenceChange?: (userId: string, isOnline: boolean) => void;
}

export interface UseCommsRealtimeResult {
  isConnected: boolean;
  lastEvent: CommsRealtimePayload | null;
  socket: Socket | null;
  onlineUsers: Set<string>;
  joinThread: (threadId: string) => void;
  leaveThread: (threadId: string) => void;
  startTyping: (threadId: string, userName: string) => void;
  stopTyping: (threadId: string, userName: string) => void;
  markAsSeen: (threadId: string, messageId: string) => void;
  broadcastMessage: (payload: CommsRealtimePayload) => void;
  broadcastEvent: (payload: CommsRealtimePayload) => void;
}

export function useCommsRealtime(
  options: UseCommsRealtimeOptions = {},
): UseCommsRealtimeResult {
  const { enabled = true, userId, onEvent, onPresenceChange } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<CommsRealtimePayload | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [socketClient, setSocketClient] = useState<Socket | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onEvent);
  const onPresenceChangeRef = useRef(onPresenceChange);

  const threadIdRef = useRef<string | null>(null);

  // Keep refs fresh
  useEffect(() => {
    onEventRef.current = onEvent;
    onPresenceChangeRef.current = onPresenceChange;
  }, [onEvent, onPresenceChange]);

  // Connect to VPS Socket.io
  useEffect(() => {
    if (!enabled || !userId || typeof window === "undefined") return;

    let mounted = true;
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://173.212.231.174:4000";

    console.log(
      "Connecting to VPS Socket.io:",
      socketUrl,
      "for UserId:",
      userId,
    );

    const socket = io(socketUrl, {
      query: { userId },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"], // Force websocket-first for instant speed
      forceNew: true,
      withCredentials: true,
    });

    socketRef.current = socket;
    // Set socket in a microtask to avoid cascading render warning in effect body
    Promise.resolve().then(() => {
      if (mounted) setSocketClient(socket);
    });

    socket.on("connect", () => {
      console.log("[SOCKET] Connected to VPS. Socket ID:", socket.id);
      if (mounted) setIsConnected(true);

      // Re-join current thread if we have one
      if (threadIdRef.current) {
        console.log("[SOCKET] Re-joining thread:", threadIdRef.current);
        socket.emit("join_thread", threadIdRef.current);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[SOCKET] Disconnected. Reason:", reason);
      if (mounted) setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[SOCKET] Connection error:", err.message);
      if (mounted) setIsConnected(false);
    });

    socket.on("online_users", (userIds: string[]) => {
      if (!mounted) return;
      console.log("[SOCKET] Presence update:", userIds.length, "users online");
      const nextSet = new Set(userIds);

      setOnlineUsers((prev) => {
        // Compute differences for onPresenceChange callback
        userIds.forEach((id) => {
          if (!prev.has(id)) onPresenceChangeRef.current?.(id, true);
        });
        prev.forEach((id) => {
          if (!nextSet.has(id)) onPresenceChangeRef.current?.(id, false);
        });
        return nextSet;
      });
    });

    // Event Handler Factory
    const handleEvent =
      (eventName: string) => (payload: CommsRealtimePayload) => {
        console.log(
          `[SOCKET] Incoming ${eventName}:`,
          payload.type || eventName,
          payload.threadId,
        );
        if (mounted) {
          setLastEvent(payload);
          onEventRef.current?.(payload);
        }
      };

    // Global events relay
    socket.on("message_created", handleEvent("message_created"));
    socket.on("message_updated", handleEvent("message_updated"));
    socket.on("message_deleted", handleEvent("message_deleted"));
    socket.on("typing_start", handleEvent("typing_start"));
    socket.on("typing_stop", handleEvent("typing_stop"));
    socket.on("message_read", handleEvent("message_read"));
    socket.on("thread_status_updated", handleEvent("thread_status_updated"));
    socket.on("thread_updated", handleEvent("thread_updated"));

    return () => {
      mounted = false;
      console.log("[SOCKET] Disconnecting...");
      socket.disconnect();
      socketRef.current = null;
      setSocketClient(null);
      setIsConnected(false);
    };
  }, [enabled, userId]);

  const joinThread = useCallback((threadId: string) => {
    threadIdRef.current = threadId;
    if (socketRef.current?.connected) {
      socketRef.current.emit("join_thread", threadId);
    }
  }, []);

  const leaveThread = useCallback((threadId: string) => {
    threadIdRef.current = null;
    // Socket.io standard way to leave is via room, but often handled implicitly or via explicit leave_thread
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave_thread", threadId);
    }
  }, []);

  const startTyping = useCallback(
    (threadId: string, userName: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("typing_start", {
          threadId,
          userId,
          userName,
        });
      }
    },
    [userId],
  );

  const stopTyping = useCallback(
    (threadId: string, userName: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("typing_stop", {
          threadId,
          userId,
          userName,
        });
      }
    },
    [userId],
  );

  const markAsSeen = useCallback(
    (threadId: string, messageId: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("message_seen", {
          threadId,
          messageId,
          userId,
        });
      }
    },
    [userId],
  );

  const broadcastMessage = useCallback((payload: CommsRealtimePayload) => {
    if (socketRef.current?.connected) {
      console.log("[SOCKET] Emitting send_message:", payload);
      socketRef.current.emit("send_message", payload);
    } else {
      console.warn("[SOCKET] Cannot broadcast message, socket not connected");
    }
  }, []);

  const broadcastEvent = useCallback((payload: CommsRealtimePayload) => {
    if (socketRef.current?.connected) {
      // Map event types to socket events if needed
      const eventName =
        payload.type === "message_created"
          ? "send_message"
          : payload.type === "message_read"
            ? "message_seen"
            : payload.type;
      socketRef.current.emit(eventName, payload);
    }
  }, []);

  return {
    isConnected,
    lastEvent,
    socket: socketClient,
    onlineUsers,
    joinThread,
    leaveThread,
    startTyping,
    stopTyping,
    markAsSeen,
    broadcastMessage,
    broadcastEvent,
  };
}
