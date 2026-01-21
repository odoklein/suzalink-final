"use client";

import { useState, useEffect } from "react";
import {
    Target,
    Users,
    Phone,
    Calendar,
    TrendingUp,
    ArrowRight,
    Plus,
    Loader2,
    RefreshCw,
    Sparkles,
    File,
    Download,
    BarChart3,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";

// ============================================
// TYPES
// ============================================

interface DashboardStats {
    period: string;
    totalActions: number;
    meetingsBooked: number;
    opportunities: number;
    activeMissions: number;
    conversionRate: number;
    resultBreakdown: {
        NO_RESPONSE: number;
        BAD_CONTACT: number;
        INTERESTED: number;
        CALLBACK_REQUESTED: number;
        MEETING_BOOKED: number;
        DISQUALIFIED: number;
    };
    leaderboard: { id: string; name: string; actions: number }[];
}

interface Mission {
    id: string;
    name: string;
    isActive: boolean;
    client: { name: string };
    _count: { sdrAssignments: number };
}

interface FileItem {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    formattedSize: string;
    createdAt: string;
    uploadedBy: {
        name: string;
    };
}

export default function ManagerDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<"today" | "week" | "month">("week");

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, missionsRes, filesRes] = await Promise.all([
                fetch(`/api/stats?period=${period}`),
                fetch("/api/missions?limit=5&isActive=true"),
                fetch("/api/files?limit=5"),
            ]);

            const [statsJson, missionsJson, filesJson] = await Promise.all([
                statsRes.json(),
                missionsRes.json(),
                filesRes.json(),
            ]);

            if (statsJson.success) setStats(statsJson.data);
            if (missionsJson.success) setMissions(missionsJson.data);
            if (filesJson.success) setRecentFiles(filesJson.data.files);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [period]);

    const STATS_CARDS = [
        {
            label: "Missions en cours",
            value: stats?.activeMissions || 0,
            icon: Target,
            gradient: "from-indigo-500 to-indigo-600",
            iconBg: "bg-indigo-100",
            iconColor: "text-indigo-600",
        },
        {
            label: "Appels cette période",
            value: stats?.totalActions || 0,
            icon: Phone,
            gradient: "from-emerald-500 to-emerald-600",
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-600",
        },
        {
            label: "RDV pris",
            value: stats?.meetingsBooked || 0,
            icon: Calendar,
            gradient: "from-amber-500 to-amber-600",
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
            subtitle: stats?.totalActions ? `1 RDV pour ${Math.round(stats.totalActions / (stats.meetingsBooked || 1))} appels` : null,
        },
        {
            label: "Contacts chauds",
            value: stats?.opportunities || 0,
            icon: Sparkles,
            gradient: "from-cyan-500 to-cyan-600",
            iconBg: "bg-cyan-100",
            iconColor: "text-cyan-600",
        },
    ];

    const RESULT_BREAKDOWN = [
        { key: "NO_RESPONSE", label: "Pas répondu", color: "bg-slate-400" },
        { key: "BAD_CONTACT", label: "Mauvais numéro", color: "bg-red-500" },
        { key: "INTERESTED", label: "Intéressé", color: "bg-emerald-500" },
        { key: "CALLBACK_REQUESTED", label: "À rappeler", color: "bg-amber-500" },
        { key: "MEETING_BOOKED", label: "RDV pris", color: "bg-indigo-500" },
        { key: "DISQUALIFIED", label: "Pas la bonne personne", color: "bg-slate-500" },
    ];

    if (isLoading && !stats) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-slate-500">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-50" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>Accueil</span>
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Bonjour !</h1>
                    <p className="text-slate-400 max-w-xl">
                        Voici où en sont vos équipes et vos missions.
                    </p>
                </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div className="mgr-period-selector">
                    {(["today", "week", "month"] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`mgr-period-btn ${period === p ? "active" : ""}`}
                        >
                            {p === "today" ? "Aujourd'hui" : p === "week" ? "Semaine" : "Mois"}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    <Link
                        href="/manager/missions/new"
                        className="mgr-btn-primary flex items-center gap-2 h-10 px-5 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Nouvelle mission
                    </Link>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-4 gap-5">
                {STATS_CARDS.map((stat, index) => (
                    <div key={stat.label} className="mgr-stat-card" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1 dev-counter">{stat.value}</p>
                                {stat.subtitle && (
                                    <div className="flex items-center gap-1.5 mt-2 text-sm text-emerald-600">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>{stat.subtitle}</span>
                                    </div>
                                )}
                            </div>
                            <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-3 gap-6">
                {/* Recent Missions */}
                <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <Target className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Missions actives</h2>
                                <p className="text-sm text-slate-500">{missions.length} en cours</p>
                            </div>
                        </div>
                        <Link
                            href="/manager/missions"
                            className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
                        >
                            Voir tout <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {missions.length === 0 ? (
                            <div className="text-center py-12">
                                <Target className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-sm text-slate-500">Aucune mission active</p>
                            </div>
                        ) : (
                            missions.map((mission) => (
                                <Link
                                    key={mission.id}
                                    href={`/manager/missions/${mission.id}`}
                                    className="mgr-mission-card group flex items-center gap-4 block"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                                        {mission.client?.name?.[0] || "M"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {mission.name}
                                            </span>
                                            <span className={mission.isActive ? "mgr-badge-active" : "mgr-badge-paused"}>
                                                {mission.isActive ? "Actif" : "Pause"}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {mission.client.name} · {mission._count.sdrAssignments} SDR{mission._count.sdrAssignments > 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Top SDRs</h2>
                            <p className="text-sm text-slate-500">
                                {period === "today" ? "Aujourd'hui" : period === "week" ? "Cette semaine" : "Ce mois"}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        {!stats?.leaderboard?.length ? (
                            <div className="text-center py-8">
                                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm text-slate-500">Pas encore de données</p>
                            </div>
                        ) : (
                            stats.leaderboard.map((performer, index) => (
                                <div key={performer.id} className="mgr-leaderboard-item">
                                    <div className={`mgr-leaderboard-rank ${index === 0 ? "mgr-leaderboard-rank-1" : index === 1 ? "mgr-leaderboard-rank-2" : "mgr-leaderboard-rank-3"}`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-900">{performer.name}</p>
                                        <p className="text-sm text-slate-500">{performer.actions} actions</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Files */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                <File className="w-5 h-5 text-violet-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Fichiers récents</h2>
                        </div>
                        <Link
                            href="/manager/files"
                            className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
                        >
                            Voir tout <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {recentFiles.length === 0 ? (
                            <div className="text-center py-8">
                                <File className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm text-slate-500">Aucun fichier</p>
                            </div>
                        ) : (
                            recentFiles.map((file) => {
                                const isImage = file.mimeType.startsWith("image/");
                                const isVideo = file.mimeType.startsWith("video/");
                                const isDocument = file.mimeType.includes("pdf") || file.mimeType.includes("document");

                                return (
                                    <div key={file.id} className="mgr-file-item">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                            {isImage && <File className="w-5 h-5 text-indigo-500" />}
                                            {isVideo && <File className="w-5 h-5 text-purple-500" />}
                                            {isDocument && <File className="w-5 h-5 text-emerald-500" />}
                                            {!isImage && !isVideo && !isDocument && <File className="w-5 h-5 text-slate-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {file.uploadedBy.name} · {file.formattedSize}
                                            </p>
                                        </div>
                                        <a
                                            href={`/api/files/${file.id}/download`}
                                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                                        >
                                            <Download className="w-4 h-4 text-slate-400" />
                                        </a>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Results Breakdown */}
            {stats && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Répartition des résultats</h2>
                    </div>
                    <div className="grid grid-cols-6 gap-4">
                        {RESULT_BREAKDOWN.map(({ key, label, color }) => {
                            const value = stats.resultBreakdown[key as keyof typeof stats.resultBreakdown];
                            const total = Object.values(stats.resultBreakdown).reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return (
                                <div key={key} className="text-center">
                                    <div className="h-24 flex flex-col justify-end mb-2">
                                        <div
                                            className={`mgr-results-bar ${color} mx-auto w-12`}
                                            style={{ height: `${Math.max(percentage * 0.8, 8)}px` }}
                                        />
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
