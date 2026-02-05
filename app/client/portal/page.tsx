"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface DashboardStats {
    totalActions: number;
    meetingsBooked: number;
    opportunities: number;
    activeMissions: number;
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

const URGENCY_LABELS: Record<string, { label: string; class: string }> = {
    SHORT: { label: "Court terme", class: "text-rose-700 bg-rose-100" },
    MEDIUM: { label: "Moyen terme", class: "text-amber-700 bg-amber-100" },
    LONG: { label: "Long terme", class: "text-emerald-700 bg-emerald-100" },
};

export default function ClientPortal() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = async (refresh = false) => {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        try {
            const [statsRes, oppsRes, missionsRes] = await Promise.all([
                fetch("/api/stats?period=month"),
                fetch("/api/opportunities?limit=10"),
                fetch("/api/missions?isActive=true"),
            ]);

            const [statsJson, oppsJson, missionsJson] = await Promise.all([
                statsRes.json(),
                oppsRes.json(),
                missionsRes.json(),
            ]);

            if (statsJson.success) setStats(statsJson.data);
            if (oppsJson.success) setOpportunities(Array.isArray(oppsJson.data) ? oppsJson.data : []);
            if (missionsJson.success) setMissions(Array.isArray(missionsJson.data) ? missionsJson.data : []);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const CLIENT_STATS = [
        { label: "Missions en cours", value: stats?.activeMissions ?? 0, icon: Target },
        { label: "Entreprises contactées", value: stats?.totalActions ?? 0, icon: Phone },
        { label: "Personnes intéressées", value: stats?.resultBreakdown?.INTERESTED ?? 0, icon: MessageSquare },
        { label: "RDV pris pour vous", value: stats?.meetingsBooked ?? 0, icon: Calendar },
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
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-slate-500 text-sm">Chargement du tableau de bord…</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Bienvenue sur votre tableau de bord</h1>
                    <p className="text-slate-500 mt-1">
                        Suivi de vos missions et des contacts qualifiés
                    </p>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fetchData(true)}
                    disabled={isRefreshing}
                    className="gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Actualiser
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {CLIENT_STATS.map((stat) => (
                    <Card key={stat.label} className="border-slate-200 bg-white shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <stat.icon className="w-5 h-5 text-indigo-600" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main Content */}
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
                        <Card className="border-slate-200 bg-white">
                            <div className="text-center py-12">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                    <Sparkles className="w-7 h-7 text-slate-400" />
                                </div>
                                <p className="font-medium text-slate-700">Aucun contact qualifié pour le moment</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    Les personnes intéressées par vos offres apparaîtront ici dès qu’elles seront identifiées.
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {opportunities.map((opp) => (
                                <Card
                                    key={opp.id}
                                    className="border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <Building2 className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold text-slate-900">{opp.company.name}</h3>
                                                <span
                                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${URGENCY_LABELS[opp.urgency]?.class ?? "bg-slate-100 text-slate-600"}`}
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

                {/* Missions + CTA */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Vos missions</h2>
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
                                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
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

                    <Link href="/client/contact">
                        <Card className="border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-indigo-900">Contacter l’équipe</p>
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
                            Les indicateurs et contacts sont mis à jour automatiquement. Les opportunités vous sont transmises dès qu’elles sont qualifiées.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
