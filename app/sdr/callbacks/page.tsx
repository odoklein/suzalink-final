"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Button } from "@/components/ui";
import {
    Calendar,
    Clock,
    Phone,
    User,
    Building2,
    ArrowRight,
    Loader2,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface Callback {
    id: string;
    createdAt: string;
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
    };
    mission: {
        id: string;
        name: string;
        client: {
            name: string;
        };
    };
}

// ============================================
// SDR CALLBACKS PAGE
// ============================================

export default function SDRCallbacksPage() {
    const [callbacks, setCallbacks] = useState<Callback[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-900">Rappels en attente</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Contacts intéressés à rappeler
                </p>
            </div>

            {/* List */}
            {callbacks.length === 0 ? (
                <Card className="text-center py-12">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">Aucun rappel en attente</h3>
                    <p className="text-slate-500 mt-1">
                        C'est calme pour le moment. Continuez vos sessions d'appels !
                    </p>
                    <Link href="/sdr/action" className="inline-block mt-4">
                        <Button variant="primary">
                            Démarrer une session
                        </Button>
                    </Link>
                </Card>
            ) : (
                <div className="space-y-3">
                    {callbacks.map((callback) => (
                        <Card key={callback.id} className="!p-4 hover:border-indigo-300 transition-all">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                                        <Clock className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">
                                            {callback.contact.firstName} {callback.contact.lastName}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                                            <Building2 className="w-3 h-3" />
                                            <span>{callback.contact.company.name}</span>
                                            {callback.contact.title && (
                                                <>
                                                    <span className="text-slate-300">•</span>
                                                    <span>{callback.contact.title}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Context Bubble */}
                                        <div className="mt-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100/50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="bg-white/50 text-amber-700 text-[10px] h-5 border-amber-200">
                                                    {callback.mission.client.name}
                                                </Badge>
                                                <span className="text-xs text-slate-400">
                                                    Demandé le {new Date(callback.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {callback.note && (
                                                <p className="text-sm text-slate-700 italic">
                                                    "{callback.note}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Link href="/sdr/action">
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            className="w-full gap-2"
                                            // In a real app, we would pass the contact ID to the action page to prioritize it
                                            onClick={() => {
                                                // We could set a session storage or URL param here if the action page supports it
                                                // For now just taking them to action page is good
                                            }}
                                        >
                                            <Phone className="w-4 h-4" />
                                            Rappeler
                                        </Button>
                                    </Link>
                                    {callback.contact.phone && (
                                        <a href={`tel:${callback.contact.phone}`} className="w-full">
                                            <Button size="sm" variant="ghost" className="w-full text-slate-600">
                                                {callback.contact.phone}
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
