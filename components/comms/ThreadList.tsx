"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
    Target,
    Building2,
    FileText,
    Users,
    MessageCircle,
    Megaphone,
} from "lucide-react";
import type {
    CommsThreadListItem,
    CommsChannelType,
} from "@/lib/comms/types";

interface ThreadListProps {
    threads: CommsThreadListItem[];
    selectedId?: string;
    onSelect: (thread: CommsThreadListItem) => void;
    isLoading?: boolean;
    currentUserId?: string;
}

const CHANNEL_ICONS: Record<CommsChannelType, typeof Target> = {
    MISSION: Target,
    CLIENT: Building2,
    CAMPAIGN: FileText,
    GROUP: Users,
    DIRECT: MessageCircle,
    BROADCAST: Megaphone,
};

const CHANNEL_TAGS: Record<CommsChannelType, string> = {
    MISSION: "Mission",
    CLIENT: "Client",
    CAMPAIGN: "Campagne",
    GROUP: "Groupe",
    DIRECT: "Direct",
    BROADCAST: "Inbound",
};

function getThreadDisplayName(thread: CommsThreadListItem, _currentUserId?: string): string {
    if (thread.channelType === "DIRECT") {
        if (thread.otherParticipantName) return thread.otherParticipantName;
        if (thread.subject.startsWith("Message avec ")) {
            return thread.subject.replace("Message avec ", "");
        }
    }
    return thread.channelName;
}

function formatShortTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `${diffDays}j`;
    return formatDistanceToNow(date, { addSuffix: false, locale: fr });
}

// ── Skeleton loader ──
function ThreadListSkeleton() {
    return (
        <div className="flex flex-col">
            {[1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    className="flex items-start gap-3 p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 animate-pulse"
                    style={{ animationDelay: `${i * 80}ms` }}
                >
                    <div className="size-9 sm:size-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="flex-1 space-y-2 py-0.5">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Thread item (memoized) ──
const ThreadItem = memo(function ThreadItem({
    thread,
    isSelected,
    onSelect,
    currentUserId,
    index,
}: {
    thread: CommsThreadListItem;
    isSelected: boolean;
    onSelect: (thread: CommsThreadListItem) => void;
    currentUserId?: string;
    index: number;
}) {
    const ChannelIcon = CHANNEL_ICONS[thread.channelType];
    const hasUnread = thread.unreadCount > 0;
    const displayName = getThreadDisplayName(thread, currentUserId);
    const lastPreview = thread.lastMessage
        ? thread.channelType === "DIRECT"
            ? thread.lastMessage.content
            : `${thread.lastMessage.authorName}: ${thread.lastMessage.content}`
        : null;
    const updatedDate = new Date(thread.updatedAt);

    return (
        <button
            onClick={() => onSelect(thread)}
            className={cn(
                "w-full text-left flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 border-b border-slate-100/80 dark:border-slate-800/80",
                "cursor-pointer relative group",
                "transition-all duration-200 ease-out",
                "hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                "active:scale-[0.995]",
                isSelected && "bg-indigo-50/60 dark:bg-indigo-500/10 hover:bg-indigo-50/80 dark:hover:bg-indigo-500/15",
                !isSelected && hasUnread && "bg-slate-50/40 dark:bg-slate-800/20"
            )}
            style={{
                animation: `thread-item-in 0.25s ease-out ${Math.min(index * 30, 300)}ms both`,
            }}
        >
            {/* Active bar */}
            <div
                className={cn(
                    "absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full transition-all duration-300",
                    isSelected
                        ? "bg-indigo-500 scale-y-100"
                        : "bg-transparent scale-y-0"
                )}
            />

            {/* Avatar */}
            <div
                className={cn(
                    "size-9 sm:size-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-105",
                    thread.channelType === "DIRECT"
                        ? "bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/50 text-indigo-600 dark:text-indigo-400 font-semibold text-xs sm:text-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                )}
            >
                {thread.channelType === "DIRECT" ? (
                    displayName.charAt(0).toUpperCase()
                ) : (
                    <ChannelIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5 gap-2">
                    <p
                        className={cn(
                            "text-[13px] sm:text-sm truncate pr-1",
                            hasUnread
                                ? "font-semibold text-slate-900 dark:text-white"
                                : "font-medium text-slate-800 dark:text-slate-100"
                        )}
                    >
                        {displayName}
                    </p>
                    {hasUnread ? (
                        <span className="size-2 rounded-full bg-emerald-500 shrink-0 mt-1.5 animate-pulse" />
                    ) : (
                        <span
                            className={cn(
                                "text-[11px] shrink-0 tabular-nums",
                                isSelected
                                    ? "text-indigo-500 dark:text-indigo-400 font-medium"
                                    : "text-slate-400 font-normal"
                            )}
                        >
                            {formatShortTime(updatedDate)}
                        </span>
                    )}
                </div>

                {lastPreview && (
                    <p
                        className={cn(
                            "text-xs truncate leading-relaxed",
                            hasUnread
                                ? "text-slate-700 dark:text-slate-300 font-medium"
                                : "text-slate-500 dark:text-slate-400"
                        )}
                    >
                        {lastPreview}
                    </p>
                )}

                {/* Tags */}
                <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {thread.channelType !== "DIRECT" && (
                        <span className="text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 text-slate-500 dark:text-slate-400">
                            {CHANNEL_TAGS[thread.channelType]}
                        </span>
                    )}
                    {thread.isBroadcast && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded px-1.5 py-0.5 font-medium">
                            Annonce
                        </span>
                    )}
                    {thread.status === "OPEN" && thread.unreadCount > 0 && (
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded px-1.5 py-0.5 font-medium">
                            Non lu
                        </span>
                    )}
                </div>
            </div>

            {/* Unread badge */}
            {hasUnread && (
                <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold bg-indigo-500 text-white mt-1 shadow-sm shadow-indigo-500/30">
                    {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                </span>
            )}

            {/* Thread item animation */}
            <style>{`
                @keyframes thread-item-in {
                    from { opacity: 0; transform: translateX(-8px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </button>
    );
});

// ── Main ThreadList ──
export function ThreadList({
    threads,
    selectedId,
    onSelect,
    isLoading,
    currentUserId,
}: ThreadListProps) {
    if (isLoading) return <ThreadListSkeleton />;

    if (threads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
                </div>
                <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Aucune discussion
                </p>
                <p className="text-xs sm:text-sm text-slate-500 text-center">
                    Les conversations apparaîtront ici
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {threads.map((thread, index) => (
                <ThreadItem
                    key={thread.id}
                    thread={thread}
                    isSelected={selectedId === thread.id}
                    onSelect={onSelect}
                    currentUserId={currentUserId}
                    index={index}
                />
            ))}
        </div>
    );
}

export default ThreadList;
