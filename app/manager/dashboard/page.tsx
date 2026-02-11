"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Target,
    Users,
    Phone,
    Calendar,
    ArrowRight,
    Plus,
    Loader2,
    RefreshCw,
    Sparkles,
    File,
    Download,
    ChevronRight,
    Activity,
    PhoneCall,
    TrendingUp,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    UserCheck,
    Zap,
    BarChart3,
    Sun,
    Moon,
    Coffee,
    ArrowUpRight,
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

interface MissionSummaryItem {
    id: string;
    name: string;
    isActive: boolean;
    client: { id: string; name: string };
    sdrCount: number;
    actionsThisPeriod: number;
    meetingsThisPeriod: number;
    lastActionAt: string | null;
}

interface RecentActivityItem {
    id: string;
    user: string;
    userId: string;
    action: string;
    time: string;
    type: "call" | "meeting" | "schedule";
    createdAt: string;
    contactOrCompanyName?: string;
    campaignName?: string;
}

interface SdrActivityStatus {
    isActive: boolean;
    status: string;
    lastSeenMinutesAgo: number | null;
}

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
}

interface CallStats {
    totalCalls: number;
    totalDurationSeconds: number;
    byStatus: Record<string, number>;
    byUser: Array<{ userId: string; userName: string; calls: number; durationSeconds: number }>;
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

// ============================================
// HELPERS
// ============================================

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString("fr-FR");
}

function getGreeting(): { text: string; icon: typeof Sun } {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Bonjour", icon: Coffee };
    if (hour < 18) return { text: "Bon après-midi", icon: Sun };
    return { text: "Bonsoir", icon: Moon };
}

function getInitials(name: string): string {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ============================================
// ANIMATED PROGRESS RING
// ============================================

function ProgressRing({ value, max, size = 56, strokeWidth = 5, color = "#6366f1" }: {
    value: number; max: number; size?: number; strokeWidth?: number; color?: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = max > 0 ? Math.min(value / max, 1) : 0;
    const strokeDashoffset = circumference * (1 - percentage);

    return (
        <svg width={size} height={size} className="mgr-progress-ring" style={{ transform: "rotate(-90deg)" }}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100" />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke={color} strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }} />
        </svg>
    );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function ManagerDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [missionsSummary, setMissionsSummary] = useState<MissionSummaryItem[]>([]);
    const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [activityByUserId, setActivityByUserId] = useState<Record<string, SdrActivityStatus>>({});
    const [callStats, setCallStats] = useState<CallStats | null>(null);
    const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
    const [missionFilter, setMissionFilter] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<"today" | "week" | "month">("week");
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const statsUrl = `/api/stats?period=${period}${missionFilter ? `&missionId=${missionFilter}` : ""}`;
            const [statsRes, missionsSummaryRes, recentRes, usersRes, filesRes, callsRes] = await Promise.all([
                fetch(statsUrl),
                fetch(`/api/stats/missions-summary?period=${period}&limit=10`),
                fetch("/api/actions/recent?limit=10"),
                fetch("/api/users?role=SDR,BUSINESS_DEVELOPER&limit=50"),
                fetch("/api/files?limit=5"),
                fetch("/api/calls/stats"),
            ]);

            const [statsJson, missionsSummaryJson, recentJson, usersJson, filesJson, callsJson] = await Promise.all([
                statsRes.json(),
                missionsSummaryRes.json(),
                recentRes.json(),
                usersRes.json(),
                filesRes.json(),
                callsRes.json(),
            ]);

            if (statsJson.success) setStats(statsJson.data);
            if (missionsSummaryJson.success) setMissionsSummary(missionsSummaryJson.data?.missions ?? []);
            if (recentJson.success) setRecentActivity(recentJson.data ?? []);
            if (filesJson.success) setRecentFiles(filesJson.data?.files ?? []);
            if (callsJson.success && callsJson.data) setCallStats(callsJson.data);

            const users: TeamMember[] = usersJson.data?.users ?? usersJson.data ?? [];
            if (usersJson.success && Array.isArray(users)) {
                setTeamMembers(users);
                if (users.length > 0) {
                    const ids = users.map((u: TeamMember) => u.id).join(",");
                    const batchRes = await fetch(`/api/sdr/activity/batch?userIds=${encodeURIComponent(ids)}`);
                    const batchJson = await batchRes.json();
                    if (batchJson.success && batchJson.data) {
                        setActivityByUserId(batchJson.data);
                    }
                } else {
                    setActivityByUserId({});
                }
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [period, missionFilter]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // ============================================
    // DERIVED DATA
    // ============================================

    const onlineCount = useMemo(() =>
        teamMembers.filter(m => {
            const act = activityByUserId[m.id];
            return act?.isActive;
        }).length
    , [teamMembers, activityByUserId]);

    const inactiveSdrs = useMemo(() =>
        teamMembers.filter((m) => {
            if (!m.isActive) return true;
            const act = activityByUserId[m.id];
            if (!act) return true;
            if (act.lastSeenMinutesAgo !== null && act.lastSeenMinutesAgo > 1440) return true;
            return false;
        })
    , [teamMembers, activityByUserId]);

    const totalResults = useMemo(() => {
        if (!stats?.resultBreakdown) return 0;
        return Object.values(stats.resultBreakdown).reduce((a, b) => a + b, 0);
    }, [stats]);

    const greeting = getGreeting();
    const GreetingIcon = greeting.icon;

    const PERIOD_LABELS: Record<string, string> = {
        today: "Aujourd'hui",
        week: "Cette semaine",
        month: "Ce mois",
    };

    const RESULT_BREAKDOWN = [
        { key: "MEETING_BOOKED", label: "RDV pris", color: "#6366f1", bgClass: "bg-indigo-500" },
        { key: "INTERESTED", label: "Intéressé", color: "#10b981", bgClass: "bg-emerald-500" },
        { key: "CALLBACK_REQUESTED", label: "À rappeler", color: "#f59e0b", bgClass: "bg-amber-500" },
        { key: "NO_RESPONSE", label: "Pas répondu", color: "#94a3b8", bgClass: "bg-slate-400" },
        { key: "BAD_CONTACT", label: "Mauvais N°", color: "#ef4444", bgClass: "bg-red-400" },
        { key: "DISQUALIFIED", label: "Pas la cible", color: "#64748b", bgClass: "bg-slate-500" },
    ];

    // ============================================
    // LOADING STATE
    // ============================================

    if (isLoading && !stats) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <Loader2 className="w-7 h-7 text-white animate-spin" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-base font-medium text-slate-700">Chargement du tableau de bord</p>
                        <p className="text-sm text-slate-400 mt-1">Récupération de vos données...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`mgr-dashboard space-y-6 max-w-[1480px] mx-auto ${mounted ? "mgr-dashboard-mounted" : ""}`}>

            {/* ═══════════════════════════════════════════
                ROW 0 — GREETING + CONTROLS
                Warm, personal, instantly readable
               ═══════════════════════════════════════════ */}
            <div className="mgr-greeting-bar">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <GreetingIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            {greeting.text} 👋
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Voici votre vue d'ensemble · <span className="font-medium text-slate-600">{PERIOD_LABELS[period]}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Period selector — large touch targets */}
                    <div className="flex items-center bg-slate-100 rounded-xl p-1">
                        {(["today", "week", "month"] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                    period === p
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                {p === "today" ? "Aujourd'hui" : p === "week" ? "Semaine" : "Mois"}
                            </button>
                        ))}
                    </div>

                    {/* Mission filter */}
                    <select
                        value={missionFilter}
                        onChange={(e) => setMissionFilter(e.target.value)}
                        className="text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-700 min-w-[160px] hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    >
                        <option value="">Toutes les missions</option>
                        {missionsSummary.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>

                    {/* Refresh */}
                    <button
                        onClick={fetchData}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
                        title="Rafraîchir les données"
                    >
                        <RefreshCw className={`w-4.5 h-4.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
                    </button>

                    {/* New mission — primary CTA */}
                    <Link
                        href="/manager/missions/new"
                        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" /> Nouvelle mission
                    </Link>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                ROW 1 — KEY METRICS (4 big KPI cards)
                Large numbers, easy to read at a glance
               ═══════════════════════════════════════════ */}
            <div className="grid grid-cols-4 gap-5">
                {/* Missions actives */}
                <div className="mgr-kpi-card group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="mgr-kpi-label">Missions actives</p>
                            <p className="mgr-kpi-value">{stats?.activeMissions ?? 0}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Target className="w-5.5 h-5.5 text-indigo-600" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {onlineCount} SDR{onlineCount !== 1 ? "s" : ""} en ligne
                        </span>
                    </div>
                </div>

                {/* Appels */}
                <div className="mgr-kpi-card group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="mgr-kpi-label">Appels</p>
                            <p className="mgr-kpi-value">{stats?.totalActions ?? 0}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Phone className="w-5.5 h-5.5 text-emerald-600" />
                        </div>
                    </div>
                    {callStats && (
                        <div className="mt-3 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs text-slate-500">
                                {Math.floor((callStats.totalDurationSeconds || 0) / 60)} min au téléphone
                            </span>
                        </div>
                    )}
                </div>

                {/* RDV pris */}
                <div className="mgr-kpi-card group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="mgr-kpi-label">RDV décrochés</p>
                            <p className="mgr-kpi-value text-amber-600">{stats?.meetingsBooked ?? 0}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Calendar className="w-5.5 h-5.5 text-amber-600" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-600">
                                {stats && stats.totalActions > 0
                                    ? `${((stats.meetingsBooked / stats.totalActions) * 100).toFixed(1)}% conversion`
                                    : "—"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Opportunités chaudes */}
                <div className="mgr-kpi-card group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="mgr-kpi-label">Prospects chauds</p>
                            <p className="mgr-kpi-value text-cyan-600">{stats?.opportunities ?? 0}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Sparkles className="w-5.5 h-5.5 text-cyan-600" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-cyan-500" />
                        <span className="text-xs text-slate-500">Intéressés + À rappeler</span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                ROW 2 — OPERATIONS: Missions + Team
                60/40 split for main operational view
               ═══════════════════════════════════════════ */}
            <div className="grid grid-cols-[3fr_2fr] gap-5">

                {/* LEFT: Missions actives — spacious, scannable */}
                <div className="mgr-panel">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <Target className="w-4.5 h-4.5 text-indigo-600" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900">Missions actives</h2>
                        </div>
                        <Link href="/manager/missions" className="mgr-link-btn">
                            Voir tout <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {missionsSummary.length === 0 ? (
                            <div className="text-center py-10">
                                <Target className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm text-slate-400">Aucune mission active</p>
                            </div>
                        ) : (
                            missionsSummary.map((mission) => {
                                const missionProgress = mission.actionsThisPeriod > 0
                                    ? Math.min((mission.meetingsThisPeriod / Math.max(mission.actionsThisPeriod * 0.05, 1)) * 100, 100)
                                    : 0;
                                return (
                                    <Link
                                        key={mission.id}
                                        href={`/manager/missions/${mission.id}`}
                                        className="mgr-mission-row group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0 group-hover:from-indigo-100 group-hover:to-indigo-200 transition-colors">
                                            {mission.client?.name?.[0] || "M"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                                    {mission.name}
                                                </span>
                                                <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${mission.isActive
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                                }`}>
                                                    {mission.isActive ? "Actif" : "Pause"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-slate-500">{mission.client.name}</span>
                                                <span className="text-slate-300">·</span>
                                                <span className="text-xs text-slate-500">
                                                    <Users className="w-3 h-3 inline mr-0.5" />
                                                    {mission.sdrCount}
                                                </span>
                                                {mission.actionsThisPeriod > 0 && (
                                                    <>
                                                        <span className="text-slate-300">·</span>
                                                        <span className="text-xs font-medium text-slate-700">
                                                            {mission.actionsThisPeriod} appels
                                                        </span>
                                                        <span className="text-xs font-medium text-amber-600">
                                                            {mission.meetingsThisPeriod} RDV
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT: Team + Leaderboard */}
                <div className="mgr-panel flex flex-col">
                    {/* Top SDRs */}
                    <div className="mb-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                                <BarChart3 className="w-4.5 h-4.5 text-amber-600" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900">Top performers</h2>
                        </div>
                        <div className="space-y-1.5">
                            {!stats?.leaderboard?.length ? (
                                <p className="text-sm text-slate-400 py-3 text-center">Pas encore de données</p>
                            ) : (
                                stats.leaderboard.slice(0, 5).map((performer, index) => (
                                    <div key={performer.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                            index === 0 ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-400/30"
                                            : index === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                                            : index === 2 ? "bg-gradient-to-br from-orange-300 to-orange-400 text-white"
                                            : "bg-slate-100 text-slate-500"
                                        }`}>
                                            {index + 1}
                                        </span>
                                        <span className="text-sm font-medium text-slate-800 truncate flex-1">{performer.name}</span>
                                        <span className="text-sm font-bold text-slate-900 tabular-nums">{performer.actions}</span>
                                        <span className="text-xs text-slate-400">actions</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Live team status */}
                    <div className="border-t border-slate-100 pt-4 mt-auto">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <h3 className="text-sm font-semibold text-slate-900">Équipe en direct</h3>
                            </div>
                            <Link href="/manager/team" className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">
                                Gérer →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {teamMembers.length === 0 ? (
                                <p className="text-sm text-slate-400 col-span-2 text-center py-2">Aucun membre</p>
                            ) : (
                                teamMembers.slice(0, 8).map((member) => {
                                    const act = activityByUserId[member.id];
                                    const isOnline = act?.isActive ?? false;
                                    const lastSeen = act?.lastSeenMinutesAgo;
                                    return (
                                        <div key={member.id} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                isOnline ? "bg-emerald-500" : "bg-slate-300"
                                            }`} />
                                            <span className="text-[13px] font-medium text-slate-700 truncate flex-1">{member.name}</span>
                                            {!isOnline && lastSeen != null && lastSeen < 1440 && (
                                                <span className="text-[11px] text-slate-400 tabular-nums">
                                                    {lastSeen >= 60 ? `${Math.floor(lastSeen / 60)}h` : `${lastSeen}m`}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {inactiveSdrs.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-xs font-medium text-slate-500">
                                        {inactiveSdrs.length} inactif{inactiveSdrs.length > 1 ? "s" : ""} depuis 24h
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {inactiveSdrs.slice(0, 4).map((m) => (
                                        <span key={m.id} className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg truncate max-w-[110px]" title={m.email}>
                                            {m.name}
                                        </span>
                                    ))}
                                    {inactiveSdrs.length > 4 && (
                                        <span className="text-xs text-slate-400 px-2 py-1">+{inactiveSdrs.length - 4}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                ROW 3 — SIGNALS: Activity + Results Breakdown
                50/50 split for real-time + outcomes
               ═══════════════════════════════════════════ */}
            <div className="grid grid-cols-2 gap-5">

                {/* LEFT: Recent Activity — clear, scannable feed */}
                <div className="mgr-panel">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                                <Activity className="w-4.5 h-4.5 text-violet-600" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900">Activité récente</h2>
                        </div>
                        <Link href="/manager/team" className="mgr-link-btn">
                            Équipe <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <div className="space-y-1">
                        {recentActivity.length === 0 ? (
                            <div className="text-center py-10">
                                <Activity className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm text-slate-400">Aucune activité récente</p>
                            </div>
                        ) : (
                            recentActivity.slice(0, 8).map((item) => (
                                <div key={item.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        item.type === "meeting"
                                            ? "bg-amber-50 text-amber-600"
                                            : item.type === "call"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "bg-blue-50 text-blue-600"
                                    }`}>
                                        {item.type === "meeting" ? <Calendar className="w-3.5 h-3.5" />
                                            : item.type === "call" ? <PhoneCall className="w-3.5 h-3.5" />
                                            : <Clock className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] text-slate-800 truncate">
                                            <span className="font-semibold">{item.user}</span>{" "}
                                            <span className="text-slate-500">{item.action}</span>
                                        </p>
                                        {item.contactOrCompanyName && (
                                            <p className="text-xs text-slate-400 truncate mt-0.5">{item.contactOrCompanyName}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0 tabular-nums">{item.time}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT: Results breakdown — visual stacked bar + call stats */}
                <div className="mgr-panel">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
                            <BarChart3 className="w-4.5 h-4.5 text-cyan-600" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">Résultats des appels</h2>
                    </div>

                    {/* Visual stacked bar */}
                    {stats && totalResults > 0 && (
                        <div className="mb-5">
                            <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
                                {RESULT_BREAKDOWN.map(({ key, bgClass }) => {
                                    const value = stats.resultBreakdown[key as keyof typeof stats.resultBreakdown] || 0;
                                    const pct = totalResults > 0 ? (value / totalResults) * 100 : 0;
                                    if (pct < 0.5) return null;
                                    return (
                                        <div
                                            key={key}
                                            className={`${bgClass} transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full`}
                                            style={{ width: `${pct}%` }}
                                            title={`${RESULT_BREAKDOWN.find(r => r.key === key)?.label}: ${value}`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Result items */}
                    <div className="grid grid-cols-2 gap-3">
                        {RESULT_BREAKDOWN.map(({ key, label, color, bgClass }) => {
                            const value = stats?.resultBreakdown?.[key as keyof typeof stats.resultBreakdown] ?? 0;
                            const pct = totalResults > 0 ? ((value / totalResults) * 100).toFixed(0) : "0";
                            return (
                                <div key={key} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50/50">
                                    <div className={`w-3 h-3 rounded-full ${bgClass} flex-shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] text-slate-700">{label}</p>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900 tabular-nums">{value}</span>
                                    <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Call stats summary */}
                    {callStats && (
                        <div className="mt-5 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{callStats.totalCalls}</p>
                                    <p className="text-xs text-slate-500">appels totaux</p>
                                </div>
                                <div className="w-px h-10 bg-slate-200" />
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">
                                        {Math.floor((callStats.totalDurationSeconds || 0) / 60)}
                                    </p>
                                    <p className="text-xs text-slate-500">minutes</p>
                                </div>
                                {callStats.byUser?.length > 0 && (
                                    <>
                                        <div className="w-px h-10 bg-slate-200" />
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-slate-500 mb-1">Top appelants</p>
                                            {callStats.byUser.slice(0, 2).map((u) => (
                                                <p key={u.userId} className="text-xs text-slate-600">
                                                    {u.userName}: <span className="font-semibold">{u.calls}</span>
                                                </p>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                ROW 4 — FILES (only if files exist)
                Clean file strip with better spacing
               ═══════════════════════════════════════════ */}
            {recentFiles.length > 0 && (
                <div className="mgr-files-strip">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <File className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Fichiers récents</span>
                    </div>
                    <div className="flex flex-wrap gap-3 flex-1 justify-end">
                        {recentFiles.slice(0, 4).map((file) => (
                            <a
                                key={file.id}
                                href={`/api/files/${file.id}/download`}
                                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-500 bg-white border border-slate-200 hover:border-indigo-200 rounded-xl px-3.5 py-2 transition-all hover:shadow-sm"
                            >
                                <span className="truncate max-w-[140px]">{file.name}</span>
                                <Download className="w-3.5 h-3.5 flex-shrink-0" />
                            </a>
                        ))}
                    </div>
                    <Link href="/manager/files" className="text-sm text-slate-500 hover:text-slate-700 font-medium whitespace-nowrap">
                        Voir tout →
                    </Link>
                </div>
            )}
        </div>
    );
}
