"use client";

import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
    X,
    MoreVertical,
    CheckCircle,
    Archive,
    Send,
    Paperclip,
    ChevronDown,
    Loader2,
    Phone,
    Calendar,
    UserPlus,
    CheckCheck,
    Maximize2,
    Minimize2,
} from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { MessageContent } from "./MessageContent";
import { MessageAttachments } from "./MessageAttachments";
import { MessageReactions } from "./MessageReactions";
import { ThreadSummary } from "./ThreadSummary";
import { SuggestionChips } from "./SuggestionChips";
import { TemplatePicker } from "./TemplatePicker";
import type { CommsThreadView, CommsMessageView } from "@/lib/comms/types";

// ============================================
// GLOBAL STYLES — injected once via <style>
// ============================================

const THREAD_STYLES = `
@keyframes typing-dot {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-4px); opacity: 1; }
}
@keyframes typing-fade-in {
    from { opacity: 0; transform: translate3d(0, 8px, 0); }
    to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes msg-appear {
    from { opacity: 0; transform: translate3d(0, 10px, 0) scale(0.97); }
    to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes scroll-btn-in {
    from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.9); }
    to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes menu-slide {
    from { opacity: 0; transform: translate3d(0, -6px, 0) scale(0.95); }
    to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes date-fade {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
}

/* GPU-accelerated scroll for messages container */
.thread-messages-scroll {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
    contain: layout style;
    will-change: scroll-position;
    overscroll-behavior-y: contain;
}
.thread-messages-scroll::-webkit-scrollbar {
    width: 5px;
}
.thread-messages-scroll::-webkit-scrollbar-track {
    background: transparent;
}
.thread-messages-scroll::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 999px;
}
.thread-messages-scroll:hover::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.5);
}

/* Message containment for performance */
.msg-bubble-wrap {
    contain: content;
    will-change: auto;
}
`;

// ============================================
// TYPING INDICATOR – Messenger style
// ============================================

function TypingIndicator({ userName }: { userName: string }) {
    return (
        <div
            className="flex items-center gap-2.5 px-2 sm:px-4 py-2.5"
            style={{ animation: "typing-fade-in 0.3s ease-out forwards" }}
        >
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-[3px]">
                    {[0, 200, 400].map((delay) => (
                        <span
                            key={delay}
                            className="w-[7px] h-[7px] bg-slate-400 dark:bg-slate-500 rounded-full"
                            style={{
                                animation: "typing-dot 1.4s ease-in-out infinite",
                                animationDelay: `${delay}ms`,
                            }}
                        />
                    ))}
                </div>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
                {userName} écrit…
            </span>
        </div>
    );
}

// ============================================
// DATE SEPARATOR (memoized)
// ============================================

const DateSeparator = memo(function DateSeparator({ date }: { date: string }) {
    return (
        <div
            className="flex justify-center py-3"
            style={{ animation: "date-fade 0.3s ease-out" }}
        >
            <span className="text-[11px] font-medium text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full select-none">
                {date}
            </span>
        </div>
    );
});

// ============================================
// THREAD VIEW PROPS
// ============================================

interface ThreadViewProps {
    thread: CommsThreadView;
    onClose: () => void;
    onStatusChange: (status: "RESOLVED" | "ARCHIVED") => void;
    onSendMessage: (
        content: string,
        opts?: { mentionIds?: string[]; files?: File[] }
    ) => Promise<void>;
    onReactionToggle?: (messageId: string, emoji: string) => Promise<void>;
    currentUserId: string;
    typingUserName?: string;
    focusMode?: boolean;
    onFocusModeChange?: (active: boolean) => void;
    isRecipientOnline?: boolean;
    onTyping?: (isTyping: boolean) => void;
}

// ============================================
// THREAD VIEW COMPONENT
// ============================================

export function ThreadView({
    thread,
    onClose,
    onStatusChange,
    onSendMessage,
    onReactionToggle,
    currentUserId,
    typingUserName,
    focusMode,
    onFocusModeChange,
    isRecipientOnline,
    onTyping,
}: ThreadViewProps) {
    const [messageContent, setMessageContent] = useState("");
    const [mentionIds, setMentionIds] = useState<string[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevMessageCountRef = useRef(0);
    const [isNearBottom, setIsNearBottom] = useState(true);

    const mentionOptions = useMemo(
        () => thread.participants.map((p) => ({ id: p.userId, name: p.userName })),
        [thread.participants]
    );

    // ── Scroll tracking (passive for perf) ──
    const handleScroll = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const threshold = 150;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
        setIsNearBottom(atBottom);
    }, []);

    // Auto-scroll when new messages arrive
    useEffect(() => {
        const currentCount = thread.messages.length;
        if (currentCount > prevMessageCountRef.current && isNearBottom) {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            });
        }
        prevMessageCountRef.current = currentCount;
    }, [thread.messages.length, isNearBottom]);

    // Scroll to bottom on thread change
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (el) {
            // Use scrollTop for instant scroll (no jank)
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
            });
        }
        prevMessageCountRef.current = thread.messages.length;
        setIsNearBottom(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only on thread switch
    }, [thread.id]);

    // ── Typing notifications ──
    const notifyTyping = useCallback(
        (isTyping: boolean) => {
            if (!onTyping) return;
            if (typingDebounceRef.current) {
                clearTimeout(typingDebounceRef.current);
                typingDebounceRef.current = null;
            }
            if (typingStopRef.current) {
                clearTimeout(typingStopRef.current);
                typingStopRef.current = null;
            }
            if (isTyping) {
                typingDebounceRef.current = setTimeout(() => {
                    typingDebounceRef.current = null;
                    onTyping(true);
                    typingStopRef.current = setTimeout(() => {
                        typingStopRef.current = null;
                        onTyping(false);
                    }, 2500);
                }, 300);
            } else {
                onTyping(false);
            }
        },
        [onTyping]
    );

    useEffect(() => {
        return () => {
            if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
            if (typingStopRef.current) clearTimeout(typingStopRef.current);
            if (onTyping) onTyping(false);
        };
    }, [thread.id, onTyping]);

    // ── Send handler ──
    const handleSend = async () => {
        const trimmed = messageContent.trim();
        if ((!trimmed && files.length === 0) || isSending) return;

        notifyTyping(false);
        setIsSending(true);
        try {
            await onSendMessage(trimmed, {
                mentionIds: mentionIds.length > 0 ? mentionIds : undefined,
                files: files.length > 0 ? files : undefined,
            });
            setMessageContent("");
            setMentionIds([]);
            setFiles([]);
        } finally {
            setIsSending(false);
        }
    };

    // ── Thread title logic ──
    const threadTitle = useMemo(() => {
        if (thread.channelType === "DIRECT") {
            const otherParticipant = thread.participants.find(p => p.userId !== currentUserId);
            if (otherParticipant) return otherParticipant.userName;
            if (thread.subject.startsWith("Message avec ")) {
                return thread.subject.replace("Message avec ", "");
            }
        }
        return thread.subject;
    }, [thread.channelType, thread.participants, thread.subject, currentUserId]);

    const isDirectMessage = thread.channelType === "DIRECT";

    // ── Pre-compute formatted dates for messages ──
    const formattedDates = useMemo(() => {
        const dates: Record<number, { date: string; showSeparator: boolean }> = {};
        for (let i = 0; i < thread.messages.length; i++) {
            const msg = thread.messages[i];
            const dateStr = new Date(msg.createdAt).toDateString();
            const prevDateStr = i > 0 ? new Date(thread.messages[i - 1].createdAt).toDateString() : null;
            const showSeparator = !!(prevDateStr && dateStr !== prevDateStr);
            dates[i] = {
                date: format(new Date(msg.createdAt), "EEEE d MMMM", { locale: fr }),
                showSeparator,
            };
        }
        return dates;
    }, [thread.messages]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#151c2a] relative">
            {/* Inject styles once */}
            <style>{THREAD_STYLES}</style>

            {/* ═══════════ HEADER ═══════════ */}
            <header className="h-14 sm:h-[3.5rem] border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-3 sm:px-4 bg-white/90 dark:bg-[#151c2a]/95 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {/* Mobile back button */}
                    <button
                        onClick={onClose}
                        className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors sm:hidden"
                        aria-label="Retour"
                    >
                        <ChevronDown className="w-5 h-5 rotate-90" />
                    </button>
                    <div className="relative shrink-0">
                        <div className="size-8 sm:size-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/50 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {threadTitle.charAt(0).toUpperCase()}
                        </div>
                        {isRecipientOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white dark:ring-[#151c2a]" />
                            </span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm leading-tight">
                            {threadTitle}
                        </h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                            {isRecipientOnline ? (
                                <span className="text-emerald-500 font-medium">En ligne</span>
                            ) : isDirectMessage ? (
                                "Hors ligne"
                            ) : (
                                `${thread.participants.length} participants`
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                    {onFocusModeChange && (
                        <button
                            onClick={() => onFocusModeChange(!focusMode)}
                            className={cn(
                                "p-2 rounded-lg transition-all duration-200 hidden sm:inline-flex",
                                focusMode
                                    ? "text-indigo-600 bg-indigo-500/10"
                                    : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-500/5"
                            )}
                            title={focusMode ? "Quitter le mode focus" : "Mode focus"}
                        >
                            {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                    )}
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-500/5 rounded-lg transition-colors hidden sm:inline-flex">
                        <Phone className="w-4 h-4" />
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className={cn(
                                "p-2 rounded-lg transition-all duration-200",
                                showMenu
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    : "text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                <div
                                    className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-20"
                                    style={{ animation: "menu-slide 0.15s ease-out" }}
                                >
                                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span>Planifier un RDV</span>
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                                        <UserPlus className="w-4 h-4 text-slate-400" />
                                        <span>Assigner</span>
                                    </button>
                                    {(thread.status === "OPEN" || thread.status === "RESOLVED") && (
                                        <>
                                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                            {thread.status === "OPEN" && (
                                                <button
                                                    onClick={() => { onStatusChange("RESOLVED"); setShowMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                    <span>Marquer comme résolu</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { onStatusChange("ARCHIVED"); setShowMenu(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <Archive className="w-4 h-4 text-slate-400" />
                                                <span>Archiver</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors hidden sm:inline-flex"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {thread.messages.length >= 5 && <ThreadSummary threadId={thread.id} />}

            {/* ═══════════ MESSAGES AREA ═══════════ */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="thread-messages-scroll flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-3 sm:py-4 space-y-0.5 bg-gradient-to-b from-slate-50 to-slate-50/50 dark:from-slate-900/60 dark:to-slate-900/30"
            >
                {/* First date label */}
                {thread.messages.length > 0 && (
                    <DateSeparator date={format(new Date(thread.messages[0].createdAt), "EEEE d MMMM", { locale: fr })} />
                )}

                {thread.messages.map((message, index) => {
                    const isOwn = message.author.id === currentUserId;
                    const prevMessage = index > 0 ? thread.messages[index - 1] : null;
                    const sameAuthor = !!(prevMessage && prevMessage.author.id === message.author.id);
                    const showAvatar = !sameAuthor;
                    const isLast = index === thread.messages.length - 1;
                    const dateInfo = formattedDates[index];

                    return (
                        <div
                            key={message.id}
                            className="msg-bubble-wrap"
                            style={{
                                animation: isLast && (message as { isOptimistic?: boolean }).isOptimistic
                                    ? "msg-appear 0.25s ease-out forwards"
                                    : undefined,
                            }}
                        >
                            {dateInfo?.showSeparator && <DateSeparator date={dateInfo.date} />}
                            <MemoizedMessageBubble
                                message={message}
                                isOwn={isOwn}
                                showAvatar={showAvatar}
                                sameAuthor={sameAuthor}
                                currentUserId={currentUserId}
                                onReactionToggle={onReactionToggle}
                            />
                        </div>
                    );
                })}

                {/* Typing Indicator */}
                {typingUserName && <TypingIndicator userName={typingUserName} />}

                <div ref={messagesEndRef} className="h-px" />
            </div>

            {/* ═══════════ SCROLL TO BOTTOM ═══════════ */}
            <div
                className={cn(
                    "absolute bottom-28 sm:bottom-32 right-4 sm:right-8 z-20 transition-all duration-300",
                    isNearBottom
                        ? "opacity-0 pointer-events-none translate-y-2 scale-90"
                        : "opacity-100 translate-y-0 scale-100"
                )}
            >
                <button
                    onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="w-9 h-9 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-lg shadow-slate-900/10 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-indigo-200/30 transition-all duration-200 active:scale-95"
                    aria-label="Aller en bas"
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
            </div>

            {/* ═══════════ INPUT AREA ═══════════ */}
            {thread.status === "OPEN" && !thread.isBroadcast && (
                <div className="p-2 sm:p-4 bg-white/95 dark:bg-[#151c2a]/95 backdrop-blur-sm border-t border-slate-200/80 dark:border-slate-800 shrink-0">
                    <div className="max-w-4xl mx-auto flex flex-col gap-1.5 sm:gap-2">
                        {!messageContent && thread.messages.length > 0 && (
                            <div className="flex gap-2 mb-0.5 overflow-x-auto no-scrollbar">
                                <SuggestionChips threadId={thread.id} onSelect={setMessageContent} />
                                <TemplatePicker onSelect={(content) => setMessageContent(content)} />
                            </div>
                        )}
                        <MessageAttachments files={files} onChange={setFiles} disabled={isSending} />
                        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-all duration-200">
                            <RichTextEditor
                                value={messageContent}
                                onChange={(v, ids) => {
                                    setMessageContent(v);
                                    setMentionIds(ids);
                                    if (thread.status === "OPEN" && !thread.isBroadcast) notifyTyping(true);
                                }}
                                onBlur={() => notifyTyping(false)}
                                onSubmit={handleSend}
                                placeholder="Écrire un message... @mention pour notifier"
                                disabled={isSending}
                                mentionOptions={mentionOptions}
                                minRows={2}
                                maxRows={6}
                            />
                            <div className="flex justify-between items-center px-2 sm:px-3 pb-1.5 sm:pb-2 pt-1 sm:pt-1.5 border-t border-slate-100 dark:border-slate-800">
                                <div className="items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 hidden sm:flex">
                                    <span>Entrée pour envoyer · Shift+Entrée pour retour ligne</span>
                                </div>
                                <div className="flex gap-2 ml-auto">
                                    <button
                                        type="button"
                                        onClick={handleSend}
                                        disabled={(!messageContent.trim() && files.length === 0) || isSending}
                                        className={cn(
                                            "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm",
                                            (messageContent.trim() || files.length > 0)
                                                ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.97]"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                        )}
                                    >
                                        {isSending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <span className="hidden sm:inline">Envoyer</span>
                                                <Send className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ CLOSED BANNER ═══════════ */}
            {thread.status !== "OPEN" && (
                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-t border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center justify-center gap-3">
                        {thread.status === "RESOLVED" ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Archive className="w-5 h-5 text-slate-400" />}
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Cette discussion est {thread.status === "RESOLVED" ? "résolue" : "archivée"}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// MESSAGE BUBBLE (memoized for perf)
// ============================================

const MemoizedMessageBubble = memo(function MessageBubble({
    message,
    isOwn,
    showAvatar,
    sameAuthor,
    currentUserId,
    onReactionToggle,
}: {
    message: CommsMessageView;
    isOwn: boolean;
    showAvatar: boolean;
    sameAuthor: boolean;
    currentUserId: string;
    onReactionToggle?: (messageId: string, emoji: string) => Promise<void>;
}) {
    if (message.type === "SYSTEM") {
        return (
            <div className="flex justify-center py-2">
                <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
                    {message.content}
                </span>
            </div>
        );
    }

    const isOptimistic = (message as { isOptimistic?: boolean }).isOptimistic;
    const hasReadReceipt = isOwn && message.readBy && message.readBy.length > 0;

    return (
        <div className={cn(
            "flex gap-2 sm:gap-2.5 group",
            sameAuthor ? "mt-0.5" : "mt-2.5 sm:mt-3",
            isOwn ? "flex-row-reverse" : "flex-row"
        )}>
            {/* Avatar */}
            {showAvatar ? (
                <div className={cn(
                    "size-6 sm:size-7 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-semibold flex-shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-110",
                    isOwn
                        ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white"
                        : "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-600 dark:text-slate-300"
                )}>
                    {message.author.initials}
                </div>
            ) : <div className="size-6 sm:size-7 flex-shrink-0" />}

            {/* Content */}
            <div className={cn("flex flex-col gap-0.5 max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]", isOwn && "items-end")}>
                {showAvatar && (
                    <div className={cn("flex items-baseline gap-1.5 px-0.5", isOwn && "flex-row-reverse")}>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {isOwn ? "Vous" : message.author.name}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-0.5">
                            {format(new Date(message.createdAt), "HH:mm", { locale: fr })}
                            {isOptimistic && (
                                <span className="flex items-center gap-0.5 text-indigo-500 ml-1">
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Envoi…
                                </span>
                            )}
                        </span>
                    </div>
                )}
                <div className={cn(
                    "px-3 py-2 text-[13px] sm:text-sm leading-relaxed shadow-sm transition-opacity duration-200",
                    isOptimistic && "opacity-75",
                    isOwn
                        ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl rounded-tr-md"
                        : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-md"
                )}>
                    <MessageContent content={message.content} isOwn={isOwn} className={isOwn ? "text-white" : ""} />
                    {message.isEdited && (
                        <span className={cn("text-[10px] ml-2", isOwn ? "text-indigo-200" : "text-slate-400")}>(modifié)</span>
                    )}
                </div>

                {/* Read receipt */}
                {hasReadReceipt && (
                    <span className="text-[11px] font-medium text-indigo-400 flex items-center gap-1 mt-0.5 transition-opacity duration-300">
                        Lu <CheckCheck className="w-3.5 h-3.5" />
                    </span>
                )}

                {/* Reactions */}
                {message.type === "TEXT" && !isOptimistic && (
                    <MessageReactions
                        messageId={message.id}
                        reactions={message.reactions ?? []}
                        currentUserId={currentUserId}
                        onToggle={(msgId, emoji) => onReactionToggle?.(msgId, emoji) ?? Promise.resolve()}
                        isOwn={isOwn}
                    />
                )}

                {/* Attachments */}
                {message.attachments.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                        {message.attachments.map((att) => (
                            <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    "flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-colors duration-200",
                                    isOwn
                                        ? "bg-indigo-400/30 text-indigo-100 hover:bg-indigo-400/50"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                )}
                            >
                                <Paperclip className="w-3.5 h-3.5" /> {att.filename}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

export default memo(ThreadView);
