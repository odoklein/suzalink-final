"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MailboxSwitcher } from "./MailboxSwitcher";
import { FolderNav } from "./FolderNav";
import { ThreadList } from "./ThreadList";
import { ThreadView } from "./ThreadView";
import { ContextPanel } from "./ContextPanel";
import { EmailComposer } from "./EmailComposer";
import { EmailOnboarding } from "./EmailOnboarding";
import { 
    PanelLeftClose, 
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
    Pencil,
    Loader2,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface InboxLayoutProps {
    initialMailboxId?: string;
    initialFolder?: string;
    showTeamInbox?: boolean;
    className?: string;
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
    const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);

    const hasTriggeredSync = useRef(false);

    // Fetch mailboxes
    const fetchMailboxes = useCallback(async () => {
        try {
            setIsLoadingMailboxes(true);
            const response = await fetch('/api/email/mailboxes');
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

    // Loading state
    if (isLoadingMailboxes) {
        return (
            <div className={cn("h-[calc(100vh-8rem)] flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm", className)}>
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
            <div className={cn("h-[calc(100vh-8rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm", className)}>
                <EmailOnboarding onMailboxConnected={handleMailboxConnected} />
            </div>
        );
    }

    return (
        <div className={cn("h-[calc(100vh-8rem)] flex bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm", className)}>
            {/* Left Panel - Folders & Mailboxes */}
            <div
                className={cn(
                    "border-r border-slate-200 flex flex-col bg-slate-50/50 transition-all duration-300",
                    isLeftPanelCollapsed ? "w-0 overflow-hidden" : "w-60"
                )}
            >
                {/* Mailbox Switcher */}
                <div className="p-3 border-b border-slate-200">
                    <MailboxSwitcher
                        selectedMailboxId={selectedMailboxId}
                        onSelectMailbox={handleSelectMailbox}
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
                <div className="h-12 px-3 flex items-center justify-between border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-2">
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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsRightPanelVisible(!isRightPanelVisible)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                            title={isRightPanelVisible ? "Masquer le contexte" : "Afficher le contexte"}
                        >
                            {isRightPanelVisible ? (
                                <PanelRightClose className="w-4 h-4" />
                            ) : (
                                <PanelRightOpen className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex min-h-0">
                    {/* Thread List */}
                    <div
                        className={cn(
                            "border-r border-slate-200 flex flex-col transition-all duration-300",
                            selectedThread ? "w-80" : "flex-1"
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

            {/* Right Panel - Context */}
            {isRightPanelVisible && selectedThread && (
                <div className="w-80 border-l border-slate-200 bg-slate-50/50 overflow-y-auto">
                    <ContextPanel threadId={selectedThread.id} />
                </div>
            )}

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
