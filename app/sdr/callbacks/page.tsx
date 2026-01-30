"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Button, Modal, ModalFooter } from "@/components/ui";
import {
    Calendar,
    Clock,
    Phone,
    User,
    Building2,
    ArrowRight,
    Loader2,
    CheckCircle2,
    CalendarClock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCallbackDateTime } from "@/lib/utils/parseDateFromNote";

// ============================================
// TYPES
// ============================================

interface Callback {
    id: string;
    createdAt: string;
    callbackDate?: string | null;  // Parsed callback date from note
    note?: string;
    contact: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        title: string | null;
        phone: string | null;
        email: string | null;
        company: {
            name: string;
        };
    } | null;  // Contact can be null for company-only actions
    company?: {  // Direct company reference for company-only callbacks
        id: string;
        name: string;
        phone: string | null;
    };
    mission: {
        id: string;
        name: string;
        client: {
            name: string;
        };
    } | null;
    /** Present when viewing as BD: SDR who created the callback */
    sdr?: { id: string; name: string | null };
}

// ============================================
// SDR CALLBACKS PAGE
// ============================================

export default function SDRCallbacksPage() {
    const [callbacks, setCallbacks] = useState<Callback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rescheduleCallback, setRescheduleCallback] = useState<Callback | null>(null);
    const [rescheduleDateValue, setRescheduleDateValue] = useState("");
    const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

    const openReschedule = (cb: Callback) => {
        setRescheduleCallback(cb);
        setRescheduleDateValue(cb.callbackDate ? new Date(cb.callbackDate).toISOString().slice(0, 16) : "");
    };

    const submitReschedule = async () => {
        if (!rescheduleCallback || !rescheduleDateValue) return;
        setRescheduleSubmitting(true);
        try {
            const res = await fetch(`/api/actions/${rescheduleCallback.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ callbackDate: new Date(rescheduleDateValue).toISOString() }),
            });
            const json = await res.json();
            if (json.success) {
                setCallbacks((prev) =>
                    prev.map((c) =>
                        c.id === rescheduleCallback.id
                            ? { ...c, callbackDate: rescheduleDateValue }
                            : c
                    )
                );
                setRescheduleCallback(null);
            }
        } catch (err) {
            console.error("Reschedule failed:", err);
        } finally {
            setRescheduleSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchCallbacks = async () => {
            try {
                const res = await fetch("/api/sdr/callbacks");
                const json = await res.json();
                if (json.success) {
                    setCallbacks(json.data);
                }
            } catch (err) {
                console.error("Failed to fetch callbacks:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCallbacks();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Chargement des rappels...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in p-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-900">
                        Rappels en attente
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Gérez vos demandes de rappel et optimisez vos conversions
                    </p>
                </div>
                <div className="hidden md:flex bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold border border-amber-100 shadow-sm">
                    {callbacks.length} {callbacks.length > 1 ? "rappels" : "rappel"} à traiter
                </div>
            </div>

            {/* List */}
            {callbacks.length === 0 ? (
                <Card className="text-center py-16 border-dashed border-2 bg-slate-50/50">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Tout est à jour !</h3>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                        Aucun rappel en attente. C'est le moment idéal pour lancer une nouvelle session de prospection.
                    </p>
                    <Link href="/sdr/action" className="inline-block mt-8">
                        <Button className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white shadow-lg shadow-indigo-200 transaction-all hover:-translate-y-0.5">
                            Démarrer une session
                        </Button>
                    </Link>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {callbacks.map((callback) => (
                        <div
                            key={callback.id}
                            className="group relative bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_2px_8px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgb(0,0,0,0.08)] hover:border-indigo-200/60 transition-all duration-300 hover:-translate-y-0.5"
                        >
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-orange-400 rounded-l-2xl group-hover:w-2 transition-all duration-300" />

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-4">
                                <div className="flex items-start gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center flex-shrink-0 border border-amber-100 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                        <Clock className="w-7 h-7 text-amber-600" />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-900 transition-colors">
                                                {callback.contact
                                                    ? `${callback.contact.firstName || ''} ${callback.contact.lastName || ''}`.trim() || 'Contact inconnu'
                                                    : callback.company?.name || 'Société inconnue'
                                                }
                                            </h3>
                                            {callback.callbackDate ? (
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${new Date(callback.callbackDate) < new Date()
                                                        ? 'bg-red-50 text-red-700 border-red-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`} title="Heure en fuseau local">
                                                    {formatCallbackDateTime(callback.callbackDate)}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                                    {new Date(callback.createdAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                {callback.contact?.company.name || callback.company?.name || 'N/A'}
                                            </div>
                                            {callback.contact?.title && (
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                    {callback.contact.title}
                                                </div>
                                            )}
                                        </div>

                                        {/* Context Badge */}
                                        {(callback.mission || callback.note || callback.callbackDate || callback.sdr) && (
                                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                                {callback.sdr && (
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                                                        Assigné à: {callback.sdr.name ?? '—'}
                                                    </Badge>
                                                )}
                                                {callback.mission?.client && (
                                                    <Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 transition-colors">
                                                        Client: {callback.mission.client.name}
                                                    </Badge>
                                                )}
                                                {callback.note && (
                                                    <p className="text-sm text-slate-500 italic truncate max-w-md border-l-2 border-slate-200 pl-2">
                                                        "{callback.note}"
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pl-4 md:pl-0 border-t md:border-t-0 border-slate-50 pt-4 md:pt-0">
                                    {(callback.contact?.phone || callback.company?.phone) && (
                                        <div className="hidden lg:block text-right mr-2">
                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Contact</p>
                                            <p className="font-mono text-sm text-slate-700">{callback.contact?.phone || callback.company?.phone}</p>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="secondary"
                                            className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                                            onClick={() => openReschedule(callback)}
                                        >
                                            <CalendarClock className="w-4 h-4" />
                                            Reprogrammer
                                        </Button>
                                        <Link href="/sdr/action" className="w-full md:w-auto">
                                            <Button
                                                className="w-full md:w-auto bg-slate-900 hover:bg-indigo-600 text-white shadow-md hover:shadow-indigo-200 transition-all duration-300 gap-2"
                                            >
                                                <Phone className="w-4 h-4" />
                                                <span>Rappeler</span>
                                                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reschedule modal */}
            <Modal
                isOpen={!!rescheduleCallback}
                onClose={() => setRescheduleCallback(null)}
                title="Reprogrammer le rappel"
                description={rescheduleCallback ? (rescheduleCallback.mission?.name ? `Mission: ${rescheduleCallback.mission.name}` : "Choisissez une nouvelle date") : ""}
                size="sm"
            >
                {rescheduleCallback && (
                    <div className="space-y-4">
                        {rescheduleCallback.sdr && (
                            <p className="text-sm text-slate-600">
                                <span className="font-medium">SDR:</span> {rescheduleCallback.sdr.name}
                            </p>
                        )}
                        {rescheduleCallback.note && (
                            <p className="text-sm text-slate-500 italic border-l-2 border-slate-200 pl-2">
                                &quot;{rescheduleCallback.note}&quot;
                            </p>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Nouvelle date et heure</label>
                            <input
                                type="datetime-local"
                                value={rescheduleDateValue}
                                onChange={(e) => setRescheduleDateValue(e.target.value)}
                                min={new Date().toISOString().slice(0, 16)}
                                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <ModalFooter>
                            <Button variant="ghost" onClick={() => setRescheduleCallback(null)}>
                                Annuler
                            </Button>
                            <Button
                                variant="primary"
                                onClick={submitReschedule}
                                disabled={!rescheduleDateValue || rescheduleSubmitting}
                                isLoading={rescheduleSubmitting}
                            >
                                Enregistrer
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </Modal>
        </div>
    );
}
