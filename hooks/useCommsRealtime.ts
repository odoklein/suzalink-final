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
  onlineUsers: Set<string>;
  joinThread: (threadId: string) => void;
  leaveThread: (threadId: string) => void;
  startTyping: (threadId: string, userName: string) => void;
  stopTyping: (threadId: string, userName: string) => void;
  markAsSeen: (threadId: string, messageId: string) => void;
  broadcastMessage: (payload: CommsRealtimePayload) => void;
  broadcastEvent: (payload: CommsRealtimePayload) => void;
}

// Singleton pattern: share one socket across all hook instances
let sharedSocket: Socket | null = null;
let sharedSocketUserId: string | null = null;
let sharedSocketRefCount = 0;

function getOrCreateSocket(userId: string): Socket {
  const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://173.212.231.174:4000";

  // Reuse existing socket if it's for the same user and still connected
  if (
    sharedSocket &&
    sharedSocketUserId === userId &&
    !sharedSocket.disconnected
  ) {
    sharedSocketRefCount++;
    return sharedSocket;
  }

  // Disconnect old socket if user changed
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }

  console.log(
    "[SOCKET] Creating new connection:",
    socketUrl,
    "userId:",
    userId,
  );

  sharedSocket = io(socketUrl, {
    query: { userId },
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    transports: ["websocket", "polling"],
    forceNew: false,
    withCredentials: true,
    timeout: 10000,
  });
  sharedSocketUserId = userId;
  sharedSocketRefCount = 1;

  return sharedSocket;
}

function releaseSocket() {
  sharedSocketRefCount--;
  if (sharedSocketRefCount <= 0 && sharedSocket) {
    console.log("[SOCKET] All consumers released. Disconnecting.");
    sharedSocket.disconnect();
    sharedSocket = null;
    sharedSocketUserId = null;
    sharedSocketRefCount = 0;
  }
}

export function useCommsRealtime(
  options: UseCommsRealtimeOptions = {},
): UseCommsRealtimeResult {
  const { enabled = true, userId, onEvent, onPresenceChange } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<CommsRealtimePayload | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onEvent);
  const onPresenceChangeRef = useRef(onPresenceChange);
  const threadIdRef = useRef<string | null>(null);

  // Keep refs fresh without causing re-renders
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange;
  }, [onPresenceChange]);

  // ═══════════ CONNECT TO VPS ═══════════
  useEffect(() => {
    if (!enabled || !userId || typeof window === "undefined") return;

    let mounted = true;

    const socket = getOrCreateSocket(userId);
    socketRef.current = socket;

    const handleConnect = () => {
      console.log("[SOCKET] Connected. ID:", socket.id);
      if (mounted) setIsConnected(true);
      // Re-join current thread on reconnect
      if (threadIdRef.current) {
        socket.emit("join_thread", threadIdRef.current);
      }
    };

    const handleDisconnect = (reason: string) => {
      console.log("[SOCKET] Disconnected:", reason);
      if (mounted) setIsConnected(false);
    };

    const handleConnectError = (err: Error) => {
      console.error("[SOCKET] Connection error:", err.message);
      if (mounted) setIsConnected(false);
    };

    const handleOnlineUsers = (userIds: string[]) => {
      if (!mounted) return;
      const nextSet = new Set(userIds);
      setOnlineUsers((prev) => {
        userIds.forEach((id) => {
          if (!prev.has(id)) onPresenceChangeRef.current?.(id, true);
        });
        prev.forEach((id) => {
          if (!nextSet.has(id)) onPresenceChangeRef.current?.(id, false);
        });
        return nextSet;
      });
    };

    // Unified event handler (avoids creating many individual listeners)
    const REALTIME_EVENTS: string[] = [
      "message_created",
      "message_updated",
      "message_deleted",
      "typing_start",
      "typing_stop",
      "message_read",
      "thread_status_updated",
      "thread_updated",
      "message_reaction_added",
      "message_reaction_removed",
    ];

    const handleRealtimeEvent =
      (eventName: string) => (payload: CommsRealtimePayload) => {
        if (!mounted) return;
        // Ensure type field is set
        const normalizedPayload = {
          ...payload,
          type: payload.type || (eventName as CommsRealtimeEventType),
        };
        setLastEvent(normalizedPayload);
        onEventRef.current?.(normalizedPayload);
      };

    // Register listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("online_users", handleOnlineUsers);

    const eventHandlers = REALTIME_EVENTS.map((event) => {
      const handler = handleRealtimeEvent(event);
      socket.on(event, handler);
      return { event, handler };
    });

    // If already connected when the effect runs, fire the handler immediately
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      mounted = false;
      // Remove all listeners registered by this hook instance
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("online_users", handleOnlineUsers);
      eventHandlers.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });

      socketRef.current = null;
      setIsConnected(false);
      releaseSocket();
    };
  }, [enabled, userId]);

  // ═══════════ ACTIONS ═══════════

  const joinThread = useCallback((threadId: string) => {
    threadIdRef.current = threadId;
    if (socketRef.current?.connected) {
      socketRef.current.emit("join_thread", threadId);
    }
  }, []);

  const leaveThread = useCallback((threadId: string) => {
    if (threadIdRef.current === threadId) {
      threadIdRef.current = null;
    }
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
      socketRef.current.emit("send_message", payload);
    } else {
      console.warn("[SOCKET] Cannot broadcast message, socket not connected");
    }
  }, []);

  const broadcastEvent = useCallback((payload: CommsRealtimePayload) => {
    if (socketRef.current?.connected) {
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
