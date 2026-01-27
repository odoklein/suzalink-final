"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
    X,
    MoreVertical,
    CheckCircle,
    Archive,
    Users,
    Send,
    Paperclip,
    ChevronDown,
    Clock,
    Sparkles,
} from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { MessageContent } from "./MessageContent";
import { MessageAttachments } from "./MessageAttachments";
import { MessageReactions } from "./MessageReactions";
import { ThreadSummary } from "./ThreadSummary";
import { SuggestionChips } from "./SuggestionChips";
import { TemplatePicker } from "./TemplatePicker";
import type { CommsThreadView, CommsMessageView } from "@/lib/comms/types";

interface ThreadViewProps {
    thread: CommsThreadView;
    onClose: () => void;
    onStatusChange: (status: "RESOLVED" | "ARCHIVED") => void;
    onSendMessage: (
        content: string,
        opts?: { mentionIds?: string[]; files?: File[] }
    ) => Promise<void>;
    onReactionToggle?: () => void;
    currentUserId: string;
    typingUserName?: string;
}

export function ThreadView({
    thread,
    onClose,
    onStatusChange,
    onSendMessage,
    onReactionToggle,
    currentUserId,
    typingUserName,
}: ThreadViewProps) {
    const [messageContent, setMessageContent] = useState("");
    const [mentionIds, setMentionIds] = useState<string[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const mentionOptions = thread.participants.map((p) => ({
        id: p.userId,
        name: p.userName,
    }));

    const postTyping = useCallback(
        (isTyping: boolean) => {
            fetch("/api/comms/typing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ threadId: thread.id, isTyping }),
            }).catch(() => { });
        },
        [thread.id]
    );

    const notifyTyping = useCallback(
        (isTyping: boolean) => {
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
                    postTyping(true);
                    typingStopRef.current = setTimeout(() => {
                        typingStopRef.current = null;
                        postTyping(false);
                    }, 2500);
                }, 300);
            } else {
                postTyping(false);
            }
        },
        [postTyping]
    );

    useEffect(() => {
        return () => {
            if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
            if (typingStopRef.current) clearTimeout(typingStopRef.current);
            postTyping(false);
        };
    }, [thread.id, postTyping]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [thread.messages]);

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

    // Helper to get display title for thread
    const getThreadTitle = () => {
        if (thread.channelType === "DIRECT") {
            // For direct messages, extract recipient name from subject
            if (thread.subject.startsWith("Message avec ")) {
                return thread.subject.replace("Message avec ", "");
            }
            // Fallback: find the other participant
            const otherParticipant = thread.participants.find(p => p.userId !== currentUserId);
            if (otherParticipant) {
                return otherParticipant.userName;
            }
        }
        return thread.subject;
    };

    const isDirectMessage = thread.channelType === "DIRECT";
    const threadTitle = getThreadTitle();

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50/50 to-white">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Avatar for direct messages */}
                    {isDirectMessage && (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-sm font-semibold text-blue-600 flex-shrink-0">
                            {threadTitle.charAt(0).toUpperCase()}
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        {/* Channel type badge */}
                        <div className="flex items-center gap-2 mb-1">
                            {isDirectMessage ? (
                                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    Message direct
                                </span>
                            ) : (
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {thread.channelName}
                                </span>
                            )}
                            {thread.isBroadcast && (
                                <span className="text-[10px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                                    Annonce
                                </span>
                            )}
                            {thread.status !== "OPEN" && (
                                <span className={cn(
                                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                    thread.status === "RESOLVED"
                                        ? "text-emerald-600 bg-emerald-100"
                                        : "text-slate-600 bg-slate-100"
                                )}>
                                    {thread.status === "RESOLVED" ? "Résolu" : "Archivé"}
                                </span>
                            )}
                        </div>

                        {/* Title - recipient name for direct, subject for others */}
                        <h2 className="text-lg font-semibold text-slate-900 truncate">
                            {threadTitle}
                        </h2>

                        {/* Typing indicator */}
                        {typingUserName && (
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex gap-0.5">
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                                <p className="text-xs text-indigo-600 font-medium">
                                    {typingUserName} écrit…
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Participants indicator */}
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-medium">{thread.participantCount}</span>
                    </button>

                    {/* Actions menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                showMenu
                                    ? "bg-slate-100 text-slate-700"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            )}
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {thread.status === "OPEN" && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    onStatusChange("RESOLVED");
                                                    setShowMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                <span>Marquer comme résolu</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onStatusChange("ARCHIVED");
                                                    setShowMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                <Archive className="w-4 h-4 text-slate-400" />
                                                <span>Archiver</span>
                                            </button>
                                        </>
                                    )}
                                    {thread.status === "RESOLVED" && (
                                        <button
                                            onClick={() => {
                                                onStatusChange("ARCHIVED");
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            <Archive className="w-4 h-4 text-slate-400" />
                                            <span>Archiver</span>
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* AI Summary */}
            {thread.messages.length >= 5 && (
                <ThreadSummary threadId={thread.id} />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gradient-to-b from-slate-50/30 to-white">
                {/* Date separator for first message */}
                {thread.messages.length > 0 && (
                    <div className="flex items-center justify-center">
                        <div className="px-3 py-1 bg-slate-100 rounded-full">
                            <span className="text-[11px] font-medium text-slate-500">
                                {format(new Date(thread.messages[0].createdAt), "EEEE d MMMM", { locale: fr })}
                            </span>
                        </div>
                    </div>
                )}

                {thread.messages.map((message, index) => {
                    const isOwn = message.author.id === currentUserId;
                    const showAvatar =
                        index === 0 ||
                        thread.messages[index - 1].author.id !== message.author.id;

                    // Check if we need a date separator
                    const prevMessage = index > 0 ? thread.messages[index - 1] : null;
                    const currentDate = new Date(message.createdAt).toDateString();
                    const prevDate = prevMessage ? new Date(prevMessage.createdAt).toDateString() : null;
                    const showDateSeparator = prevDate && currentDate !== prevDate;

                    return (
                        <div key={message.id}>
                            {showDateSeparator && (
                                <div className="flex items-center justify-center my-6">
                                    <div className="px-3 py-1 bg-slate-100 rounded-full">
                                        <span className="text-[11px] font-medium text-slate-500">
                                            {format(new Date(message.createdAt), "EEEE d MMMM", { locale: fr })}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <MessageBubble
                                message={message}
                                isOwn={isOwn}
                                showAvatar={showAvatar}
                                currentUserId={currentUserId}
                                onReactionToggle={onReactionToggle}
                            />
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            {thread.status === "OPEN" && !thread.isBroadcast && (
                <div className="px-6 py-4 border-t border-slate-200 bg-white space-y-3">
                    {/* AI Suggestions */}
                    {!messageContent && thread.messages.length > 0 && (
                        <SuggestionChips
                            threadId={thread.id}
                            onSelect={(content) => setMessageContent(content)}
                            className="mb-2"
                        />
                    )}
                    <MessageAttachments
                        files={files}
                        onChange={setFiles}
                        disabled={isSending}
                    />
                    <div className="flex items-end gap-3">
                        <div className="flex-1 min-w-0 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                            <RichTextEditor
                                value={messageContent}
                                onChange={(v, ids) => {
                                    setMessageContent(v);
                                    setMentionIds(ids);
                                    if (thread.status === "OPEN" && !thread.isBroadcast) {
                                        notifyTyping(true);
                                    }
                                }}
                                onBlur={() => notifyTyping(false)}
                                onSubmit={handleSend}
                                placeholder="Écrire un message... @mention pour notifier"
                                disabled={isSending}
                                mentionOptions={mentionOptions}
                                minRows={1}
                                maxRows={5}
                            />
                        </div>
                        <TemplatePicker
                            onSelect={(content) => setMessageContent(content)}
                        />
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={(!messageContent.trim() && files.length === 0) || isSending}
                            className={cn(
                                "p-3 rounded-xl transition-all duration-200 flex-shrink-0 shadow-lg",
                                (messageContent.trim() || files.length > 0)
                                    ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-indigo-500/25"
                                    : "bg-slate-100 text-slate-400 shadow-none"
                            )}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Status banner for non-open threads */}
            {thread.status !== "OPEN" && (
                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200">
                    <div className="flex items-center justify-center gap-3">
                        {thread.status === "RESOLVED" ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                            <Archive className="w-5 h-5 text-slate-400" />
                        )}
                        <span className="text-sm font-medium text-slate-600">
                            Cette discussion est{" "}
                            {thread.status === "RESOLVED" ? "résolue" : "archivée"}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Message bubble component
function MessageBubble({
    message,
    isOwn,
    showAvatar,
    currentUserId,
    onReactionToggle,
}: {
    message: CommsMessageView;
    isOwn: boolean;
    showAvatar: boolean;
    currentUserId: string;
    onReactionToggle?: () => void;
}) {
    // System messages
    if (message.type === "SYSTEM") {
        return (
            <div className="flex justify-center my-4">
                <span className="text-xs text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full font-medium">
                    {message.content}
                </span>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "flex gap-3 group",
                isOwn ? "flex-row-reverse" : "flex-row"
            )}
        >
            {/* Avatar */}
            {showAvatar ? (
                <div
                    className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0 shadow-sm",
                        isOwn
                            ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white"
                            : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600"
                    )}
                >
                    {message.author.initials}
                </div>
            ) : (
                <div className="w-10 flex-shrink-0" />
            )}

            {/* Content */}
            <div className={cn("max-w-[70%] space-y-1", isOwn && "items-end")}>
                {showAvatar && (
                    <div
                        className={cn(
                            "flex items-center gap-2 mb-1.5 px-1",
                            isOwn && "flex-row-reverse"
                        )}
                    >
                        <span className="text-sm font-semibold text-slate-700">
                            {message.author.name}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(message.createdAt), "HH:mm", { locale: fr })}
                        </span>
                    </div>
                )}
                <div
                    className={cn(
                        "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                        isOwn
                            ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-md"
                            : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
                    )}
                >
                    <MessageContent
                        content={message.content}
                        isOwn={isOwn}
                        className={isOwn ? "text-white" : ""}
                    />
                    {message.isEdited && (
                        <span
                            className={cn(
                                "text-[10px] ml-2",
                                isOwn ? "text-indigo-200" : "text-slate-400"
                            )}
                        >
                            (modifié)
                        </span>
                    )}
                </div>

                {/* Read receipts */}
                {isOwn && message.readBy && message.readBy.length > 0 && (
                    <p className="text-[10px] text-slate-400 px-1 text-right">
                        Lu par {message.readBy.map((r) => r.userName).join(", ")}
                    </p>
                )}

                {/* Reactions */}
                {message.type === "TEXT" && (
                    <MessageReactions
                        messageId={message.id}
                        reactions={message.reactions ?? []}
                        currentUserId={currentUserId}
                        onToggle={async (msgId, emoji) => {
                            await fetch(`/api/comms/messages/${msgId}/reactions`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ emoji }),
                            });
                            onReactionToggle?.();
                        }}
                        isOwn={isOwn}
                    />
                )}

                {/* Attachments */}
                {message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                        {message.attachments.map((att) => (
                            <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    "flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-colors",
                                    isOwn
                                        ? "bg-indigo-400/30 text-indigo-100 hover:bg-indigo-400/50"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                )}
                            >
                                <Paperclip className="w-3.5 h-3.5" />
                                {att.filename}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ThreadView;
