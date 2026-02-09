"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
    Phone,
    PhoneOff,
    Mic,
    MicOff,
    Pause,
    ArrowRightLeft,
    ChevronDown,
    ChevronUp,
    User,
    Building2,
    Calendar,
    Loader2,
} from "lucide-react";
import { Button, Card, Select } from "@/components/ui";
import { CALL_RESULT_OPTIONS, MOCK_QUICK_NUMBERS } from "@/lib/calls/mock-data";
import type { CallResult } from "@/lib/calls/mock-data";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export type CallPhase = "idle" | "ringing" | "in-progress" | "ended";

interface CurrentCallState {
    contactName: string;
    companyName: string;
    phone: string;
    phase: CallPhase;
    durationSeconds: number;
    /** Set when call was initiated via API */
    callId?: string;
    contactId?: string;
    companyId?: string;
    campaignId?: string;
}

export interface DialerDrawerProps {
    /** After call is logged (result saved), call this to e.g. load next from queue */
    onCallComplete?: () => void;
    /** Pre-fill target for "call this contact" from queue (optional) */
    initialTarget?: {
        contactName: string;
        companyName: string;
        phone: string;
        contactId?: string;
        companyId?: string;
        campaignId?: string;
    };
}

// ============================================
// DIALER DRAWER
// ============================================

const DRAWER_WIDTH = 380;
const DRAWER_HEIGHT_COLLAPSED = 56;

export function DialerDrawer({ onCallComplete, initialTarget }: DialerDrawerProps = {}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [position, setPosition] = useState({ x: typeof window !== "undefined" ? window.innerWidth - DRAWER_WIDTH - 24 : 400, y: 120 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const [currentCall, setCurrentCall] = useState<CurrentCallState | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [muted, setMuted] = useState(false);
    const [onHold, setOnHold] = useState(false);
    const [showPostCallForm, setShowPostCallForm] = useState(false);
    const [postCallResult, setPostCallResult] = useState<CallResult>("NO_RESPONSE");
    const [postCallNote, setPostCallNote] = useState("");
    const [postCallCallbackDate, setPostCallCallbackDate] = useState("");
    const [showNewCallPanel, setShowNewCallPanel] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const elapsedRef = useRef(0);
    elapsedRef.current = elapsedSeconds;

    // Elapsed timer when in-progress
    useEffect(() => {
        if (currentCall?.phase !== "in-progress") return;
        timerRef.current = setInterval(() => {
            setElapsedSeconds((s) => s + 1);
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentCall?.phase]);

    const startCall = useCallback(
        async (contactName: string, companyName: string, phone: string, contactId?: string, companyId?: string, campaignId?: string) => {
            setElapsedSeconds(0);
            setShowPostCallForm(false);
            setShowNewCallPanel(false);
            setIsCollapsed(false);

            let callId: string | undefined;
            try {
                const res = await fetch("/api/calls/initiate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        toNumber: phone,
                        contactId: contactId || undefined,
                        companyId: companyId || undefined,
                        campaignId: campaignId || undefined,
                    }),
                });
                const data = await res.json();
                if (data.success && data.data?.callId) callId = data.data.callId;
            } catch {
                // Fallback: no API, mock only
            }

            setCurrentCall({
                contactName,
                companyName,
                phone,
                phase: "ringing",
                durationSeconds: 0,
                callId,
                contactId,
                companyId,
                campaignId,
            });

            setTimeout(() => {
                setCurrentCall((c) => (c ? { ...c, phase: "in-progress" } : null));
            }, 2000);
        },
        []
    );

    const endCall = useCallback(async () => {
        const duration = elapsedRef.current;
        setCurrentCall((c) => {
            if (!c) return null;
            if (c.callId && c.phase !== "ended") {
                fetch(`/api/calls/${c.callId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "completed", durationSeconds: duration }),
                }).catch(() => {});
            }
            return { ...c, phase: "ended" };
        });
        setShowPostCallForm(true);
    }, []);

    const submitPostCall = useCallback(async () => {
        const call = currentCall;
        const duration = elapsedRef.current;
        if (call?.callId) {
            try {
                const res = await fetch(`/api/calls/${call.callId}/complete`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        result: postCallResult,
                        note: postCallNote || undefined,
                        callbackDate: postCallCallbackDate || undefined,
                        durationSeconds: duration,
                    }),
                });
                if (res.ok) onCallComplete?.();
            } catch {
                onCallComplete?.();
            }
        } else {
            onCallComplete?.();
        }
        setCurrentCall(null);
        setShowPostCallForm(false);
        setPostCallNote("");
        setPostCallCallbackDate("");
        setPostCallResult("NO_RESPONSE");
    }, [currentCall?.callId, postCallResult, postCallNote, postCallCallbackDate, onCallComplete]);

    // Drag handling
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if ((e.target as HTMLElement).closest("button, a, input, select")) return;
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            });
        },
        [position]
    );

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: MouseEvent) => {
            const x = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - DRAWER_WIDTH));
            const y = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - (isCollapsed ? DRAWER_HEIGHT_COLLAPSED : 420)));
            setPosition({ x, y });
        };
        const onUp = () => setIsDragging(false);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [isDragging, dragOffset, isCollapsed]);

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    const statusLabel =
        currentCall?.phase === "ringing"
            ? "Appel en cours..."
            : currentCall?.phase === "in-progress"
              ? "En communication"
              : currentCall?.phase === "ended"
                ? "Appel terminé"
                : "Prêt";

    return (
        <div
            ref={containerRef}
            className="fixed z-50"
            style={{
                left: position.x,
                top: position.y,
                width: DRAWER_WIDTH,
            }}
        >
            <Card
                variant="elevated"
                className={cn(
                    "overflow-hidden shadow-xl border-slate-200 transition-all duration-200",
                    isDragging && "cursor-grabbing"
                )}
                style={{ minHeight: isCollapsed ? DRAWER_HEIGHT_COLLAPSED : undefined }}
            >
                {/* Header - draggable, collapse toggle */}
                <div
                    onMouseDown={handleMouseDown}
                    className={cn(
                        "flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-grab active:cursor-grabbing",
                        isCollapsed && "border-b-0"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Phone className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Dialer</p>
                            {!isCollapsed && currentCall && (
                                <p className="text-xs text-slate-500">{statusLabel}</p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600"
                        aria-label={isCollapsed ? "Expand" : "Collapse"}
                    >
                        {isCollapsed ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {!isCollapsed && (
                    <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                        {/* Current call info */}
                        {currentCall && (
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-slate-900 truncate">
                                            {currentCall.contactName}
                                        </p>
                                        <p className="text-sm text-slate-500 flex items-center gap-1 truncate">
                                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                                            {currentCall.companyName}
                                        </p>
                                        <p className="text-sm text-slate-600 font-mono mt-0.5">
                                            {currentCall.phone}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Durée</span>
                                    <span className="font-mono font-medium text-slate-900">
                                        {currentCall.phase === "ringing" ? (
                                            <span className="flex items-center gap-1">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                0:00
                                            </span>
                                        ) : (
                                            formatDuration(elapsedSeconds)
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Call controls - only when ringing or in-progress */}
                        {currentCall && (currentCall.phase === "ringing" || currentCall.phase === "in-progress") && (
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMuted(!muted)}
                                    className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                                        muted ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    )}
                                    title={muted ? "Réactiver le micro" : "Mute"}
                                >
                                    {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOnHold(!onHold)}
                                    className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                                        onHold ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    )}
                                    title={onHold ? "Reprendre" : "Hold"}
                                >
                                    <Pause className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center"
                                    title="Transfert"
                                >
                                    <ArrowRightLeft className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={endCall}
                                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md"
                                    title="Raccrocher"
                                >
                                    <PhoneOff className="w-6 h-6" />
                                </button>
                            </div>
                        )}

                        {/* Post-call logging form */}
                        {showPostCallForm && currentCall?.phase === "ended" && (
                            <div className="space-y-3 pt-2 border-t border-slate-200">
                                <p className="text-sm font-medium text-slate-700">Résultat de l&apos;appel</p>
                                <Select
                                    options={CALL_RESULT_OPTIONS}
                                    value={postCallResult}
                                    onChange={(v) => setPostCallResult(v as CallResult)}
                                    placeholder="Résultat..."
                                />
                                <textarea
                                    placeholder="Note (optionnel)"
                                    value={postCallNote}
                                    onChange={(e) => setPostCallNote(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm resize-y focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-500 text-slate-900"
                                />
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                                    <input
                                        type="date"
                                        value={postCallCallbackDate}
                                        onChange={(e) => setPostCallCallbackDate(e.target.value)}
                                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    />
                                </div>
                                <Button
                                    onClick={submitPostCall}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    Enregistrer et fermer
                                </Button>
                            </div>
                        )}

                        {/* New call panel */}
                        {showNewCallPanel && !currentCall && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700">Nouvel appel (mock)</p>
                                {MOCK_QUICK_NUMBERS.map((item) => (
                                    <button
                                        key={item.number}
                                        type="button"
                                        onClick={() => {
                                            const [company, name] = item.label.split(" - ");
                                            startCall(name, company, item.number);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left"
                                    >
                                        <span className="text-sm font-medium text-slate-900">{item.label}</span>
                                        <span className="text-xs text-slate-500 font-mono">{item.number}</span>
                                    </button>
                                ))}
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowNewCallPanel(false)}
                                    className="w-full"
                                >
                                    Fermer
                                </Button>
                            </div>
                        )}

                        {/* Idle: call initial target (from queue) or new call */}
                        {!currentCall && !showPostCallForm && (
                            <div className="space-y-2">
                                {initialTarget && (
                                    <Button
                                        onClick={() =>
                                            startCall(
                                                initialTarget.contactName,
                                                initialTarget.companyName,
                                                initialTarget.phone,
                                                initialTarget.contactId,
                                                initialTarget.companyId,
                                                initialTarget.campaignId
                                            )
                                        }
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
                                    >
                                        <Phone className="w-4 h-4" />
                                        Appeler {initialTarget.contactName}
                                    </Button>
                                )}
                                <Button
                                    onClick={() => setShowNewCallPanel(true)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
                                >
                                    <Phone className="w-4 h-4" />
                                    Nouvel appel
                                </Button>
                            </div>
                        )}

                        {!currentCall && !showPostCallForm && !showNewCallPanel && !initialTarget && (
                            <p className="text-xs text-slate-500 text-center">
                                Cliquez sur &quot;Nouvel appel&quot; ou passez par la file d&apos;actions pour appeler.
                            </p>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
