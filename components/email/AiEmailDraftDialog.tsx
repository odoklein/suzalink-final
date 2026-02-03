"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Sparkles, Loader2, AlertCircle } from "lucide-react";

// Basic HTML sanitization for preview (same idea as ThreadView)
function sanitizeHtml(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/on\w+="[^"]*"/gi, "")
        .replace(/on\w+='[^']*'/gi, "");
}

export interface AiEmailDraftDialogProps {
    open: boolean;
    onClose: () => void;
    onInsert: (html: string) => void;
    subject?: string;
}

export function AiEmailDraftDialog({
    open,
    onClose,
    onInsert,
    subject,
}: AiEmailDraftDialogProps) {
    const [instruction, setInstruction] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bodyHtml, setBodyHtml] = useState<string | null>(null);

    const handleGenerate = async () => {
        const trimmed = instruction.trim();
        if (!trimmed) return;

        setIsLoading(true);
        setError(null);
        setBodyHtml(null);

        try {
            const res = await fetch("/api/ai/mistral/email-draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instruction: trimmed,
                    subject: subject || undefined,
                }),
            });

            const json = await res.json();

            if (json.success && json.data?.bodyHtml) {
                setBodyHtml(json.data.bodyHtml);
            } else {
                setError(json.error || "Erreur lors de la génération");
            }
        } catch (err) {
            console.error("AI draft error:", err);
            setError("Erreur de connexion");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInsert = () => {
        if (bodyHtml) {
            onInsert(bodyHtml);
            setBodyHtml(null);
            setInstruction("");
            setError(null);
            onClose();
        }
    };

    const handleClose = () => {
        setInstruction("");
        setBodyHtml(null);
        setError(null);
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={handleClose}
            />
            <div
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-white" />
                        <h2 className="text-lg font-semibold text-white">Rédaction assistée par IA</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Décrivez ce que vous voulez écrire
                        </label>
                        <textarea
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="Ex. : proposer un rendez-vous la semaine prochaine pour présenter notre offre"
                            className="w-full h-24 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !instruction.trim()}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all",
                                "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Génération...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Générer
                                </>
                            )}
                        </button>
                    </div>

                    {bodyHtml && (
                        <>
                            <div className="border-t border-slate-200 pt-4">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                    Aperçu
                                </p>
                                <div
                                    className={cn(
                                        "min-h-[120px] max-h-[200px] overflow-y-auto p-4 rounded-xl border border-slate-200 bg-slate-50",
                                        "prose prose-sm prose-slate max-w-none text-slate-700"
                                    )}
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyHtml) }}
                                />
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleInsert}
                                    className="px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl transition-colors"
                                >
                                    Insérer
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AiEmailDraftDialog;
