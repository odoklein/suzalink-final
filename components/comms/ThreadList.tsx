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

const CHANNEL_COLORS: Record<CommsChannelType, string> = {
    MISSION: "text-indigo-500 bg-indigo-50",
    CLIENT: "text-emerald-500 bg-emerald-50",
    CAMPAIGN: "text-amber-500 bg-amber-50",
    GROUP: "text-violet-500 bg-violet-50",
    DIRECT: "text-blue-500 bg-blue-50",
    BROADCAST: "text-rose-500 bg-rose-50",
};

export function ThreadList({
    threads,
    selectedId,
    onSelect,
    isLoading,
}: ThreadListProps) {
    if (isLoading) {
        return (
            <div className="space-y-2 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="animate-pulse bg-slate-100 rounded-xl h-24"
                    />
                ))}
            </div>
        );
    }

    if (threads.length === 0) {
        return (
            <div className="text-center py-12 px-4">
                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                    Aucune discussion pour le moment
                </p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-100">
            {threads.map((thread) => {
                const ChannelIcon = CHANNEL_ICONS[thread.channelType];
                const StatusIcon = STATUS_ICONS[thread.status];
                const isSelected = selectedId === thread.id;
                const hasUnread = thread.unreadCount > 0;

                return (
                    <button
                        key={thread.id}
                        onClick={() => onSelect(thread)}
                        className={cn(
                            "w-full text-left p-4 hover:bg-slate-50 transition-colors",
                            isSelected && "bg-indigo-50/50 hover:bg-indigo-50/70",
                            hasUnread && "bg-blue-50/30"
                        )}
                    >
                        {/* Header row */}
                        <div className="flex items-start gap-3">
                            {/* Channel icon */}
                            <div
                                className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                                    CHANNEL_COLORS[thread.channelType]
                                )}
                            >
                                <ChannelIcon className="w-4 h-4" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {/* Channel name & status */}
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs text-slate-500 truncate">
                                        {thread.channelName}
                                    </span>
                                    {thread.isBroadcast && (
                                        <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                                            Annonce
                                        </span>
                                    )}
                                    {thread.status !== "OPEN" && (
                                        <StatusIcon className="w-3 h-3 text-slate-400" />
                                    )}
                                </div>

                                {/* Subject */}
                                <h4
                                    className={cn(
                                        "text-[13px] truncate",
                                        hasUnread
                                            ? "font-semibold text-slate-900"
                                            : "font-medium text-slate-700"
                                    )}
                                >
                                    {thread.subject}
                                </h4>

                                {/* Last message preview */}
                                {thread.lastMessage && (
                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                        <span className="font-medium">
                                            {thread.lastMessage.authorName}:
                                        </span>{" "}
                                        {thread.lastMessage.content}
                                    </p>
                                )}
                            </div>

                            {/* Right side: time & unread badge */}
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-[11px] text-slate-400">
                                    {formatDistanceToNow(new Date(thread.updatedAt), {
                                        addSuffix: false,
                                        locale: fr,
                                    })}
                                </span>
                                {hasUnread && (
                                    <span className="min-w-[20px] h-5 rounded-full bg-indigo-500 text-white text-[11px] font-medium flex items-center justify-center px-1.5">
                                        {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Footer: participants */}
                        <div className="flex items-center gap-2 mt-2 ml-12">
                            <span className="text-[11px] text-slate-400">
                                {thread.participantCount} participant
                                {thread.participantCount > 1 ? "s" : ""}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-[11px] text-slate-400">
                                {thread.messageCount} message
                                {thread.messageCount > 1 ? "s" : ""}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

export default ThreadList;
