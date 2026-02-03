"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    X,
    Star,
    Archive,
    Trash2,
    Reply,
    ReplyAll,
    Forward,
    MoreHorizontal,
    Paperclip,
    Download,
    ChevronDown,
    ChevronUp,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ============================================
// TYPES
// ============================================

interface Email {
    id: string;
    fromAddress: string;
    fromName: string | null;
    toAddresses: string[];
    ccAddresses: string[];
    subject: string;
    bodyHtml: string | null;
    bodyText: string | null;
    direction: string;
    status: string;
    receivedAt: string | null;
    sentAt: string | null;
    attachments: {
        id: string;
        filename: string;
        mimeType: string;
        size: number;
    }[];
}

interface Thread {
    id: string;
    subject: string;
    isStarred: boolean;
    isArchived: boolean;
    emails: Email[];
    mailbox: {
        email: string;
        signature: string | null;
        signatureHtml: string | null;
    };
    permissions: {
        canSend: boolean;
        canSendAs: boolean;
    };
}

interface ThreadViewProps {
    threadId: string;
    mailboxId: string;
    onClose: () => void;
    onReply: (data: {
        threadId: string;
        subject: string;
        to: { email: string; name?: string }[];
    }) => void;
}

// ============================================
// THREAD VIEW COMPONENT
// ============================================

export function ThreadView({
    threadId,
    mailboxId,
    onClose,
    onReply,
}: ThreadViewProps) {
    const [thread, setThread] = useState<Thread | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch thread
    useEffect(() => {
        const fetchThread = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const res = await fetch(`/api/email/threads/${threadId}`);
                const json = await res.json();

                if (json.success) {
                    setThread(json.data);
                    // Expand the last email by default
                    if (json.data.emails.length > 0) {
                        const lastEmail = json.data.emails[json.data.emails.length - 1];
                        setExpandedEmails(new Set([lastEmail.id]));
                    }
                } else {
                    setError(json.error || "Erreur de chargement");
                }
            } catch (err) {
                setError("Erreur de connexion");
            } finally {
                setIsLoading(false);
            }
        };

        fetchThread();
    }, [threadId]);

    // Scroll to bottom when loaded
    useEffect(() => {
        if (!isLoading && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [isLoading, thread?.emails.length]);

    // Toggle email expansion
    const toggleEmail = (emailId: string) => {
        setExpandedEmails(prev => {
            const next = new Set(prev);
            if (next.has(emailId)) {
                next.delete(emailId);
            } else {
                next.add(emailId);
            }
            return next;
        });
    };

    // Handle star
    // Handle star
    const handleStar = async () => {
        if (!thread) return;
        const newIsStarred = !thread.isStarred;
        setThread(prev => prev ? { ...prev, isStarred: newIsStarred } : null); // Optimistic update
        try {
            await fetch(`/api/email/threads/${threadId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isStarred: newIsStarred }),
            });
        } catch (error) {
            console.error("Failed to star thread:", error);
            setThread(prev => prev ? { ...prev, isStarred: !newIsStarred } : null); // Revert
        }
    };

    // Handle archive
    // Handle archive
    const handleArchive = async () => {
        onClose(); // Optimistic close
        try {
            await fetch(`/api/email/threads/${threadId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isArchived: true }),
            });
        } catch (error) {
            console.error("Failed to archive thread:", error);
            // hard to revert close without callback complexity
        }
    };

    // Handle delete
    // Handle delete
    const handleDelete = async () => {
        onClose(); // Optimistic close
        try {
            await fetch(`/api/email/threads/${threadId}`, {
                method: "DELETE",
            });
        } catch (error) {
            console.error("Failed to delete thread:", error);
        }
    };

    // Handle reply
    const handleReply = () => {
        if (!thread || thread.emails.length === 0) return;
        const lastEmail = thread.emails[thread.emails.length - 1];
        onReply({
            threadId: thread.id,
            subject: thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`,
            to: [{ email: lastEmail.fromAddress, name: lastEmail.fromName || undefined }],
        });
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
        );
    }

    if (error || !thread) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Erreur de chargement
                </h3>
                <p className="text-sm text-slate-500 mb-4">{error}</p>
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                    Retour
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-slate-900 truncate">
                            {thread.subject || "(Sans objet)"}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {thread.emails.length} message{thread.emails.length > 1 ? "s" : ""}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleStar}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                thread.isStarred
                                    ? "text-amber-500 hover:bg-amber-50"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            )}
                            title={thread.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
                        >
                            <Star className={cn("w-5 h-5", thread.isStarred && "fill-current")} />
                        </button>
                        <button
                            onClick={handleArchive}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Archiver"
                        >
                            <Archive className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Fermer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {thread.emails.map((email, index) => (
                    <EmailMessage
                        key={email.id}
                        email={email}
                        isExpanded={expandedEmails.has(email.id)}
                        isLast={index === thread.emails.length - 1}
                        onToggle={() => toggleEmail(email.id)}
                        mailboxEmail={thread.mailbox.email}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Reply Actions */}
            {thread.permissions.canSend && (
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReply}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
                        >
                            <Reply className="w-4 h-4" />
                            Répondre
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <ReplyAll className="w-4 h-4" />
                            Répondre à tous
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <Forward className="w-4 h-4" />
                            Transférer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// EMAIL MESSAGE COMPONENT
// ============================================

interface EmailMessageProps {
    email: Email;
    isExpanded: boolean;
    isLast: boolean;
    onToggle: () => void;
    mailboxEmail: string;
}

function EmailMessage({
    email,
    isExpanded,
    isLast,
    onToggle,
    mailboxEmail,
}: EmailMessageProps) {
    const isOutbound = email.direction === "OUTBOUND";
    const date = email.receivedAt || email.sentAt;
    const formattedDate = date
        ? format(new Date(date), "d MMM yyyy 'à' HH:mm", { locale: fr })
        : "";

    return (
        <div className={cn(
            "border border-slate-200 rounded-xl overflow-hidden bg-white",
            isLast && "ring-2 ring-indigo-100"
        )}>
            {/* Header - Always visible */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
            >
                {/* Avatar */}
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
                    isOutbound
                        ? "bg-gradient-to-br from-indigo-400 to-indigo-600 text-white"
                        : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600"
                )}>
                    {(email.fromName || email.fromAddress)[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">
                            {email.fromName || email.fromAddress}
                        </span>
                        {isOutbound && (
                            <span className="text-xs text-slate-400">
                                (vous)
                            </span>
                        )}
                    </div>
                    {!isExpanded && (
                        <p className="text-sm text-slate-500 truncate">
                            {email.bodyText?.substring(0, 100) || "..."}
                        </p>
                    )}
                    {isExpanded && (
                        <p className="text-xs text-slate-400">
                            À: {email.toAddresses.join(", ")}
                            {email.ccAddresses.length > 0 && (
                                <> · Cc: {email.ccAddresses.join(", ")}</>
                            )}
                        </p>
                    )}
                </div>

                {/* Date & Toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400">
                        {formattedDate}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </button>

            {/* Body - Collapsible */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100">
                    {/* Attachments */}
                    {email.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 py-3 border-b border-slate-100">
                            {email.attachments.map((attachment) => (
                                <a
                                    key={attachment.id}
                                    href={`/api/email/attachments/${attachment.id}`}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    <Paperclip className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-700 truncate max-w-[150px]">
                                        {attachment.filename}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {formatFileSize(attachment.size)}
                                    </span>
                                    <Download className="w-3 h-3 text-slate-400" />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Email body */}
                    <div className="pt-4 prose prose-sm prose-slate max-w-none text-slate-900">
                        {email.bodyHtml ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.bodyHtml) }}
                                className="email-body text-slate-900"
                            />
                        ) : (
                            <pre className="whitespace-pre-wrap font-sans text-slate-700">
                                {email.bodyText}
                            </pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// HELPERS
// ============================================

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeHtml(html: string): string {
    // Basic sanitization - in production, use a proper library like DOMPurify
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/on\w+="[^"]*"/gi, "")
        .replace(/on\w+='[^']*'/gi, "");
}

export default ThreadView;
