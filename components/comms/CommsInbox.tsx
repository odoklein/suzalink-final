"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useCommsRealtime } from "@/hooks/useCommsRealtime";
import type { CommsRealtimePayload } from "@/lib/comms/events";
import {
    MessageSquare,
    Plus,
    Filter,
    Search,
    RefreshCw,
    Target,
    Building2,
    FileText,
    Users,
    MessageCircle,
    Megaphone,
    X,
} from "lucide-react";
import { Button, Input, EmptyState } from "@/components/ui";
import { ThreadList } from "./ThreadList";
import { ThreadView } from "./ThreadView";
import { NewThreadModal } from "./NewThreadModal";
import { SearchPanel } from "./SearchPanel";
import type {
    CommsThreadListItem,
    CommsThreadView,
    CommsInboxStats,
    CommsInboxFilters,
    CommsChannelType,
    CommsThreadStatus,
    CreateThreadRequest,
} from "@/lib/comms/types";

interface CommsInboxProps {
    className?: string;
}

const FILTER_OPTIONS: {
    type: CommsChannelType | "all";
    label: string;
    icon: typeof Target;
}[] = [
        { type: "all", label: "Tous", icon: MessageSquare },
        { type: "MISSION", label: "Missions", icon: Target },
        { type: "CLIENT", label: "Clients", icon: Building2 },
        { type: "CAMPAIGN", label: "Campagnes", icon: FileText },
        { type: "GROUP", label: "Groupes", icon: Users },
        { type: "DIRECT", label: "Directs", icon: MessageCircle },
        { type: "BROADCAST", label: "Annonces", icon: Megaphone },
    ];

export function CommsInbox({ className }: CommsInboxProps) {
    const { data: session } = useSession();
    const [threads, setThreads] = useState<CommsThreadListItem[]>([]);
    const [selectedThread, setSelectedThread] = useState<CommsThreadView | null>(
        null
    );
    const [stats, setStats] = useState<CommsInboxStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showNewThreadModal, setShowNewThreadModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showSearchPanel, setShowSearchPanel] = useState(false);

    // Filters
    const [filters, setFilters] = useState<CommsInboxFilters>({});
    const [searchQuery, setSearchQuery] = useState("");
    const selectedThreadIdRef = useRef<string | null>(null);
    selectedThreadIdRef.current = selectedThread?.id ?? null;

    // Typing indicators per thread
    const [typingByThread, setTypingByThread] = useState<Record<string, string>>({});
    const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});



    // Fetch threads
    const fetchThreads = useCallback(async (refresh = false) => {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const params = new URLSearchParams();
            if (filters.type) params.set("type", filters.type);
            if (filters.status) params.set("status", filters.status);
            if (filters.unreadOnly) params.set("unreadOnly", "true");
            if (searchQuery) params.set("search", searchQuery);

            const res = await fetch(`/api/comms/threads?${params}`);
            if (res.ok) {
                const data = await res.json();
                setThreads(data.threads);
            }
        } catch (error) {
            console.error("Error fetching threads:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [filters, searchQuery]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/comms/inbox/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    }, []);

    // Fetch thread details
    const fetchThreadDetails = useCallback(async (threadId: string) => {
        try {
            const res = await fetch(`/api/comms/threads/${threadId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedThread(data);
            }
        } catch (error) {
            console.error("Error fetching thread:", error);
        }
    }, []);

    // Real-time: refetch on message/thread events; track typing
    const handleRealtimeEvent = useCallback(
        (payload: CommsRealtimePayload) => {
            const tid = payload.threadId;
            if (payload.type === "typing_start" && tid && payload.userName) {
                if (typingTimeoutRef.current[tid]) {
                    clearTimeout(typingTimeoutRef.current[tid]);
                }
                setTypingByThread((prev) => ({ ...prev, [tid]: payload.userName! }));
                typingTimeoutRef.current[tid] = setTimeout(() => {
                    setTypingByThread((prev) => {
                        const next = { ...prev };
                        delete next[tid];
                        return next;
                    });
                    delete typingTimeoutRef.current[tid];
                }, 5000);
            } else if (payload.type === "typing_stop" && tid) {
                setTypingByThread((prev) => {
                    const next = { ...prev };
                    delete next[tid];
                    return next;
                });
                if (typingTimeoutRef.current[tid]) {
                    clearTimeout(typingTimeoutRef.current[tid]);
                    delete typingTimeoutRef.current[tid];
                }
            }
            if (!tid) return;
            if (
                payload.type === "message_created" ||
                payload.type === "message_updated" ||
                payload.type === "message_deleted" ||
                payload.type === "thread_status_updated"
            ) {
                fetchThreads(true);
                fetchStats();
                if (selectedThreadIdRef.current === tid) {
                    fetchThreadDetails(tid);
                }
            }
        },
        [fetchThreads, fetchStats, fetchThreadDetails]
    );

    useCommsRealtime({
        enabled: !!session?.user?.id,
        onEvent: handleRealtimeEvent,
    });

    // Initial load
    useEffect(() => {
        fetchThreads();
        fetchStats();
    }, [fetchThreads, fetchStats]);

    // Handle thread selection
    const handleSelectThread = (thread: CommsThreadListItem) => {
        fetchThreadDetails(thread.id);
    };

    // Handle close thread panel
    const handleCloseThread = () => {
        setSelectedThread(null);
        fetchThreads(true); // Refresh to update read status
    };

    // Handle status change
    const handleStatusChange = async (status: CommsThreadStatus) => {
        if (!selectedThread) return;

        try {
            await fetch(`/api/comms/threads/${selectedThread.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            fetchThreadDetails(selectedThread.id);
            fetchThreads(true);
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    // Handle send message
    const handleSendMessage = async (
        content: string,
        opts?: { mentionIds?: string[]; files?: File[] }
    ) => {
        if (!selectedThread) return;

        const hasFiles = !!opts?.files?.length;
        if (hasFiles) {
            const form = new FormData();
            form.set("content", content);
            if (opts.mentionIds?.length) {
                form.set("mentionIds", JSON.stringify(opts.mentionIds));
            }
            for (const f of opts.files!) {
                form.append("files", f);
            }
            await fetch(`/api/comms/threads/${selectedThread.id}/messages`, {
                method: "POST",
                body: form,
            });
        } else {
            await fetch(`/api/comms/threads/${selectedThread.id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    mentionIds: opts?.mentionIds ?? [],
                }),
            });
        }

        fetchThreadDetails(selectedThread.id);
        fetchStats();
    };

    // Handle create thread
    const handleCreateThread = async (request: CreateThreadRequest) => {
        const res = await fetch("/api/comms/threads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });

        if (res.ok) {
            const { id } = await res.json();
            fetchThreads(true);
            fetchStats();
            fetchThreadDetails(id);
        }
    };

    // Handle filter change
    const handleFilterChange = (type: CommsChannelType | "all") => {
        setFilters((prev) => ({
            ...prev,
            type: type === "all" ? undefined : type,
        }));
    };

    return (
        <div className={cn("flex h-full bg-white rounded-2xl border border-slate-200 overflow-hidden", className)}>
            {/* Left panel: Thread list */}
            <div className="w-96 flex flex-col border-r border-slate-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Messages
                            </h2>
                            {stats && stats.totalUnread > 0 && (
                                <span className="px-2 py-0.5 text-xs font-medium text-white bg-indigo-500 rounded-full">
                                    {stats.totalUnread}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">

                            <button
                                onClick={async () => {
                                    if (isSyncing) return;
                                    setIsSyncing(true);
                                    try {
                                        await fetch('/api/email/sync', { method: 'POST' });
                                        // Wait a bit for sync to actually fetch something (optimistic)
                                        // But ideally we just trigger it and let user refresh or use SWR/polling
                                        // For now, let's wait 2s then refresh list
                                        await new Promise(r => setTimeout(r, 2000));
                                        await fetchThreads(true);
                                    } catch (e) {
                                        console.error('Sync failed', e);
                                    } finally {
                                        setIsSyncing(false);
                                    }
                                }}
                                className={cn(
                                    "p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors",
                                    isSyncing && "animate-spin text-indigo-500"
                                )}
                                title="Synchroniser les emails"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowSearchPanel(true)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Recherche avancée"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                            <Button
                                size="sm"
                                onClick={() => setShowNewThreadModal(true)}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Nouveau
                            </Button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher..."
                            className="pl-9 h-9 text-sm"
                        />
                    </div>

                    {/* Filter pills */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                        {FILTER_OPTIONS.map((opt) => (
                            <button
                                key={opt.type}
                                onClick={() => handleFilterChange(opt.type)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                                    (filters.type === opt.type || (opt.type === "all" && !filters.type))
                                        ? "bg-indigo-100 text-indigo-700"
                                        : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <opt.icon className="w-3.5 h-3.5" />
                                {opt.label}
                                {stats && opt.type !== "all" && stats.unreadByType[opt.type as CommsChannelType] > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500 text-white rounded-full">
                                        {stats.unreadByType[opt.type as CommsChannelType]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Thread list */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="space-y-2 p-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="animate-pulse bg-slate-100 rounded-xl h-24"
                                />
                            ))}
                        </div>
                    ) : threads.length === 0 ? (
                        <EmptyState
                            icon={MessageSquare}
                            title="Aucune discussion"
                            description="Créez une nouvelle discussion pour commencer"
                            variant="inline"
                        />
                    ) : (
                        <ThreadList
                            threads={threads}
                            selectedId={selectedThread?.id}
                            onSelect={handleSelectThread}
                        />
                    )}
                </div>
            </div>

            {/* Right panel: Thread view */}
            <div className="flex-1 flex flex-col">
                {selectedThread ? (
                    <ThreadView
                        thread={selectedThread}
                        onClose={handleCloseThread}
                        onStatusChange={handleStatusChange}
                        onSendMessage={handleSendMessage}
                        onReactionToggle={() => selectedThread && fetchThreadDetails(selectedThread.id)}
                        currentUserId={session?.user?.id || ""}
                        typingUserName={typingByThread[selectedThread.id]}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                Sélectionnez une discussion
                            </h3>
                            <p className="text-sm text-slate-500 max-w-sm">
                                Choisissez une discussion dans la liste ou créez-en une nouvelle
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* New thread modal */}
            <NewThreadModal
                isOpen={showNewThreadModal}
                onClose={() => setShowNewThreadModal(false)}
                onSubmit={handleCreateThread}
                userRole={session?.user?.role || ""}
            />

            {/* Search panel */}
            <SearchPanel
                isOpen={showSearchPanel}
                onClose={() => setShowSearchPanel(false)}
                onResultClick={(threadId, messageId) => {
                    fetchThreadDetails(threadId);
                    setShowSearchPanel(false);
                }}
            />
        </div >
    );
}

export default CommsInbox;
