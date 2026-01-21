"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    Inbox,
    Send,
    FileText,
    Archive,
    Trash2,
    Star,
    Mail,
    Tag,
    ChevronRight,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface FolderNavProps {
    selectedFolder: string;
    onSelectFolder: (folder: string) => void;
    mailboxId?: string;
}

interface FolderCounts {
    inbox: number;
    unread: number;
    sent: number;
    drafts: number;
    archive: number;
    trash: number;
    starred: number;
}

// ============================================
// FOLDER NAV COMPONENT
// ============================================

export function FolderNav({
    selectedFolder,
    onSelectFolder,
    mailboxId,
}: FolderNavProps) {
    const [counts, setCounts] = useState<FolderCounts>({
        inbox: 0,
        unread: 0,
        sent: 0,
        drafts: 0,
        archive: 0,
        trash: 0,
        starred: 0,
    });
    const [customLabels, setCustomLabels] = useState<string[]>([]);
    const [showLabels, setShowLabels] = useState(true);

    // Fetch folder counts
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const params = mailboxId ? `?mailboxId=${mailboxId}` : "";
                // In a real app, you'd have a dedicated endpoint for counts
                // For now, we'll estimate from the threads API
                const [inboxRes, unreadRes] = await Promise.all([
                    fetch(`/api/email/threads${params}&folder=inbox&limit=1`),
                    fetch(`/api/email/threads${params}&folder=unread&limit=1`),
                ]);
                
                const [inboxJson, unreadJson] = await Promise.all([
                    inboxRes.json(),
                    unreadRes.json(),
                ]);

                setCounts(prev => ({
                    ...prev,
                    inbox: inboxJson.data?.total || 0,
                    unread: unreadJson.data?.total || 0,
                }));
            } catch (error) {
                console.error("Failed to fetch folder counts:", error);
            }
        };

        fetchCounts();
    }, [mailboxId]);

    const folders = [
        {
            id: "inbox",
            label: "Boîte de réception",
            icon: Inbox,
            count: counts.unread,
            showCount: counts.unread > 0,
        },
        {
            id: "starred",
            label: "Favoris",
            icon: Star,
            count: counts.starred,
            showCount: false,
        },
        {
            id: "sent",
            label: "Envoyés",
            icon: Send,
            count: counts.sent,
            showCount: false,
        },
        {
            id: "drafts",
            label: "Brouillons",
            icon: FileText,
            count: counts.drafts,
            showCount: counts.drafts > 0,
        },
        {
            id: "archive",
            label: "Archives",
            icon: Archive,
            count: counts.archive,
            showCount: false,
        },
        {
            id: "trash",
            label: "Corbeille",
            icon: Trash2,
            count: counts.trash,
            showCount: false,
        },
    ];

    return (
        <div className="py-2">
            {/* Main Folders */}
            <nav className="space-y-0.5 px-2">
                {folders.map((folder) => (
                    <button
                        key={folder.id}
                        onClick={() => onSelectFolder(folder.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            selectedFolder === folder.id
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                    >
                        <folder.icon className={cn(
                            "w-4 h-4 flex-shrink-0",
                            selectedFolder === folder.id ? "text-indigo-600" : "text-slate-400"
                        )} />
                        <span className="flex-1 text-left truncate">{folder.label}</span>
                        {folder.showCount && folder.count > 0 && (
                            <span className={cn(
                                "px-2 py-0.5 text-xs font-semibold rounded-full",
                                selectedFolder === folder.id
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-200 text-slate-600"
                            )}>
                                {folder.count > 99 ? "99+" : folder.count}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Labels Section */}
            {customLabels.length > 0 && (
                <div className="mt-4 px-2">
                    <button
                        onClick={() => setShowLabels(!showLabels)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700"
                    >
                        <ChevronRight className={cn(
                            "w-3 h-3 transition-transform",
                            showLabels && "rotate-90"
                        )} />
                        Labels
                    </button>
                    {showLabels && (
                        <div className="space-y-0.5 mt-1">
                            {customLabels.map((label) => (
                                <button
                                    key={label}
                                    onClick={() => onSelectFolder(`label:${label}`)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                        selectedFolder === `label:${label}`
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    )}
                                >
                                    <Tag className="w-4 h-4 text-slate-400" />
                                    <span className="flex-1 text-left truncate">{label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Quick Filters */}
            <div className="mt-4 px-2">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Filtres rapides
                </div>
                <div className="space-y-0.5 mt-1">
                    <button
                        onClick={() => onSelectFolder("unread")}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            selectedFolder === "unread"
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                    >
                        <Mail className={cn(
                            "w-4 h-4 flex-shrink-0",
                            selectedFolder === "unread" ? "text-indigo-600" : "text-slate-400"
                        )} />
                        <span className="flex-1 text-left">Non lus</span>
                        {counts.unread > 0 && (
                            <span className={cn(
                                "px-2 py-0.5 text-xs font-semibold rounded-full",
                                selectedFolder === "unread"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-indigo-100 text-indigo-700"
                            )}>
                                {counts.unread}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default FolderNav;
