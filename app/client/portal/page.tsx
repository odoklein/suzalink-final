"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, Badge, Button } from "@/components/ui";
import {
    Target,
    Phone,
    MessageSquare,
    Calendar,
    TrendingUp,
    Download,
    Building2,
    User,
    Clock,
    CheckCircle2,
    Loader2,
    RefreshCw,
    Sparkles,
    ArrowRight,
    Video,
    BarChart3,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface DashboardStats {
    totalActions: number;
    meetingsBooked: number;
    opportunities: number;
    activeMissions: number;
    conversionRate: number;
    resultBreakdown: {
        INTERESTED: number;
    };
}

interface Opportunity {
    id: string;
    needSummary: string;
    urgency: "SHORT" | "MEDIUM" | "LONG";
    estimatedMin?: number;
    estimatedMax?: number;
    handedOff: boolean;
    handedOffAt?: string;
    createdAt: string;
    contact: {
        firstName?: string;
        lastName?: string;
        title?: string;
    };
    company: {
        name: string;
        industry?: string;
    };
}

interface Mission {
    id: string;
    name: string;
    isActive: boolean;
    _count?: { sdrAssignments: number };
}

interface ClientMeeting {
    id: string;
    createdAt: string;
    contact: {
        firstName?: string;
        lastName?: string;
        title?: string;
        company: { name: string };
    };
    campaign: {
        name: string;
        mission: { name: string };
    };
}

interface MeetingsResponse {
    totalMeetings: number;
    allMeetings: ClientMeeting[];
}

const URGENCY_LABELS: Record<string, { label: string; class: string }> = {
    SHORT: { label: "Court terme", class: "text-rose-700 bg-rose-100" },
    MEDIUM: { label: "Moyen terme", class: "text-amber-700 bg-amber-100" },
    LONG: { label: "Long terme", class: "text-emerald-700 bg-emerald-100" },
};

const PERIOD_OPTIONS = [
    { value: "today", label: "Aujourd'hui" },
    { value: "week", label: "7 jours" },
    { value: "month", label: "30 jours" },
];

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
}

export default function ClientPortal() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [meetings, setMeetings] = useState<ClientMeeting[]>([]);
    const [period, setPeriod] = useState("month");
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const clientId = (session?.user as { clientId?: string })?.clientId;
    const userName = session?.user?.name?.split(" ")[0] ?? "Client";

    const fetchData = async (refresh = false) => {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        try {
            const [statsRes, oppsRes, missionsRes, meetingsRes] = await Promise.all([
                fetch(`/api/stats?period=${period}`),
                fetch("/api/opportunities?limit=10"),
                fetch("/api/missions?isActive=true"),
                clientId ? fetch(`/api/clients/${clientId}/meetings`) : Promise.resolve(null),
            ]);

            const [statsJson, oppsJson, missionsJson, meetingsJson] = await Promise.all([
                statsRes.json(),
                oppsRes.json(),
                missionsRes.json(),
                meetingsRes?.ok ? meetingsRes.json() : Promise.resolve(null),
            ]);

            if (statsJson.success) setStats(statsJson.data);
            if (oppsJson.success) setOpportunities(Array.isArray(oppsJson.data) ? oppsJson.data : []);
            if (missionsJson.success) setMissions(Array.isArray(missionsJson.data) ? missionsJson.data : []);
            if (meetingsJson?.success) {
                const data = meetingsJson.data as MeetingsResponse;
                setMeetings(data?.allMeetings ?? []);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period, clientId]);

    const CLIENT_STATS = [
        { label: "Missions en cours", value: stats?.activeMissions ?? 0, icon: Target, color: "indigo" },
        { label: "Entreprises contactées", value: stats?.totalActions ?? 0, icon: Phone, color: "violet" },
        { label: "Personnes intéressées", value: stats?.resultBreakdown?.INTERESTED ?? 0, icon: MessageSquare, color: "emerald" },
        { label: "RDV pris pour vous", value: stats?.meetingsBooked ?? 0, icon: Calendar, color: "amber" },
    ];

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    const exportOpportunitiesCsv = () => {
        if (opportunities.length === 0) return;
        const headers = ["Entreprise", "Contact", "Titre", "Besoin", "Urgence", "Transmis", "Date"];
        const rows = opportunities.map((o) => [
            o.company.name,
            [o.contact.firstName, o.contact.lastName].filter(Boolean).join(" ") || "-",
            o.contact.title || "-",
            (o.needSummary || "").replace(/"/g, '""'),
            URGENCY_LABELS[o.urgency]?.label ?? o.urgency,
            o.handedOff ? "Oui" : "Non",
            formatDate(o.handedOffAt || o.createdAt),
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `opportunites-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center animate-pulse">
                        <Zap className="w-8 h-8 text-white" />
                    </div>
                    <Loader2 className="absolute -bottom-1 -right-1 w-6 h-6 text-indigo-500 animate-spin" />
                </div>
                <p className="text-slate-500 text-sm font-medium">Chargement de votre tableau de bord…</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 shadow-xl shadow-indigo-500/20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div>
                        <p className="text-indigo-200 text-sm font-medium mb-1">{getGreeting()}, {userName}</p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            Votre tableau de bord
                        </h1>
                        <p className="text-indigo-200/90 mt-2 max-w-xl">
                            Suivi en temps réel de vos missions et des contacts qualifiés
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex rounded-xl overflow-hidden bg-white/10 backdrop-blur border border-white/20">
                            {PERIOD_OPTIONS.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPeriod(p.value)}
                                    className={cn(
                                        "px-4 py-2.5 text-sm font-medium transition-all",
                                        period === p.value
                                            ? "bg-white text-indigo-700"
                                            : "text-white/90 hover:bg-white/5"
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchData(true)}
                            disabled={isRefreshing}
                            className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                            Actualiser
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Grid - Premium cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {CLIENT_STATS.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Card
                            key={stat.label}
                            className={cn(
                                "group relative overflow-hidden border-0 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                                stat.color === "indigo" && "bg-gradient-to-br from-indigo-50 to-white",
                                stat.color === "violet" && "bg-gradient-to-br from-violet-50 to-white",
                                stat.color === "emerald" && "bg-gradient-to-br from-emerald-50 to-white",
                                stat.color === "amber" && "bg-gradient-to-br from-amber-50 to-white"
                            )}
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{stat.value}</p>
                                </div>
                                <div
                                    className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                                        stat.color === "indigo" && "bg-indigo-100 text-indigo-600",
                                        stat.color === "violet" && "bg-violet-100 text-violet-600",
                                        stat.color === "emerald" && "bg-emerald-100 text-emerald-600",
                                        stat.color === "amber" && "bg-amber-100 text-amber-600"
                                    )}
                                >
                                    <Icon className="w-6 h-6" />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Conversion Rate Banner */}
            {stats && stats.totalActions > 0 && (
                <Card className="border-0 bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                            <BarChart3 className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold">Taux de conversion (RDV / contacts)</h3>
                            <p className="text-slate-300 text-sm mt-0.5">
                                {stats.meetingsBooked} RDV pour {stats.totalActions} entreprises contactées
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-bold text-emerald-400">{stats.conversionRate?.toFixed(1) ?? 0}%</span>
                        </div>
                    </div>
                </Card>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Opportunities */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Contacts qualifiés pour vous
                            </h2>
                            <Badge variant="primary">{opportunities.length}</Badge>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={exportOpportunitiesCsv}
                            disabled={opportunities.length === 0}
                            className="gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Exporter CSV
                        </Button>
                    </div>

                    {opportunities.length === 0 ? (
                        <Card className="border-slate-200 bg-white shadow-sm">
                            <div className="text-center py-16">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
                                    <Sparkles className="w-8 h-8 text-indigo-500" />
                                </div>
                                <p className="font-semibold text-slate-800">Aucun contact qualifié pour le moment</p>
                                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                                    Les personnes intéressées par vos offres apparaîtront ici dès qu&apos;elles seront identifiées par notre équipe.
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {opportunities.map((opp) => (
                                <Card
                                    key={opp.id}
                                    className="border-slate-200 bg-white hover:border-indigo-200 hover:shadow-lg transition-all duration-200 cursor-default group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                            <Building2 className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold text-slate-900">{opp.company.name}</h3>
                                                <span
                                                    className={cn(
                                                        "text-xs font-medium px-2.5 py-1 rounded-full",
                                                        URGENCY_LABELS[opp.urgency]?.class ?? "bg-slate-100 text-slate-600"
                                                    )}
                                                >
                                                    {URGENCY_LABELS[opp.urgency]?.label ?? opp.urgency}
                                                </span>
                                                {opp.handedOff && (
                                                    <Badge variant="success">Transmis</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500">
                                                <User className="w-4 h-4 flex-shrink-0" />
                                                <span>
                                                    {[opp.contact.firstName, opp.contact.lastName].filter(Boolean).join(" ") || "—"}
                                                    {opp.contact.title && ` · ${opp.contact.title}`}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 mt-3 leading-relaxed line-clamp-2">
                                                {opp.needSummary}
                                            </p>
                                            <div className="flex flex-wrap items-center justify-between mt-4 pt-4 border-t border-slate-100 gap-2">
                                                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                                    <Clock className="w-4 h-4" />
                                                    {opp.handedOffAt
                                                        ? `Transmis le ${formatDate(opp.handedOffAt)}`
                                                        : `Créé le ${formatDate(opp.createdAt)}`}
                                                </div>
                                                {(opp.estimatedMin != null || opp.estimatedMax != null) && (
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {[opp.estimatedMin, opp.estimatedMax].filter(Boolean).map((v) => `${v?.toLocaleString()}€`).join(" – ")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar: Missions + Meetings + CTA */}
                <div className="space-y-6">
                    {/* Missions */}
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Vos missions</h2>
                        {missions.length === 0 ? (
                            <Card className="border-slate-200 bg-white">
                                <div className="text-center py-8">
                                    <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">Aucune mission en cours</p>
                                </div>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {missions.map((mission) => (
                                    <Card key={mission.id} className="border-slate-200 bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 truncate">{mission.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    Équipe dédiée
                                                    {mission._count?.sdrAssignments != null && ` · ${mission._count.sdrAssignments} SDR(s)`}
                                                </p>
                                            </div>
                                            <Badge variant={mission.isActive ? "success" : "default"}>
                                                {mission.isActive ? "En cours" : "Pause"}
                                            </Badge>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Meetings */}
                    {meetings.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Video className="w-5 h-5 text-indigo-500" />
                                RDV planifiés
                            </h2>
                            <div className="space-y-3">
                                {meetings.slice(0, 5).map((m) => (
                                    <Card key={m.id} className="border-slate-200 bg-white">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                <Calendar className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 truncate">
                                                    {[m.contact.firstName, m.contact.lastName].filter(Boolean).join(" ") || "Contact"} · {m.contact.company.name}
                                                </p>
                                                <p className="text-xs text-slate-500">{m.campaign.mission.name}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{formatDate(m.createdAt)}</p>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Contact CTA */}
                    <Link href="/client/contact">
                        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 hover:border-indigo-300 transition-all cursor-pointer group shadow-md hover:shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                    <MessageSquare className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-indigo-900">Contacter l&apos;équipe</p>
                                    <p className="text-sm text-indigo-700">Échanger avec les SDR de vos missions</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-indigo-500 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Card>
                    </Link>
                </div>
            </div>

            {/* Info Notice */}
            <Card className="border-slate-200 bg-slate-50/80">
                <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-900">Données à jour</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Les indicateurs et contacts sont mis à jour automatiquement. Les opportunités vous sont transmises dès qu&apos;elles sont qualifiées.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
