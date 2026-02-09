"use client";

import { useCallback } from "react";
import type { CommsRealtimePayload } from "@/lib/comms/events";

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
  socket: null;
  onlineUsers: Set<string>;
  joinThread: (threadId: string) => void;
  leaveThread: (threadId: string) => void;
  startTyping: (threadId: string, userName: string) => void;
  stopTyping: (threadId: string, userName: string) => void;
}

const EMPTY_SET = new Set<string>();

/**
 * Comms realtime hook (no-op). Socket.IO has been removed.
 * Returns a stable interface so comms pages keep working without live typing/presence.
 */
export function useCommsRealtime(
  _options: UseCommsRealtimeOptions = {}
): UseCommsRealtimeResult {
  const joinThread = useCallback((_threadId: string) => {}, []);
  const leaveThread = useCallback((_threadId: string) => {}, []);
  const startTyping = useCallback((_threadId: string, _userName: string) => {}, []);
  const stopTyping = useCallback((_threadId: string, _userName: string) => {}, []);

  return {
    isConnected: false,
    lastEvent: null,
    socket: null,
    onlineUsers: EMPTY_SET,
    joinThread,
    leaveThread,
    startTyping,
    stopTyping,
  };
}
