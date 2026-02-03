"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    X,
    Minus,
    Maximize2,
    Minimize2,
    Send,
    Paperclip,
    Image,
    Link2,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    AlignLeft,
    Trash2,
    ChevronDown,
    Loader2,
    Calendar,
    Clock,
    Sparkles,
} from "lucide-react";
import { AiEmailDraftDialog } from "@/components/email/AiEmailDraftDialog";

// ============================================
// TYPES
// ============================================

interface Mailbox {
    id: string;
    email: string;
    displayName: string | null;
    signature: string | null;
    signatureHtml: string | null;
}

interface EmailComposerProps {
    mailboxId?: string;
    replyTo?: {
        threadId: string;
        subject: string;
        to: { email: string; name?: string }[];
    } | null;
    onClose: () => void;
    onSent: () => void;
}

// ============================================
// EMAIL COMPOSER COMPONENT
// ============================================

export function EmailComposer({
    mailboxId,
    replyTo,
    onClose,
    onSent,
}: EmailComposerProps) {
    // State
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
    const [selectedMailboxId, setSelectedMailboxId] = useState(mailboxId);
    const [to, setTo] = useState<string[]>(replyTo?.to.map(t => t.email) || []);
    const [cc, setCc] = useState<string[]>([]);
    const [bcc, setBcc] = useState<string[]>([]);
    const [subject, setSubject] = useState(replyTo?.subject || "");
    const [body, setBody] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);

    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);

    const [toInput, setToInput] = useState("");
    const [ccInput, setCcInput] = useState("");
    const [bccInput, setBccInput] = useState("");
    const [showAiDraftDialog, setShowAiDraftDialog] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch mailboxes
    useEffect(() => {
        const fetchMailboxes = async () => {
            try {
                const res = await fetch("/api/email/mailboxes");
                const json = await res.json();
                if (json.success) {
                    setMailboxes(json.data);
                    if (!selectedMailboxId && json.data.length > 0) {
                        setSelectedMailboxId(json.data[0].id);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch mailboxes:", error);
            }
        };
        fetchMailboxes();
    }, [selectedMailboxId]);

    // Insert signature when mailbox changes
    useEffect(() => {
        const mailbox = mailboxes.find(m => m.id === selectedMailboxId);
        if (mailbox?.signatureHtml && editorRef.current) {
            // Only insert if body is empty
            if (!editorRef.current.innerHTML.trim()) {
                editorRef.current.innerHTML = `<br><br>${mailbox.signatureHtml}`;
            }
        }
    }, [selectedMailboxId, mailboxes]);

    // Handle email input
    const handleEmailInput = (
        value: string,
        setter: React.Dispatch<React.SetStateAction<string>>,
        listSetter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        if (value.endsWith(",") || value.endsWith(" ")) {
            const email = value.slice(0, -1).trim();
            if (email && email.includes("@")) {
                listSetter(prev => [...prev, email]);
                setter("");
            }
        } else {
            setter(value);
        }
    };

    const handleEmailKeyDown = (
        e: React.KeyboardEvent,
        value: string,
        setter: React.Dispatch<React.SetStateAction<string>>,
        listSetter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const email = value.trim();
            if (email && email.includes("@")) {
                listSetter(prev => [...prev, email]);
                setter("");
            }
        } else if (e.key === "Backspace" && !value) {
            listSetter(prev => prev.slice(0, -1));
        }
    };

    // Handle attachment
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            setAttachments(prev => [...prev, ...Array.from(files)]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Format commands
    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    // Send email
    const handleSend = async () => {
        if (!selectedMailboxId || to.length === 0) return;

        setIsSending(true);
        try {
            // Get body content
            const bodyHtml = editorRef.current?.innerHTML || "";
            const bodyText = editorRef.current?.textContent || "";

            // Build form data for attachments
            const formData = new FormData();
            formData.append("mailboxId", selectedMailboxId);
            formData.append("to", JSON.stringify(to.map(email => ({ email }))));
            if (cc.length > 0) formData.append("cc", JSON.stringify(cc.map(email => ({ email }))));
            if (bcc.length > 0) formData.append("bcc", JSON.stringify(bcc.map(email => ({ email }))));
            formData.append("subject", subject);
            formData.append("bodyHtml", bodyHtml);
            formData.append("bodyText", bodyText);
            if (replyTo?.threadId) formData.append("threadId", replyTo.threadId);

            attachments.forEach((file, index) => {
                formData.append(`attachment_${index}`, file);
            });

            const res = await fetch("/api/email/send", {
                method: "POST",
                body: formData,
            });

            const json = await res.json();

            if (json.success) {
                onSent();
            } else {
                alert(json.error || "Erreur lors de l'envoi");
            }
        } catch (error) {
            console.error("Failed to send email:", error);
            alert("Erreur lors de l'envoi");
        } finally {
            setIsSending(false);
        }
    };

    const selectedMailbox = mailboxes.find(m => m.id === selectedMailboxId);

    return (
        <div
            className={cn(
                "fixed z-50 bg-white rounded-t-xl shadow-2xl border border-slate-200 flex flex-col transition-all",
                isMinimized
                    ? "bottom-0 right-4 w-72 h-10"
                    : isFullscreen
                        ? "inset-4 rounded-xl"
                        : "bottom-0 right-4 w-[600px] h-[500px]"
            )}
        >
            {/* Header */}
            <div className="h-10 px-3 flex items-center justify-between bg-slate-800 text-white rounded-t-xl flex-shrink-0">
                <span className="text-sm font-medium truncate">
                    {replyTo ? "Répondre" : "Nouveau message"}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1 hover:bg-slate-700 rounded"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1 hover:bg-slate-700 rounded"
                    >
                        {isFullscreen ? (
                            <Minimize2 className="w-4 h-4" />
                        ) : (
                            <Maximize2 className="w-4 h-4" />
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-700 rounded"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {!isMinimized && (
                <>
                    {/* From */}
                    <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2">
                        <span className="text-sm text-slate-500 w-12">De:</span>
                        <select
                            value={selectedMailboxId || ""}
                            onChange={(e) => setSelectedMailboxId(e.target.value)}
                            className="flex-1 text-sm bg-white text-slate-900 focus:outline-none cursor-pointer"
                        >
                            {mailboxes.map((mb) => (
                                <option key={mb.id} value={mb.id} className="text-slate-900 bg-white">
                                    {mb.displayName ? `${mb.displayName} <${mb.email}>` : mb.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* To */}
                    <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-slate-500 w-12">À:</span>
                        {to.map((email, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-sm rounded-full"
                            >
                                {email}
                                <button
                                    onClick={() => setTo(prev => prev.filter((_, idx) => idx !== i))}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        <input
                            type="email"
                            value={toInput}
                            onChange={(e) => handleEmailInput(e.target.value, setToInput, setTo)}
                            onKeyDown={(e) => handleEmailKeyDown(e, toInput, setToInput, setTo)}
                            placeholder={to.length === 0 ? "Destinataires" : ""}
                            className="flex-1 min-w-[100px] text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                            {!showCc && (
                                <button onClick={() => setShowCc(true)} className="hover:text-slate-600">
                                    Cc
                                </button>
                            )}
                            {!showBcc && (
                                <button onClick={() => setShowBcc(true)} className="hover:text-slate-600">
                                    Cci
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Cc */}
                    {showCc && (
                        <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-slate-500 w-12">Cc:</span>
                            {cc.map((email, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-sm rounded-full"
                                >
                                    {email}
                                    <button
                                        onClick={() => setCc(prev => prev.filter((_, idx) => idx !== i))}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            <input
                                type="email"
                                value={ccInput}
                                onChange={(e) => handleEmailInput(e.target.value, setCcInput, setCc)}
                                onKeyDown={(e) => handleEmailKeyDown(e, ccInput, setCcInput, setCc)}
                                placeholder="Ajouter en Cc"
                                className="flex-1 min-w-[100px] text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none"
                            />
                        </div>
                    )}

                    {/* Bcc */}
                    {showBcc && (
                        <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-slate-500 w-12">Cci:</span>
                            {bcc.map((email, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-sm rounded-full"
                                >
                                    {email}
                                    <button
                                        onClick={() => setBcc(prev => prev.filter((_, idx) => idx !== i))}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            <input
                                type="email"
                                value={bccInput}
                                onChange={(e) => handleEmailInput(e.target.value, setBccInput, setBcc)}
                                onKeyDown={(e) => handleEmailKeyDown(e, bccInput, setBccInput, setBcc)}
                                placeholder="Ajouter en Cci"
                                className="flex-1 min-w-[100px] text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none"
                            />
                        </div>
                    )}

                    {/* Subject */}
                    <div className="px-3 py-2 border-b border-slate-200">
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Objet"
                            className="w-full text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                    </div>

                    {/* Formatting toolbar */}
                    <div className="px-3 py-1 border-b border-slate-200 flex items-center gap-1">
                        <button
                            onClick={() => execCommand("bold")}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                            title="Gras"
                        >
                            <Bold className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => execCommand("italic")}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                            title="Italique"
                        >
                            <Italic className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => execCommand("underline")}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                            title="Souligné"
                        >
                            <Underline className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <button
                            onClick={() => execCommand("insertUnorderedList")}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                            title="Liste à puces"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => execCommand("insertOrderedList")}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                            title="Liste numérotée"
                        >
                            <ListOrdered className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <button
                            onClick={() => {
                                const url = prompt("URL du lien:");
                                if (url) execCommand("createLink", url);
                            }}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                            title="Insérer un lien"
                        >
                            <Link2 className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <button
                            onClick={() => setShowAiDraftDialog(true)}
                            className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 flex items-center gap-1"
                            title="Rédaction assistée par IA"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs font-medium">AI</span>
                        </button>
                    </div>

                    {/* Editor */}
                    <div
                        ref={editorRef}
                        contentEditable
                        className="flex-1 px-3 py-2 text-sm text-slate-900 overflow-y-auto focus:outline-none bg-white"
                        style={{ minHeight: "150px" }}
                    />

                    {/* Attachments */}
                    {attachments.length > 0 && (
                        <div className="px-3 py-2 border-t border-slate-200 flex flex-wrap gap-2">
                            {attachments.map((file, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-lg"
                                >
                                    <Paperclip className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs text-slate-600 truncate max-w-[100px]">
                                        {file.name}
                                    </span>
                                    <button
                                        onClick={() => removeAttachment(i)}
                                        className="text-slate-400 hover:text-red-500"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="px-3 py-2 border-t border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded hover:bg-slate-100 text-slate-600"
                                title="Joindre un fichier"
                            >
                                <Paperclip className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowSchedule(!showSchedule)}
                                className="p-2 rounded hover:bg-slate-100 text-slate-600"
                                title="Programmer l'envoi"
                            >
                                <Clock className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500"
                                title="Supprimer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={isSending || !selectedMailboxId || to.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Envoyer
                        </button>
                    </div>
                </>
            )}

            <AiEmailDraftDialog
                open={showAiDraftDialog}
                onClose={() => setShowAiDraftDialog(false)}
                subject={subject}
                onInsert={(html) => {
                    if (editorRef.current) {
                        const current = editorRef.current.innerHTML || "";
                        editorRef.current.innerHTML = current + html;
                        editorRef.current.focus();
                    }
                    setShowAiDraftDialog(false);
                }}
            />
        </div>
    );
}

export default EmailComposer;
