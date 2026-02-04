"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    Send,
    Loader2,
    Mail,
    Building2,
    Target,
    Eye,
    MousePointer,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";

// ============================================
// TYPES
// ============================================

interface MissionOption {
    id: string;
    name: string;
}

interface SentEmail {
    id: string;
    subject: string;
    sentAt: string | null;
    openCount: number;
    clickCount: number;
    firstOpenedAt: string | null;
    lastOpenedAt: string | null;
    contact: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        company: { id: string; name: string };
    } | null;
    mission: { id: string; name: string } | null;
    template: { id: string; name: string } | null;
}

// ============================================
// SDR MISSION EMAILS SENT PAGE
// ============================================

export default function SDRMissionEmailsSentPage() {
    const [emails, setEmails] = useState<SentEmail[]>([]);
    const [missions, setMissions] = useState<MissionOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [missionFilter, setMissionFilter] = useState<string>("");

    useEffect(() => {
        const f = async () => {
            try {
                const res = await fetch("/api/sdr/missions");
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setMissions(json.data.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })));
                }
            } catch (e) {
                console.error("Failed to fetch missions:", e);
            }
        };
        f();
    }, []);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        const params = new URLSearchParams();
        if (missionFilter) params.set("missionId", missionFilter);
        fetch(`/api/sdr/emails/sent?${params}`)
            .then((res) => res.json())
            .then((json) => {
                if (!cancelled && json.success) setEmails(json.data);
            })
            .catch((e) => console.error("Failed to fetch sent emails:", e))
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => { cancelled = true; };
    }, [missionFilter]);

    const formatDate = (d: string | null) => {
        if (!d) return "—";
        const date = new Date(d);
        return date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const contactName = (e: SentEmail) => {
        if (!e.contact) return "—";
        const first = e.contact.firstName ?? "";
        const last = e.contact.lastName ?? "";
        return [first, last].filter(Boolean).join(" ") || e.contact.email || "—";
    };

    const companyName = (e: SentEmail) => e.contact?.company?.name ?? "—";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Emails envoyés (missions)</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Emails envoyés depuis les missions, avec statistiques d&apos;ouverture et de clics
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                    <select
                        value={missionFilter}
                        onChange={(e) => setMissionFilter(e.target.value)}
                        className="appearance-none pl-4 pr-10 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                    >
                        <option value="">Toutes les missions</option>
                        {missions.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <Target className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
            ) : emails.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun email envoyé en mission</h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                            Les emails que vous envoyez depuis une mission (Appeler, fiche contact, etc.) apparaîtront ici avec les stats d&apos;ouverture et de clics.
                        </p>
                        <Link
                            href="/sdr/action"
                            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            Aller à Appeler
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="text-left py-3 px-4 font-medium text-slate-700">Contact / Société</th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-700">Sujet</th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-700">Mission</th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-700">Envoyé le</th>
                                    <th className="text-center py-3 px-4 font-medium text-slate-700">Ouvert</th>
                                    <th className="text-center py-3 px-4 font-medium text-slate-700">Clic</th>
                                </tr>
                            </thead>
                            <tbody>
                                {emails.map((e) => (
                                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="py-3 px-4">
                                            <div>
                                                <span className="font-medium text-slate-900">{contactName(e)}</span>
                                                <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    {companyName(e)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-700 max-w-[240px] truncate" title={e.subject}>
                                            {e.subject || "—"}
                                        </td>
                                        <td className="py-3 px-4">
                                            {e.mission ? (
                                                <span className="inline-flex items-center gap-1 text-slate-600">
                                                    <Target className="w-3.5 h-3.5" />
                                                    {e.mission.name}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                            {formatDate(e.sentAt)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {e.openCount > 0 ? (
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                                    "bg-emerald-100 text-emerald-700"
                                                )} title={e.firstOpenedAt ? formatDate(e.firstOpenedAt) : undefined}>
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Oui ({e.openCount})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                                    Non
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {e.clickCount > 0 ? (
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                                    "bg-blue-100 text-blue-700"
                                                )}>
                                                    <MousePointer className="w-3.5 h-3.5" />
                                                    Oui ({e.clickCount})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                                    Non
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
