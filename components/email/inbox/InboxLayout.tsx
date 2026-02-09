"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { MailboxSwitcher } from "./MailboxSwitcher";
import { FolderNav } from "./FolderNav";
import { ThreadList } from "./ThreadList";
import { ThreadView } from "./ThreadView";
import { EmailComposer } from "./EmailComposer";
import { EmailOnboarding } from "./EmailOnboarding";
import { PanelLeftClose, PanelLeftOpen, Pencil, Loader2, ArrowLeft } from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface InboxLayoutProps {
    initialMailboxId?: string;
    initialFolder?: string;
    showTeamInbox?: boolean;
    className?: string;
    /** Full-screen layout without app chrome (no sidebar); Gmail-like */
    standalone?: boolean;
}

export interface SelectedThread {
    id: string;
    subject: string;
    mailboxId: string;
}

// ============================================
// INBOX LAYOUT COMPONENT
// ============================================

export function InboxLayout({
    initialMailboxId,
    initialFolder = "inbox",
    showTeamInbox = false,
    className,
    standalone = false,
}: InboxLayoutProps) {
    // Mailbox state
    const [mailboxes, setMailboxes] = useState<any[]>([]);
    const [isLoadingMailboxes, setIsLoadingMailboxes] = useState(true);
    const [mailboxError, setMailboxError] = useState<string | null>(null);
    
    // State
    const [selectedMailboxId, setSelectedMailboxId] = useState<string | undefined>(initialMailboxId);
    const [selectedFolder, setSelectedFolder] = useState(initialFolder);
    const [selectedThread, setSelectedThread] = useState<SelectedThread | null>(null);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [composerReplyTo, setComposerReplyTo] = useState<{
        threadId: string;
        subject: string;
        to: { email: string; name?: string }[];
    } | null>(null);
    
    // Panel visibility
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

    const hasTriggeredSync = useRef(false);

    // Fetch mailboxes
    const fetchMailboxes = useCallback(async () => {
        try {
            setIsLoadingMailboxes(true);
            const response = await fetch('/api/email/mailboxes', { cache: 'no-store' });
            const result = await response.json();
            
            if (result.success) {
                setMailboxes(result.data || []);
                // Auto-select first mailbox if none selected
                if (!selectedMailboxId && result.data?.length > 0) {
                    setSelectedMailboxId(result.data[0].id);
                }
            } else {
                setMailboxError(result.error);
            }
        } catch (err) {
            setMailboxError('Erreur de chargement');
        } finally {
            setIsLoadingMailboxes(false);
        }
    }, [selectedMailboxId]);

    useEffect(() => {
        fetchMailboxes();
    }, []);

    // Auto-sync emails when entering the email page (once per mount when mailboxes are loaded)
    useEffect(() => {
        if (mailboxes.length > 0 && !hasTriggeredSync.current) {
            hasTriggeredSync.current = true;
            fetch('/api/email/sync', { method: 'POST' }).catch(() => {});
        }
    }, [mailboxes.length]);

    // Handlers
    const handleSelectMailbox = useCallback((mailboxId: string | undefined) => {
        setSelectedMailboxId(mailboxId);
        setSelectedThread(null);
    }, []);

    const handleSelectFolder = useCallback((folder: string) => {
        setSelectedFolder(folder);
        setSelectedThread(null);
    }, []);

    const handleSelectThread = useCallback((thread: SelectedThread) => {
        setSelectedThread(thread);
    }, []);

    const handleCloseThread = useCallback(() => {
        setSelectedThread(null);
    }, []);

    const handleCompose = useCallback(() => {
        setComposerReplyTo(null);
        setIsComposerOpen(true);
    }, []);

    const handleReply = useCallback((replyData: {
        threadId: string;
        subject: string;
        to: { email: string; name?: string }[];
    }) => {
        setComposerReplyTo(replyData);
        setIsComposerOpen(true);
    }, []);

    const handleCloseComposer = useCallback(() => {
        setIsComposerOpen(false);
        setComposerReplyTo(null);
    }, []);

    const handleEmailSent = useCallback(() => {
        // Refresh thread list and close composer
        setIsComposerOpen(false);
        setComposerReplyTo(null);
    }, []);

    const handleMailboxConnected = useCallback(() => {
        fetchMailboxes();
    }, [fetchMailboxes]);

    const containerHeight = standalone ? "h-screen" : "h-[calc(100vh-8rem)]";
    const containerStyle = standalone
        ? "flex flex-col bg-white overflow-hidden"
        : "flex bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm";

    // Loading state
    if (isLoadingMailboxes) {
        return (
            <div className={cn(containerHeight, "flex items-center justify-center bg-white", !standalone && "rounded-2xl border border-slate-200 shadow-sm", className)}>
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-slate-500">Chargement des boîtes mail...</p>
                </div>
            </div>
        );
    }

    // No mailboxes - show onboarding
    if (mailboxes.length === 0) {
        return (
            <div className={cn(containerHeight, "bg-white overflow-hidden flex flex-col", !standalone && "rounded-2xl border border-slate-200 shadow-sm", className)}>
                {standalone && (
                    <header className="h-14 flex-shrink-0 flex items-center gap-4 px-4 border-b border-slate-200 bg-white">
                        <Link href={showTeamInbox ? "/manager/dashboard" : "/sdr"} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">Retour</span>
                        </Link>
                        <div className="flex-1 flex items-center gap-2">
                            <Image src="/favicon.png" alt="" width={24} height={24} />
                            <span className="font-semibold text-slate-800">Emails</span>
                        </div>
                    </header>
                )}
                <div className="flex-1 overflow-auto">
                    <EmailOnboarding onMailboxConnected={handleMailboxConnected} />
                </div>
            </div>
        );
    }

    return (
        <div className={cn(containerHeight, containerStyle, standalone ? "flex flex-col" : "flex", className)}>
            {/* Standalone: top bar with logo and back link */}
            {standalone && (
                <header className="h-14 flex-shrink-0 flex items-center gap-4 px-4 border-b border-slate-200 bg-white">
                    <Link href={showTeamInbox ? "/manager/dashboard" : "/sdr"} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Retour à l&apos;app</span>
                    </Link>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                        <Image src="/favicon.png" alt="" width={24} height={24} className="flex-shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">Emails</span>
                    </div>
                </header>
            )}

            <div className="flex flex-1 min-h-0">
            {/* Left Panel - Folders & Mailboxes (Gmail-style width when standalone) */}
            <div
                className={cn(
                    "border-r border-slate-200 flex flex-col bg-slate-50/50 transition-all duration-300 flex-shrink-0",
                    isLeftPanelCollapsed ? "w-0 overflow-hidden" : standalone ? "w-56" : "w-60"
                )}
            >
                {/* Mailbox Switcher */}
                <div className="p-3 border-b border-slate-200">
                    <MailboxSwitcher
                        selectedMailboxId={selectedMailboxId}
                        onSelectMailbox={handleSelectMailbox}
                        onMailboxAdded={fetchMailboxes}
                        showTeamInbox={showTeamInbox}
                    />
                </div>

                {/* Compose Button */}
                <div className="p-3">
                    <button
                        onClick={handleCompose}
                        className="w-full flex items-center justify-center gap-2 h-10 px-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-indigo-400 hover:to-indigo-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                    >
                        <Pencil className="w-4 h-4" />
                        Nouveau message
                    </button>
                </div>

                {/* Folder Navigation */}
                <div className="flex-1 overflow-y-auto">
                    <FolderNav
                        selectedFolder={selectedFolder}
                        onSelectFolder={handleSelectFolder}
                        mailboxId={selectedMailboxId}
                    />
                </div>
            </div>

            {/* Center Panel - Thread List / Thread View */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-12 px-3 flex items-center gap-2 border-b border-slate-200 bg-white">
                    <button
                        onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                        title={isLeftPanelCollapsed ? "Afficher les dossiers" : "Masquer les dossiers"}
                    >
                        {isLeftPanelCollapsed ? (
                            <PanelLeftOpen className="w-4 h-4" />
                        ) : (
                            <PanelLeftClose className="w-4 h-4" />
                        )}
                    </button>
                    <span className="text-sm font-medium text-slate-700 capitalize">
                        {selectedFolder === "inbox" ? "Boîte de réception" :
                         selectedFolder === "sent" ? "Envoyés" :
                         selectedFolder === "drafts" ? "Brouillons" :
                         selectedFolder === "archive" ? "Archives" :
                         selectedFolder === "trash" ? "Corbeille" :
                         selectedFolder === "starred" ? "Favoris" :
                         selectedFolder === "unread" ? "Non lus" :
                         selectedFolder}
                    </span>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex min-h-0">
                    {/* Thread List (wider in standalone for Gmail-like balance) */}
                    <div
                        className={cn(
                            "border-r border-slate-200 flex flex-col transition-all duration-300",
                            selectedThread ? (standalone ? "w-[380px]" : "w-80") : "flex-1"
                        )}
                    >
                        <ThreadList
                            mailboxId={selectedMailboxId}
                            folder={selectedFolder}
                            selectedThreadId={selectedThread?.id}
                            onSelectThread={handleSelectThread}
                        />
                    </div>

                    {/* Thread View */}
                    {selectedThread && (
                        <div className="flex-1 flex flex-col min-w-0">
                            <ThreadView
                                threadId={selectedThread.id}
                                mailboxId={selectedThread.mailboxId}
                                onClose={handleCloseThread}
                                onReply={handleReply}
                            />
                        </div>
                    )}
                </div>
            </div>
            </div>
            {/* end flex-1 flex min-h-0 wrapper */}

            {/* Composer Modal */}
            {isComposerOpen && (
                <EmailComposer
                    mailboxId={selectedMailboxId}
                    replyTo={composerReplyTo}
                    onClose={handleCloseComposer}
                    onSent={handleEmailSent}
                />
            )}
        </div>
    );
}

export default InboxLayout;
