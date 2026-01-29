"use client";

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
    Circle,
    CheckCircle2,
    Archive,
    ChevronRight,
    Clock,
    User,
} from "lucide-react";
import type {
    CommsThreadListItem,
    CommsChannelType,
    CommsThreadStatus,
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

const STATUS_ICONS: Record<CommsThreadStatus, typeof Circle> = {
    OPEN: Circle,
    RESOLVED: CheckCircle2,
    ARCHIVED: Archive,
};

const CHANNEL_COLORS: Record<CommsChannelType, { bg: string; text: string; icon: string }> = {
    MISSION: { bg: "bg-indigo-50", text: "text-indigo-700", icon: "text-indigo-500" },
    CLIENT: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500" },
    CAMPAIGN: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500" },
    GROUP: { bg: "bg-violet-50", text: "text-violet-700", icon: "text-violet-500" },
    DIRECT: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
    BROADCAST: { bg: "bg-rose-50", text: "text-rose-700", icon: "text-rose-500" },
};

const STATUS_COLORS: Record<CommsThreadStatus, string> = {
    OPEN: "text-emerald-500",
    RESOLVED: "text-slate-400",
    ARCHIVED: "text-slate-300",
};

// Get display name for a thread (for direct: show the OTHER participant's name, not the current user's)
function getThreadDisplayName(thread: CommsThreadListItem, _currentUserId?: string): string {
    if (thread.channelType === "DIRECT") {
        // Backend sends otherParticipantName = the other person, so each user sees the other's name
        if (thread.otherParticipantName) return thread.otherParticipantName;
        // Fallback: parse subject "Message avec [Name]" (legacy; may show wrong person for recipient)
        if (thread.subject.startsWith("Message avec ")) {
            return thread.subject.replace("Message avec ", "");
        }
    }

    // For other types, show the channel name (mission name, client name, etc.)
    return thread.channelName;
}

// Get the subtitle for the thread
function getThreadSubtitle(thread: CommsThreadListItem): string | null {
    if (thread.channelType === "DIRECT") {
        return "Message direct";
    }
    if (thread.channelType === "BROADCAST") {
        return "Annonce";
    }
    // For mission/client/group, show the subject as subtitle
    return thread.subject !== thread.channelName ? thread.subject : null;
}

export function ThreadList({
    threads,
    selectedId,
    onSelect,
    isLoading,
    currentUserId,
}: ThreadListProps) {
    if (isLoading) {
        return (
            <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="animate-pulse rounded-xl overflow-hidden"
                    >
                        <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-50" />
                    </div>
                ))}
            </div>
        );
    }

    if (threads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-base font-medium text-slate-700 mb-1">
                    Aucune discussion
                </p>
                <p className="text-sm text-slate-500 text-center">
                    Les conversations apparaîtront ici
                </p>
            </div>
        );
    }

    return (
        <div className="p-3 space-y-2">
            {threads.map((thread) => {
                const ChannelIcon = CHANNEL_ICONS[thread.channelType];
                const StatusIcon = STATUS_ICONS[thread.status];
                const channelColors = CHANNEL_COLORS[thread.channelType];
                const isSelected = selectedId === thread.id;
                const hasUnread = thread.unreadCount > 0;

                const displayName = getThreadDisplayName(thread, currentUserId);
                const subtitle = getThreadSubtitle(thread);
                const isDirectMessage = thread.channelType === "DIRECT";

                return (
                    <button
                        key={thread.id}
                        onClick={() => onSelect(thread)}
                        className={cn(
                            "w-full text-left group relative rounded-xl transition-all duration-200",
                            "hover:shadow-md hover:shadow-slate-200/50",
                            isSelected
                                ? "bg-gradient-to-r from-indigo-50 to-indigo-100/50 ring-2 ring-indigo-500/20 shadow-md"
                                : hasUnread
                                    ? "bg-gradient-to-r from-blue-50/50 to-white hover:from-blue-50/70"
                                    : "bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200"
                        )}
                    >
                        {/* Active indicator */}
                        {isSelected && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-indigo-500 rounded-r-full" />
                        )}

                        <div className="p-4">
                            {/* Header row */}
                            <div className="flex items-start gap-3">
                                {/* Avatar/Icon */}
                                {isDirectMessage ? (
                                    // For direct messages, show a user avatar with initials
                                    <div
                                        className={cn(
                                            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
                                            "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 font-semibold text-sm"
                                        )}
                                    >
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                ) : (
                                    <div
                                        className={cn(
                                            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
                                            channelColors.bg
                                        )}
                                    >
                                        <ChannelIcon className={cn("w-5 h-5", channelColors.icon)} />
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Channel type indicator & status */}
                                    <div className="flex items-center gap-2 mb-1">
                                        {!isDirectMessage && (
                                            <span className={cn(
                                                "text-[11px] font-medium px-1.5 py-0.5 rounded-full",
                                                channelColors.bg, channelColors.text
                                            )}>
                                                {thread.channelType === "MISSION" && "Mission"}
                                                {thread.channelType === "CLIENT" && "Client"}
                                                {thread.channelType === "GROUP" && "Groupe"}
                                                {thread.channelType === "CAMPAIGN" && "Campagne"}
                                                {thread.channelType === "BROADCAST" && "Annonce"}
                                            </span>
                                        )}
                                        {thread.isBroadcast && (
                                            <span className="text-[10px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                                                Annonce
                                            </span>
                                        )}
                                        {thread.status !== "OPEN" && (
                                            <StatusIcon className={cn("w-3.5 h-3.5", STATUS_COLORS[thread.status])} />
                                        )}
                                    </div>

                                    {/* Display name (person name for direct messages, channel name for others) */}
                                    <h4
                                        className={cn(
                                            "text-sm truncate leading-snug",
                                            hasUnread
                                                ? "font-semibold text-slate-900"
                                                : "font-medium text-slate-700"
                                        )}
                                    >
                                        {displayName}
                                    </h4>

                                    {/* Subtitle if exists (subject for non-direct) */}
                                    {subtitle && !isDirectMessage && (
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {subtitle}
                                        </p>
                                    )}

                                    {/* Last message preview */}
                                    {thread.lastMessage && (
                                        <p className="text-xs text-slate-500 truncate mt-1.5 leading-relaxed">
                                            {isDirectMessage ? (
                                                // For direct messages, don't show author name as it's obvious
                                                thread.lastMessage.content
                                            ) : (
                                                <>
                                                    <span className="font-medium text-slate-600">
                                                        {thread.lastMessage.authorName}:
                                                    </span>{" "}
                                                    {thread.lastMessage.content}
                                                </>
                                            )}
                                        </p>
                                    )}
                                </div>

                                {/* Right side: time & unread badge */}
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDistanceToNow(new Date(thread.updatedAt), {
                                            addSuffix: false,
                                            locale: fr,
                                        })}
                                    </span>
                                    {hasUnread ? (
                                        <span className="min-w-[22px] h-[22px] rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-[11px] font-bold flex items-center justify-center px-1.5 shadow-sm shadow-indigo-500/25">
                                            {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                                        </span>
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                                    )}
                                </div>
                            </div>

                            {/* Footer: participants & messages (hide for direct) */}
                            {!isDirectMessage && (
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100/80 ml-14">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                        <Users className="w-3.5 h-3.5" />
                                        <span>
                                            {thread.participantCount} participant
                                            {thread.participantCount > 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        <span>
                                            {thread.messageCount} message
                                            {thread.messageCount > 1 ? "s" : ""}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

export default ThreadList;
