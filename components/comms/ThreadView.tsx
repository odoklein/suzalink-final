"use client";

import { useState, useRef, useEffect } from "react";
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
    AtSign,
} from "lucide-react";
import type { CommsThreadView, CommsMessageView } from "@/lib/comms/types";

interface ThreadViewProps {
    thread: CommsThreadView;
    onClose: () => void;
    onStatusChange: (status: "RESOLVED" | "ARCHIVED") => void;
    onSendMessage: (content: string, mentionIds?: string[]) => Promise<void>;
    currentUserId: string;
}

export function ThreadView({
    thread,
    onClose,
    onStatusChange,
    onSendMessage,
    currentUserId,
}: ThreadViewProps) {
    const [messageContent, setMessageContent] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [thread.messages]);

    const handleSend = async () => {
        if (!messageContent.trim() || isSending) return;

        setIsSending(true);
        try {
            await onSendMessage(messageContent.trim());
            setMessageContent("");
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                            {thread.channelName}
                        </span>
                        {thread.isBroadcast && (
                            <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                                Annonce
                            </span>
                        )}
                    </div>
                    <h2 className="text-base font-semibold text-slate-900 truncate">
                        {thread.subject}
                    </h2>
                </div>

                <div className="flex items-center gap-1">
                    {/* Participants indicator */}
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Users className="w-4 h-4" />
                        <span className="sr-only">{thread.participantCount} participants</span>
                    </button>

                    {/* Actions menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                                    {thread.status === "OPEN" && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    onStatusChange("RESOLVED");
                                                    setShowMenu(false);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                            >
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                Marquer comme résolu
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onStatusChange("ARCHIVED");
                                                    setShowMenu(false);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                            >
                                                <Archive className="w-4 h-4 text-slate-400" />
                                                Archiver
                                            </button>
                                        </>
                                    )}
                                    {thread.status === "RESOLVED" && (
                                        <button
                                            onClick={() => {
                                                onStatusChange("ARCHIVED");
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                            <Archive className="w-4 h-4 text-slate-400" />
                                            Archiver
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {thread.messages.map((message, index) => {
                    const isOwn = message.author.id === currentUserId;
                    const showAvatar =
                        index === 0 ||
                        thread.messages[index - 1].author.id !== message.author.id;

                    return (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={isOwn}
                            showAvatar={showAvatar}
                        />
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            {thread.status === "OPEN" && !thread.isBroadcast && (
                <div className="p-4 border-t border-slate-200">
                    <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                            <textarea
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Écrire un message..."
                                rows={1}
                                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                style={{
                                    minHeight: "42px",
                                    maxHeight: "120px",
                                }}
                            />
                            <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                <button
                                    className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                                    title="Joindre un fichier"
                                >
                                    <Paperclip className="w-4 h-4" />
                                </button>
                                <button
                                    className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                                    title="Mentionner quelqu'un"
                                >
                                    <AtSign className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!messageContent.trim() || isSending}
                            className={cn(
                                "p-2.5 rounded-xl transition-all",
                                messageContent.trim()
                                    ? "bg-indigo-500 text-white hover:bg-indigo-600"
                                    : "bg-slate-100 text-slate-400"
                            )}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Status banner for non-open threads */}
            {thread.status !== "OPEN" && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-center">
                    <span className="text-sm text-slate-500">
                        Cette discussion est{" "}
                        {thread.status === "RESOLVED" ? "résolue" : "archivée"}
                    </span>
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
}: {
    message: CommsMessageView;
    isOwn: boolean;
    showAvatar: boolean;
}) {
    // System messages
    if (message.type === "SYSTEM") {
        return (
            <div className="flex justify-center">
                <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                    {message.content}
                </span>
            </div>
        );
    }

    return (
        <div
            className={cn("flex gap-2", isOwn ? "flex-row-reverse" : "flex-row")}
        >
            {/* Avatar */}
            {showAvatar ? (
                <div
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                        isOwn
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-200 text-slate-600"
                    )}
                >
                    {message.author.initials}
                </div>
            ) : (
                <div className="w-8 flex-shrink-0" />
            )}

            {/* Content */}
            <div className={cn("max-w-[75%]", isOwn && "items-end")}>
                {showAvatar && (
                    <div
                        className={cn(
                            "flex items-center gap-2 mb-1",
                            isOwn && "flex-row-reverse"
                        )}
                    >
                        <span className="text-xs font-medium text-slate-700">
                            {message.author.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                            {format(new Date(message.createdAt), "HH:mm", { locale: fr })}
                        </span>
                    </div>
                )}
                <div
                    className={cn(
                        "px-3 py-2 rounded-2xl text-sm",
                        isOwn
                            ? "bg-indigo-500 text-white rounded-br-md"
                            : "bg-slate-100 text-slate-800 rounded-bl-md"
                    )}
                >
                    {message.content}
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

                {/* Attachments */}
                {message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {message.attachments.map((att) => (
                            <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-indigo-600 hover:underline"
                            >
                                <Paperclip className="w-3 h-3" />
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
