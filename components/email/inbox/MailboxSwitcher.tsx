"use client";


import React, { useState, useEffect } from "react";
import { MailboxManagerDialog } from "./MailboxManagerDialog";
import { cn } from "@/lib/utils";
import {
    ChevronDown,
    Mail,
    Users,
    Check,
    Plus,
    RefreshCw,
    Loader2,
    Settings,
} from "lucide-react";
import { getProviderColor } from "@/lib/email/providers/client-utils";
import type { EmailProvider } from "@prisma/client";

// ============================================
// TYPES
// ============================================

interface Mailbox {
    id: string;
    email: string;
    displayName: string | null;
    provider: EmailProvider;
    type: string;
    syncStatus: string;
    healthScore: number;
}

interface MailboxSwitcherProps {
    selectedMailboxId?: string;
    onSelectMailbox: (mailboxId: string | undefined) => void;
    onMailboxAdded?: () => void;
    showTeamInbox?: boolean;
}

// ============================================
// MAILBOX SWITCHER COMPONENT
// ============================================

export function MailboxSwitcher({
    selectedMailboxId,
    onSelectMailbox,
    onMailboxAdded,
    showTeamInbox = false,
}: MailboxSwitcherProps) {
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [showManagerDialog, setShowManagerDialog] = useState(false);

    const fetchMailboxes = React.useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/email/mailboxes?includeShared=true", { cache: "no-store" });
            const json = await res.json();
            if (json.success) {
                setMailboxes(json.data ?? []);
                if (!selectedMailboxId && (json.data?.length ?? 0) > 0) {
                    onSelectMailbox(json.data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch mailboxes:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedMailboxId, onSelectMailbox]);

    useEffect(() => {
        fetchMailboxes();
    }, [fetchMailboxes]);

    const selectedMailbox = mailboxes.find(m => m.id === selectedMailboxId);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "SYNCED":
                return "bg-emerald-500";
            case "SYNCING":
                return "bg-amber-500 animate-pulse";
            case "ERROR":
                return "bg-red-500";
            default:
                return "bg-slate-400";
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-10">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
        );
    }

    const handleMailboxAdded = React.useCallback(() => {
        onMailboxAdded?.();
        fetchMailboxes();
    }, [onMailboxAdded, fetchMailboxes]);

    if (mailboxes.length === 0) {
        return (
            <>
                <button
                    className="flex items-center justify-center gap-2 h-10 px-3 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    onClick={() => setShowManagerDialog(true)}
                >
                    <Plus className="w-4 h-4" />
                    Connecter une boîte mail
                </button>
                <MailboxManagerDialog
                    isOpen={showManagerDialog}
                    onClose={() => setShowManagerDialog(false)}
                    onMailboxAdded={handleMailboxAdded}
                />
            </>
        );
    }

    return (
        <div className="relative">
            {/* Selected Mailbox Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold"
                    style={{ backgroundColor: selectedMailbox ? getProviderColor(selectedMailbox.provider) : "#6366f1" }}
                >
                    {selectedMailbox?.email?.[0]?.toUpperCase() || <Mail className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-slate-900 truncate">
                        {selectedMailbox?.displayName || selectedMailbox?.email || "Toutes les boîtes"}
                    </p>
                    {selectedMailbox && (
                        <p className="text-xs text-slate-500 truncate">
                            {selectedMailbox.email}
                        </p>
                    )}
                </div>
                <ChevronDown className={cn(
                    "w-4 h-4 text-slate-400 transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-64 overflow-y-auto">
                        {/* All mailboxes option */}
                        <button
                            onClick={() => {
                                onSelectMailbox(undefined);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors",
                                !selectedMailboxId && "bg-indigo-50"
                            )}
                        >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                <Mail className="w-4 h-4 text-slate-600" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-slate-900">Toutes les boîtes</p>
                            </div>
                            {!selectedMailboxId && (
                                <Check className="w-4 h-4 text-indigo-600" />
                            )}
                        </button>

                        {/* Team inbox option */}
                        {showTeamInbox && (
                            <button
                                onClick={() => {
                                    // Handle team inbox
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium text-slate-900">Team Inbox</p>
                                </div>
                            </button>
                        )}

                        {/* Divider */}
                        <div className="my-1 border-t border-slate-100" />

                        {/* Individual mailboxes */}
                        {mailboxes.map((mailbox) => (
                            <button
                                key={mailbox.id}
                                onClick={() => {
                                    onSelectMailbox(mailbox.id);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors",
                                    selectedMailboxId === mailbox.id && "bg-indigo-50"
                                )}
                            >
                                <div
                                    className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold"
                                    style={{ backgroundColor: getProviderColor(mailbox.provider) }}
                                >
                                    {mailbox.email[0].toUpperCase()}
                                    {/* Sync status indicator */}
                                    <div className={cn(
                                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                                        getStatusColor(mailbox.syncStatus)
                                    )} />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                        {mailbox.displayName || mailbox.email}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {mailbox.email}
                                    </p>
                                </div>
                                {selectedMailboxId === mailbox.id && (
                                    <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                )}
                            </button>
                        ))}

                        {/* Add mailbox */}
                        <div className="my-1 border-t border-slate-100" />
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setShowManagerDialog(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Gérer les boîtes mails
                        </button>
                    </div>
                </>
            )}

            <MailboxManagerDialog
                isOpen={showManagerDialog}
                onClose={() => setShowManagerDialog(false)}
                onMailboxAdded={handleMailboxAdded}
            />
        </div>
    );
}

export default MailboxSwitcher;
