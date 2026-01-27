"use client";

// ============================================
// useCommsRealtime
// SSE connection to /api/comms/events with reconnect & event subscription
// ============================================

import { useEffect, useRef, useCallback, useState } from "react";
import type { CommsRealtimePayload } from "@/lib/comms/events";

const MAX_RETRIES = 10;
const INITIAL_RETRY_MS = 1000;
const MAX_RETRY_MS = 30000;

function getEventsUrl(): string {
    if (typeof window === "undefined") return "";
    const base = window.location.origin;
    return `${base}/api/comms/events`;
}

export type CommsRealtimeHandler = (payload: CommsRealtimePayload) => void;

export interface UseCommsRealtimeOptions {
    enabled?: boolean;
    onEvent?: CommsRealtimeHandler;
}

export interface UseCommsRealtimeResult {
    isConnected: boolean;
    lastEvent: CommsRealtimePayload | null;
    reconnect: () => void;
}

export function useCommsRealtime(
    options: UseCommsRealtimeOptions = {}
): UseCommsRealtimeResult {
    const { enabled = true, onEvent } = options;
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<CommsRealtimePayload | null>(null);
    const retryCount = useRef(0);
    const eventSourceRef = useRef<EventSource | null>(null);
    const onEventRef = useRef(onEvent);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    onEventRef.current = onEvent;

    const connect = useCallback(() => {
        if (!enabled || typeof window === "undefined") return;

        const url = getEventsUrl();
        if (!url) return;

        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
            retryCount.current = 0;
            setIsConnected(true);
        };

        es.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data) as CommsRealtimePayload;
                setLastEvent(payload);
                onEventRef.current?.(payload);
            } catch (_) {
                /* ignore parse errors (e.g. keepalive comment) */
            }
        };

        es.onerror = () => {
            es.close();
            eventSourceRef.current = null;
            setIsConnected(false);

            if (retryCount.current >= MAX_RETRIES) return;

            const delay = Math.min(
                INITIAL_RETRY_MS * Math.pow(2, retryCount.current),
                MAX_RETRY_MS
            );
            retryCount.current += 1;
            reconnectTimeoutRef.current = setTimeout(connect, delay);
        };
    }, [enabled]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsConnected(false);
    }, []);

    useEffect(() => {
        if (enabled) connect();
        return disconnect;
    }, [enabled, connect, disconnect]);

    const reconnect = useCallback(() => {
        disconnect();
        retryCount.current = 0;
        connect();
    }, [disconnect, connect]);

    return { isConnected, lastEvent, reconnect };
}
