"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui";
import {
    BarChart3,
    TrendingUp,
    Phone,
    Calendar,
    Target,
    Users,
    RefreshCw,
    Download,
    Loader2,
    Sparkles,
    Award,
    ArrowUp,
    ArrowDown,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface Stats {
    actions: {
        today: number;
        week: number;
        month: number;
    };
    results: {
        MEETING_SCHEDULED: number;
        CALLBACK_REQUESTED: number;
        NOT_INTERESTED: number;
        NO_ANSWER: number;
        BAD_CONTACT: number;
    };
    opportunities: {
        total: number;
        thisWeek: number;
    };
    leaderboard: Array<{
        userId: string;
        userName: string;
        userEmail: string;
        actions: number;
        meetings: number;
    }>;
}

// ============================================
// ANALYTICS PAGE
// ============================================

export default function AnalyticsPage() {
    const { error: showError } = useToast();
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<string>("week");

    // ============================================
    // FETCH STATS
    // ============================================

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/stats?period=${period}`);
            const json = await res.json();

            if (json.success) {
                setStats(json.data);
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            console.error("Failed to fetch stats:", err);
            showError("Erreur", "Impossible de charger les statistiques");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [period]);

    // ============================================
    // CALCULATE DERIVED METRICS
    // ============================================

    const totalActions = stats?.actions?.week || 0;
    const meetings = stats?.results?.MEETING_SCHEDULED || 0;
    const meetingsPerHundred = totalActions > 0 ? ((meetings / totalActions) * 100).toFixed(1) : "0";
    const avgConversionRate = totalActions > 0 ? ((meetings / totalActions) * 100).toFixed(1) : "0";

    // Results breakdown for chart-like display
    const resultsTotal = stats?.results ? Object.values(stats.results).reduce((a, b) => a + b, 0) : 0;
    const resultsBreakdown = stats?.results ? [
        { label: "Meetings", value: stats.results.MEETING_SCHEDULED || 0, color: "bg-emerald-500", percent: resultsTotal > 0 ? ((stats.results.MEETING_SCHEDULED || 0) / resultsTotal) * 100 : 0 },
        { label: "Rappel demandé", value: stats.results.CALLBACK_REQUESTED || 0, color: "bg-blue-500", percent: resultsTotal > 0 ? ((stats.results.CALLBACK_REQUESTED || 0) / resultsTotal) * 100 : 0 },
        { label: "Pas intéressé", value: stats.results.NOT_INTERESTED || 0, color: "bg-amber-500", percent: resultsTotal > 0 ? ((stats.results.NOT_INTERESTED || 0) / resultsTotal) * 100 : 0 },
        { label: "Pas de réponse", value: stats.results.NO_ANSWER || 0, color: "bg-slate-400", percent: resultsTotal > 0 ? ((stats.results.NO_ANSWER || 0) / resultsTotal) * 100 : 0 },
        { label: "Mauvais contact", value: stats.results.BAD_CONTACT || 0, color: "bg-red-500", percent: resultsTotal > 0 ? ((stats.results.BAD_CONTACT || 0) / resultsTotal) * 100 : 0 },
    ] : [];

    if (isLoading && !stats) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-slate-500">Chargement des statistiques...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 rounded-2xl p-8 text-white">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-200 text-sm font-medium mb-2">
                            <BarChart3 className="w-4 h-4" />
                            <span>Reporting Suzali</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
                        <p className="text-indigo-100 max-w-xl">
                            Analysez les performances de vos équipes et optimisez vos campagnes
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchStats}
                            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </button>
                        <button className="flex items-center gap-2 h-10 px-4 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                            <Download className="w-4 h-4" />
                            Exporter
                        </button>
                    </div>
                </div>
            </div>

            {/* Period Selector */}
            <div className="mgr-period-selector w-fit">
                {(["today", "week", "month"] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`mgr-period-btn ${period === p ? "active" : ""}`}
                    >
                        {p === "today" ? "Aujourd'hui" : p === "week" ? "Cette semaine" : "Ce mois"}
                    </button>
                ))}
            </div>

            {/* Premium KPI Cards */}
            <div className="grid grid-cols-4 gap-5">
                <div className="mgr-stat-card">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Phone className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{totalActions}</p>
                    <p className="text-sm text-slate-500 mt-1">Actions totales</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600">
                        <ArrowUp className="w-3 h-3" />
                        {stats?.actions?.today || 0} aujourd'hui
                    </div>
                </div>
                <div className="mgr-stat-card">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{meetings}</p>
                    <p className="text-sm text-slate-500 mt-1">Meetings</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600">
                        {meetingsPerHundred}% de conversion
                    </div>
                </div>
                <div className="mgr-stat-card">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Target className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats?.opportunities?.total || 0}</p>
                    <p className="text-sm text-slate-500 mt-1">Opportunités</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
                        +{stats?.opportunities?.thisWeek || 0} cette semaine
                    </div>
                </div>
                <div className="mgr-stat-card">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-cyan-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{avgConversionRate}%</p>
                    <p className="text-sm text-slate-500 mt-1">Taux qualification</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600">
                        Meetings/Actions
                    </div>
                </div>
            </div>

            {/* Results Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-violet-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">Répartition des résultats</h2>
                </div>

                <div className="space-y-4">
                    {/* Stacked Bar */}
                    <div className="h-10 rounded-xl overflow-hidden flex shadow-inner">
                        {resultsBreakdown.map((item) => (
                            <div
                                key={item.label}
                                className={`${item.color} transition-all duration-500`}
                                style={{ width: `${item.percent}%` }}
                                title={`${item.label}: ${item.value}`}
                            />
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-5 gap-4">
                        {resultsBreakdown.map((item) => (
                            <div key={item.label} className="text-center p-3 rounded-lg bg-slate-50">
                                <div className={`w-3 h-3 rounded-full ${item.color} mx-auto mb-2`} />
                                <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                                <p className="text-xs text-slate-500">{item.label}</p>
                                <p className="text-xs text-slate-400">{item.percent.toFixed(1)}%</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* SDR Leaderboard */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Award className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Classement SDRs</h2>
                            <p className="text-sm text-slate-500">{stats?.leaderboard?.length || 0} SDRs</p>
                        </div>
                    </div>
                </div>

                {stats?.leaderboard?.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Aucune donnée de performance</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <th className="pb-4">Rang</th>
                                    <th className="pb-4">SDR</th>
                                    <th className="pb-4 text-right">Actions</th>
                                    <th className="pb-4 text-right">Meetings</th>
                                    <th className="pb-4 text-right">Conversion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.leaderboard?.map((sdr, index) => {
                                    const conversion = sdr.actions > 0
                                        ? ((sdr.meetings / sdr.actions) * 100).toFixed(1)
                                        : "0";

                                    return (
                                        <tr key={sdr.userId} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="py-4">
                                                <span className={`mgr-leaderboard-rank ${index === 0 ? "mgr-leaderboard-rank-1" : index === 1 ? "mgr-leaderboard-rank-2" : index === 2 ? "mgr-leaderboard-rank-3" : "bg-slate-100 text-slate-500"}`}>
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-600">
                                                        {sdr.userName?.split(" ").map(n => n[0]).join("") || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-900 font-medium">{sdr.userName || "Inconnu"}</p>
                                                        <p className="text-xs text-slate-500">{sdr.userEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right">
                                                <span className="text-slate-900 font-semibold">{sdr.actions}</span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <span className="text-emerald-600 font-semibold">{sdr.meetings}</span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <span className={`px-2.5 py-1 rounded-lg text-sm font-medium ${parseFloat(conversion) > 5 ? "bg-emerald-50 text-emerald-600" :
                                                    parseFloat(conversion) > 2 ? "bg-amber-50 text-amber-600" :
                                                        "bg-slate-100 text-slate-500"
                                                    }`}>
                                                    {conversion}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Premium Insights Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-3">Insights automatiques</h3>
                        <ul className="text-sm text-slate-600 space-y-2">
                            {stats?.results && stats.results.BAD_CONTACT > (resultsTotal * 0.1) && (
                                <li className="flex items-start gap-2">
                                    <ArrowDown className="w-4 h-4 text-red-500 mt-0.5" />
                                    <span>Taux de mauvais contacts élevé ({((stats.results.BAD_CONTACT / resultsTotal) * 100).toFixed(0)}%) - vérifiez la qualité des listes</span>
                                </li>
                            )}
                            {stats && parseFloat(avgConversionRate) < 2 && (
                                <li className="flex items-start gap-2">
                                    <ArrowDown className="w-4 h-4 text-amber-500 mt-0.5" />
                                    <span>Taux de conversion faible ({avgConversionRate}%) - envisagez d'optimiser les scripts</span>
                                </li>
                            )}
                            {stats && parseFloat(avgConversionRate) >= 5 && (
                                <li className="flex items-start gap-2">
                                    <ArrowUp className="w-4 h-4 text-emerald-500 mt-0.5" />
                                    <span>Excellent taux de conversion ({avgConversionRate}%) - continuez ainsi!</span>
                                </li>
                            )}
                            {stats?.leaderboard && stats.leaderboard.length > 0 && (
                                <li className="flex items-start gap-2">
                                    <Award className="w-4 h-4 text-amber-500 mt-0.5" />
                                    <span>Top performer: <strong>{stats.leaderboard[0].userName}</strong> avec {stats.leaderboard[0].actions} actions et {stats.leaderboard[0].meetings} meetings</span>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div >
    );
}
