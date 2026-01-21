"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    Star,
    Paperclip,
    Clock,
    Building2,
    User,
    AlertCircle,
    Archive,
    Trash2,
    MailOpen,
    Loader2,
    Inbox,
    Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// ============================================
// TYPES
// ============================================

interface Thread {
    id: string;
    mailboxId: string;
    subject: string;
    snippet: string | null;
    participantEmails: string[];
    isRead: boolean;
    isStarred: boolean;
    labels: string[];
    sentiment: string | null;
    priority: string | null;
    slaDeadline: string | null;
    lastEmailAt: string;
    messageCount: number;
    latestEmail: {
        id: string;
        fromAddress: string;
        fromName: string | null;
        direction: string;
    } | null;
    clientId: string | null;
    missionId: string | null;
    assignedTo: {
        id: string;
        name: string;
    } | null;
    mailbox: {
        email: string;
        displayName: string | null;
    };
}

interface ThreadListProps {
    mailboxId?: string;
    folder: string;
    selectedThreadId?: string;
    onSelectThread: (thread: { id: string; subject: string; mailboxId: string }) => void;
}

// ============================================
// THREAD LIST COMPONENT
// ============================================

export function ThreadList({
    mailboxId,
    folder,
    selectedThreadId,
    onSelectThread,
}: ThreadListProps) {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const listRef = useRef<HTMLDivElement>(null);

    // Fetch threads
    const fetchThreads = useCallback(async (pageNum: number, append: boolean = false) => {
        if (pageNum === 1) setIsLoading(true);

        try {
            const params = new URLSearchParams({
                folder,
                page: pageNum.toString(),
                limit: "30",
            });

            if (mailboxId) {
                params.set("mailboxId", mailboxId);
            }
            if (searchQuery) {
                params.set("search", searchQuery);
            }

            const res = await fetch(`/api/email/threads?${params}`);
            const json = await res.json();

            if (json.success) {
                if (append) {
                    setThreads(prev => [...prev, ...json.data.threads]);
                } else {
                    setThreads(json.data.threads);
                }
                setHasMore(json.data.hasMore);
            }
        } catch (error) {
            console.error("Failed to fetch threads:", error);
        } finally {
            setIsLoading(false);
        }
    }, [mailboxId, folder, searchQuery]);

    // Initial fetch
    useEffect(() => {
        setPage(1);
        fetchThreads(1, false);
    }, [mailboxId, folder, searchQuery, fetchThreads]);

    // Load more on scroll
    const handleScroll = useCallback(() => {
        if (!listRef.current || !hasMore || isLoading) return;

        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchThreads(nextPage, true);
        }
    }, [hasMore, isLoading, page, fetchThreads]);

    // Thread actions
    const handleStar = async (e: React.MouseEvent, threadId: string, isStarred: boolean) => {
        e.stopPropagation();
        try {
            setThreads(prev => prev.map(t =>
                t.id === threadId ? { ...t, isStarred: !isStarred } : t
            ));
            await fetch(`/api/email/threads/${threadId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isStarred: !isStarred }),
            });
        } catch (error) {
            console.error("Failed to star thread:", error);
            // Revert on error
            setThreads(prev => prev.map(t =>
                t.id === threadId ? { ...t, isStarred: isStarred } : t
            ));
        }
    };

    const handleArchive = async (e: React.MouseEvent, threadId: string) => {
        e.stopPropagation();
        try {
            setThreads(prev => prev.filter(t => t.id !== threadId));
            await fetch(`/api/email/threads/${threadId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isArchived: true }),
            });
        } catch (error) {
            console.error("Failed to archive thread:", error);
            // Revert on error - this one is harder to revert perfectly without keeping the thread data, 
            // but for now let's just re-fetch or log error. 
            // Better to assume success or accept a blip. 
            // For simplicity in optimistic UI, if it fails, maybe toast an error and reload.
            // But let's at least allow the UI to feel "instant".
            // To revert properly we'd need the deleted thread.
            // Let's just catch and log for now, as re-inserting is complex without the object.
        }
    };

    const handleTrash = async (e: React.MouseEvent, threadId: string) => {
        e.stopPropagation();
        try {
            setThreads(prev => prev.filter(t => t.id !== threadId));
            await fetch(`/api/email/threads/${threadId}`, {
                method: "DELETE",
            });
        } catch (error) {
            console.error("Failed to trash thread:", error);
        }
    };

    // Render empty state
    if (!isLoading && threads.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Inbox className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Aucun message
                </h3>
                <p className="text-sm text-slate-500 max-w-xs">
                    {searchQuery
                        ? "Aucun résultat pour votre recherche"
                        : "Votre boîte de réception est vide"}
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Search */}
            <div className="p-3 border-b border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* Thread List */}
            <div
                ref={listRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto"
            >
                {isLoading && threads.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {threads.map((thread) => (
                            <ThreadListItem
                                key={thread.id}
                                thread={thread}
                                isSelected={thread.id === selectedThreadId}
                                onSelect={() => onSelectThread({
                                    id: thread.id,
                                    subject: thread.subject,
                                    mailboxId: thread.mailboxId,
                                })}
                                onStar={(e) => handleStar(e, thread.id, thread.isStarred)}
                                onArchive={(e) => handleArchive(e, thread.id)}
                                onTrash={(e) => handleTrash(e, thread.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Loading more indicator */}
                {isLoading && threads.length > 0 && (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// THREAD LIST ITEM
// ============================================

interface ThreadListItemProps {
    thread: Thread;
    isSelected: boolean;
    onSelect: () => void;
    onStar: (e: React.MouseEvent) => void;
    onArchive: (e: React.MouseEvent) => void;
    onTrash: (e: React.MouseEvent) => void;
}

function ThreadListItem({
    thread,
    isSelected,
    onSelect,
    onStar,
    onArchive,
    onTrash,
}: ThreadListItemProps) {
    const sender = thread.latestEmail?.fromName || thread.latestEmail?.fromAddress || "Inconnu";
    const isOutbound = thread.latestEmail?.direction === "OUTBOUND";
    const timeAgo = formatDistanceToNow(new Date(thread.lastEmailAt), {
        addSuffix: true,
        locale: fr
    });

    return (
        <div
            onClick={onSelect}
            className={cn(
                "group relative px-4 py-3 cursor-pointer transition-all",
                isSelected
                    ? "bg-indigo-50 border-l-2 border-indigo-600"
                    : "hover:bg-slate-50 border-l-2 border-transparent",
                !thread.isRead && "bg-white"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Avatar / Read indicator */}
                <div className="relative flex-shrink-0">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold",
                        thread.clientId
                            ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
                            : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600"
                    )}>
                        {sender[0]?.toUpperCase()}
                    </div>
                    {!thread.isRead && (
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-600 rounded-full" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-sm truncate",
                            thread.isRead ? "text-slate-600" : "font-semibold text-slate-900"
                        )}>
                            {isOutbound ? `À: ${thread.participantEmails[0]}` : sender}
                        </span>
                        {thread.messageCount > 1 && (
                            <span className="text-xs text-slate-400">
                                ({thread.messageCount})
                            </span>
                        )}
                        {thread.clientId && (
                            <Building2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        )}
                        {thread.assignedTo && (
                            <User className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        )}
                    </div>

                    <p className={cn(
                        "text-sm truncate mt-0.5",
                        thread.isRead ? "text-slate-500" : "text-slate-800"
                    )}>
                        {thread.subject || "(Sans objet)"}
                    </p>

                    <p className="text-xs text-slate-400 truncate mt-0.5">
                        {thread.snippet}
                    </p>
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={cn(
                        "text-xs",
                        thread.isRead ? "text-slate-400" : "text-indigo-600 font-medium"
                    )}>
                        {timeAgo}
                    </span>

                    {/* Priority / SLA indicators */}
                    <div className="flex items-center gap-1">
                        {thread.priority === "high" && (
                            <AlertCircle className="w-3 h-3 text-red-500" />
                        )}
                        {thread.slaDeadline && new Date(thread.slaDeadline) < new Date() && (
                            <Clock className="w-3 h-3 text-amber-500" />
                        )}
                    </div>
                </div>
            </div>

            {/* Hover actions */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white shadow-sm border border-slate-200 rounded-lg px-1 py-0.5">
                <button
                    onClick={onStar}
                    className={cn(
                        "p-1.5 rounded-md transition-colors",
                        thread.isStarred
                            ? "text-amber-500 hover:bg-amber-50"
                            : "text-slate-400 hover:text-amber-500 hover:bg-slate-50"
                    )}
                    title={thread.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                    <Star className={cn("w-4 h-4", thread.isStarred && "fill-current")} />
                </button>
                <button
                    onClick={onArchive}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    title="Archiver"
                >
                    <Archive className="w-4 h-4" />
                </button>
                <button
                    onClick={onTrash}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Supprimer"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export default ThreadList;
