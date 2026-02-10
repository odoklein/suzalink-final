"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as Ably from "ably";
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
  socket: Ably.Realtime | null; // Kept for interface compatibility, refers to Ably client
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
  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null);

  const ablyRef = useRef<Ably.Realtime | null>(null);
  const channelsRef = useRef<Map<string, Ably.RealtimeChannel>>(new Map());
  const onEventRef = useRef(onEvent);
  const onPresenceChangeRef = useRef(onPresenceChange);

  // Keep refs fresh
  useEffect(() => {
    onEventRef.current = onEvent;
    onPresenceChangeRef.current = onPresenceChange;
  }, [onEvent, onPresenceChange]);

  // Connect to Ably
  useEffect(() => {
    if (!enabled || !userId || typeof window === "undefined") return;

    let mounted = true;
    console.log("Connecting to Ably for UserId:", userId);

    const client = new Ably.Realtime({
      authUrl: "/api/comms/ably-auth",
      clientId: userId,
    });

    ablyRef.current = client;
    // Set socket in a microtask to avoid cascading render warning in effect body
    Promise.resolve().then(() => {
      if (mounted) setAblyClient(client);
    });

    client.connection.on("connected", () => {
      console.log("Ably connected");
      if (mounted) {
        setIsConnected(true);
        // Only enter presence when connected to avoid "Connection closed" issues if unmounted before connection
        globalPresenceChannel.presence.enter().catch(() => {});
      }
    });

    client.connection.on("disconnected", () => {
      console.log("Ably disconnected");
      if (mounted) setIsConnected(false);
    });

    client.connection.on("failed", () => {
      console.error("Ably connection failed");
      if (mounted) setIsConnected(false);
    });

    // Global presence channel
    const globalPresenceChannel = client.channels.get("comms:global-presence");

    globalPresenceChannel.presence.subscribe(
      ["enter", "present"],
      (member: Ably.PresenceMessage) => {
        if (!mounted) return;
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.add(member.clientId);
          return next;
        });
        onPresenceChangeRef.current?.(member.clientId, true);
      },
    );

    globalPresenceChannel.presence.subscribe(
      "leave",
      (member: Ably.PresenceMessage) => {
        if (!mounted) return;
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(member.clientId);
          return next;
        });
        onPresenceChangeRef.current?.(member.clientId, false);
      },
    );

    // Fetch initial presence
    globalPresenceChannel.presence
      .get()
      .then((members) => {
        if (mounted && members) {
          const ids = members.map((m) => m.clientId);
          setOnlineUsers(new Set(ids));
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error("Error fetching Ably presence:", err);
        }
      });

    const currentChannels = channelsRef.current;
    // Removed immediate enter() from here, moved to connection listener

    return () => {
      mounted = false;
      console.log("Cleaning up Ably connection...");
      try {
        // Unsubscribe and detach all thread channels
        currentChannels.forEach((channel) => {
          try {
            channel.unsubscribe();
            channel.detach();
          } catch {
            // No-op
          }
        });
        currentChannels.clear();

        // Don't explicitly call client.close() - it causes unhandled promise rejections
        // during HMR/fast refresh. The connection will close automatically when the
        // client is dereferenced and garbage collected.
      } catch {
        // Cleanup errors are non-fatal
      } finally {
        ablyRef.current = null;
        setAblyClient(null);
        setIsConnected(false);
      }
    };
  }, [enabled, userId]);

  // Helper to subscribe to thread events
  const joinThread = useCallback((threadId: string) => {
    if (!ablyRef.current) return;

    const channelName = `thread:${threadId}`;
    if (channelsRef.current.has(channelName)) return;

    const channel = ablyRef.current.channels.get(channelName);
    channelsRef.current.set(channelName, channel);

    channel.subscribe((message) => {
      const payload = message.data as CommsRealtimePayload;
      // Map Ably message names to payload types if they differ
      if (!payload.type) payload.type = message.name as CommsRealtimeEventType;

      setLastEvent(payload);
      onEventRef.current?.(payload);
    });
  }, []);

  const leaveThread = useCallback((threadId: string) => {
    const channelName = `thread:${threadId}`;
    const channel = channelsRef.current.get(channelName);
    if (channel) {
      channel.unsubscribe();
      channel.detach();
      channelsRef.current.delete(channelName);
      console.log(`Left Ably channel: ${channelName}`);
    }
  }, []);

  const startTyping = useCallback(
    (threadId: string, userName: string) => {
      const channelName = `thread:${threadId}`;
      const channel = channelsRef.current.get(channelName);
      if (channel) {
        channel.publish("typing_start", {
          type: "typing_start",
          threadId,
          userId,
          userName,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [userId],
  );

  const stopTyping = useCallback(
    (threadId: string, userName: string) => {
      const channelName = `thread:${threadId}`;
      const channel = channelsRef.current.get(channelName);
      if (channel) {
        channel.publish("typing_stop", {
          type: "typing_stop",
          threadId,
          userId,
          userName,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [userId],
  );

  return {
    isConnected,
    lastEvent,
    socket: ablyClient,
    onlineUsers,
    joinThread,
    leaveThread,
    startTyping,
    stopTyping,
  };
}
