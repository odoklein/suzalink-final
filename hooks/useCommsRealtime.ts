"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { CommsRealtimePayload } from "@/lib/comms/events";

// Default to local server if env not set
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export type CommsRealtimeHandler = (payload: CommsRealtimePayload) => void;

interface PresenceUpdate {
  userId: string;
  isOnline: boolean;
}

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
}

export function useCommsRealtime(
  options: UseCommsRealtimeOptions = {},
): UseCommsRealtimeResult {
  const { enabled = true, userId, onEvent, onPresenceChange } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<CommsRealtimePayload | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const onEventRef = useRef(onEvent);
  const onPresenceChangeRef = useRef(onPresenceChange);

  // Keep refs fresh
  useEffect(() => {
    onEventRef.current = onEvent;
    onPresenceChangeRef.current = onPresenceChange;
  }, [onEvent, onPresenceChange]);

  // Connect
  useEffect(() => {
    if (!enabled || !userId || typeof window === "undefined") return;

    console.log("Connecting to socket:", SOCKET_URL, "UserId:", userId);

    const newSocket = io(SOCKET_URL, {
      query: { userId },
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    // Set socket in a microtask to avoid cascading render warning in effect body
    Promise.resolve().then(() => {
      setSocket(newSocket);
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err: Error) => {
      console.error("Socket connection error:", err);
    });

    // --- Event Handlers ---

    newSocket.on("initial_presence", (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on(
      "presence_update",
      ({ userId: uid, isOnline }: PresenceUpdate) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (isOnline) next.add(uid);
          else next.delete(uid);
          return next;
        });
        onPresenceChangeRef.current?.(uid, isOnline);
      },
    );

    newSocket.on(
      "typing_start",
      (data: { threadId: string; userId: string; userName: string }) => {
        const payload: CommsRealtimePayload = {
          type: "typing_start",
          threadId: data.threadId,
          userId: data.userId,
          userName: data.userName,
          timestamp: new Date().toISOString(),
        };
        setLastEvent(payload);
        onEventRef.current?.(payload);
      },
    );

    newSocket.on(
      "typing_stop",
      (data: { threadId: string; userId: string; userName: string }) => {
        const payload: CommsRealtimePayload = {
          type: "typing_stop",
          threadId: data.threadId,
          userId: data.userId,
          userName: data.userName,
          timestamp: new Date().toISOString(),
        };
        setLastEvent(payload);
        onEventRef.current?.(payload);
      },
    );

    newSocket.on(
      "message_created",
      (data: {
        threadId: string;
        messageId: string;
        content: string;
        userId: string;
        userName: string;
        createdAt: string;
      }) => {
        const payload: CommsRealtimePayload = {
          type: "message_created",
          threadId: data.threadId,
          messageId: data.messageId,
          content: data.content,
          userId: data.userId,
          userName: data.userName,
          createdAt: data.createdAt,
          timestamp: new Date().toISOString(),
        };
        setLastEvent(payload);
        onEventRef.current?.(payload);
      },
    );

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [enabled, userId]);

  // --- Actions ---

  const joinThread = useCallback((threadId: string) => {
    socketRef.current?.emit("join_thread", threadId);
  }, []);

  const leaveThread = useCallback((threadId: string) => {
    socketRef.current?.emit("leave_thread", threadId);
  }, []);

  const startTyping = useCallback((threadId: string, userName: string) => {
    socketRef.current?.emit("typing_start", { threadId, userName });
  }, []);

  const stopTyping = useCallback((threadId: string, userName: string) => {
    socketRef.current?.emit("typing_stop", { threadId, userName });
  }, []);

  return {
    isConnected,
    lastEvent,
    socket,
    onlineUsers,
    joinThread,
    leaveThread,
    startTyping,
    stopTyping,
  };
}
