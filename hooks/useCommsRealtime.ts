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
  const [socket, setSocket] = useState<Socket | null>(null); // Changed from useRef to useState

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
      // Use a local variable for the new socket
      query: { userId },
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket); // Set the state

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err: any) => {
      // Explicitly cast to any
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

    newSocket.on("typing_start", (data: any) => {
      // Explicitly cast to any
      const payload: CommsRealtimePayload = {
        type: "typing_start",
        threadId: data.threadId,
        userId: data.userId,
        userName: data.userName,
        timestamp: new Date().toISOString(),
      };
      // Avoid duplicate events if possible, or let consumer dbounce
      setLastEvent(payload);
      onEventRef.current?.(payload);
    });

    newSocket.on("typing_stop", (data: any) => {
      // Explicitly cast to any
      const payload: CommsRealtimePayload = {
        type: "typing_stop",
        threadId: data.threadId,
        userId: data.userId,
        userName: data.userName,
        timestamp: new Date().toISOString(),
      };
      setLastEvent(payload);
      onEventRef.current?.(payload);
    });

    newSocket.on("message_created", (data: any) => {
      // Explicitly cast to any
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
    });

    return () => {
      newSocket.disconnect(); // Disconnect the socket created in this effect run
      setSocket(null); // Clear the state
    };
  }, [enabled, userId]);

  // --- Actions ---

  const joinThread = useCallback(
    (threadId: string) => {
      socket?.emit("join_thread", threadId);
    },
    [socket],
  ); // Added socket to dependencies

  const leaveThread = useCallback(
    (threadId: string) => {
      socket?.emit("leave_thread", threadId);
    },
    [socket],
  ); // Added socket to dependencies

  const startTyping = useCallback(
    (threadId: string, userName: string) => {
      socket?.emit("typing_start", { threadId, userName });
    },
    [socket],
  ); // Added socket to dependencies

  const stopTyping = useCallback(
    (threadId: string, userName: string) => {
      socket?.emit("typing_stop", { threadId, userName });
    },
    [socket],
  ); // Added socket to dependencies

  return {
    isConnected,
    lastEvent,
    socket, // Changed from socketRef.current to socket state
    onlineUsers,
    joinThread,
    leaveThread,
    startTyping,
    stopTyping,
  };
}
