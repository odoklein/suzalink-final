"use client";

import { useState, useEffect } from "react";
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
    _count: { sdrAssignments: number };
}

const URGENCY_LABELS = {
    SHORT: { label: "Court terme", color: "text-red-400 bg-red-500/15" },
    MEDIUM: { label: "Moyen terme", color: "text-amber-400 bg-amber-500/15" },
    LONG: { label: "Long terme", color: "text-emerald-400 bg-emerald-500/15" },
};

export default function ClientPortal() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ============================================
    // FETCH DATA
    // ============================================

    const fetchData = async () => {
        setIsLoading(true);
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
            if (oppsJson.success) setOpportunities(oppsJson.data);
            if (missionsJson.success) setMissions(missionsJson.data);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ============================================
    // STATS CARDS
    // ============================================

    const CLIENT_STATS = [
        { label: "Missions en cours", value: stats?.activeMissions || 0, icon: Target },
        { label: "Entreprises contactées", value: stats?.totalActions || 0, icon: Phone },
        { label: "Personnes intéressées", value: stats?.resultBreakdown?.INTERESTED || 0, icon: MessageSquare },
        { label: "RDV pris pour vous", value: stats?.meetingsBooked || 0, icon: Calendar },
    ];

    // ============================================
    // FORMAT DATE
    // ============================================

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (isLoading && !stats) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Bienvenue chez Suzalink</h1>
                    <p className="text-neutral-500 mt-1">
                        Voici l'avancement de vos missions
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchData} className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    Actualiser
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6">
                {CLIENT_STATS.map((stat) => (
                    <Card key={stat.label}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-neutral-500">{stat.label}</p>
                                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                                <stat.icon className="w-5 h-5 text-indigo-400" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-3 gap-6">
                {/* Opportunities - Main Focus */}
                <div className="col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-white">
                                Contacts qualifiés pour vous
                            </h2>
                            <Badge variant="primary">{opportunities.length}</Badge>
                        </div>
                        <Button variant="secondary" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Télécharger
                        </Button>
                    </div>

                    {opportunities.length === 0 ? (
                        <Card>
                            <div className="text-center py-8">
                                <Sparkles className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                                <p className="text-neutral-400">Pas encore de contacts pour le moment</p>
                                <p className="text-sm text-neutral-500 mt-1">
                                    Les personnes intéressées apparaîtront ici
                                </p>
                            </div>
                        </Card>
                    ) : (
                        opportunities.map((opp) => (
                            <Card key={opp.id} className="hover:border-neutral-700 transition-colors">
                                <div className="flex items-start gap-4">
                                    {/* Company Icon */}
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                                        <Building2 className="w-6 h-6 text-emerald-400" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="font-semibold text-white">{opp.company.name}</h3>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full ${URGENCY_LABELS[opp.urgency].color}`}
                                            >
                                                {URGENCY_LABELS[opp.urgency].label}
                                            </span>
                                            {opp.handedOff && (
                                                <Badge variant="success">Transmis</Badge>
                                            )}
                                        </div>

                                        {/* Contact */}
                                        <div className="flex items-center gap-2 mt-2 text-sm text-neutral-400">
                                            <User className="w-4 h-4" />
                                            <span>
                                                {opp.contact.firstName} {opp.contact.lastName}
                                            </span>
                                            {opp.contact.title && (
                                                <>
                                                    <span className="text-neutral-600">·</span>
                                                    <span>{opp.contact.title}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Need Summary */}
                                        <p className="text-sm text-neutral-300 mt-3 leading-relaxed">
                                            {opp.needSummary}
                                        </p>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-800">
                                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                                <Clock className="w-4 h-4" />
                                                <span>
                                                    {opp.handedOffAt
                                                        ? `Transmis le ${formatDate(opp.handedOffAt)}`
                                                        : `Créé le ${formatDate(opp.createdAt)}`}
                                                </span>
                                            </div>
                                            {(opp.estimatedMin || opp.estimatedMax) && (
                                                <div className="text-sm">
                                                    <span className="text-neutral-500">Valeur estimée: </span>
                                                    <span className="text-white font-medium">
                                                        {opp.estimatedMin?.toLocaleString() || "?"}€ -{" "}
                                                        {opp.estimatedMax?.toLocaleString() || "?"}€
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* Missions Summary */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white">Vos missions</h2>

                    {missions.length === 0 ? (
                        <Card>
                            <div className="text-center py-6">
                                <Target className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                                <p className="text-neutral-400 text-sm">Pas de mission en cours</p>
                            </div>
                        </Card>
                    ) : (
                        missions.map((mission) => (
                            <Card key={mission.id}>
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span className="font-medium text-white">{mission.name}</span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-neutral-500">
                                        Équipe dédiée
                                    </span>
                                    <Badge variant={mission.isActive ? "success" : "default"}>
                                        {mission.isActive ? "En cours" : "Pause"}
                                    </Badge>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Info Notice */}
            <Card className="border-neutral-800 bg-neutral-900/50">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-medium text-white">Toujours à jour</h3>
                        <p className="text-sm text-neutral-400 mt-1">
                            Vos données sont mises à jour automatiquement.
                            Les contacts intéressants vous sont transmis dès qu'ils sont identifiés.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
