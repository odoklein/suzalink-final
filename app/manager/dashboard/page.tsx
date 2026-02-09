"use client";

import { useState, useEffect, useCallback } from "react";
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

    const inactiveSdrs = teamMembers.filter((m) => {
        if (!m.isActive) return true;
        const act = activityByUserId[m.id];
        if (!act) return true;
        if (act.lastSeenMinutesAgo !== null && act.lastSeenMinutesAgo > 1440) return true;
        return false;
    });

    const STATS_CARDS = [
        { label: "Missions", value: stats?.activeMissions ?? 0, icon: Target, iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
        { label: "Appels", value: stats?.totalActions ?? 0, icon: Phone, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
        { label: "RDV", value: stats?.meetingsBooked ?? 0, icon: Calendar, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
        { label: "Chauds", value: stats?.opportunities ?? 0, icon: Sparkles, iconBg: "bg-cyan-100", iconColor: "text-cyan-600" },
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
        <div className="space-y-4 max-w-[1600px]">
            {/* ROW 1 — Snapshot: compact header + KPIs + controls inline */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-slate-200">
                <div className="flex items-center gap-4 flex-wrap">
                    <h1 className="text-lg font-semibold text-slate-800">Tableau de bord</h1>
                    <div className="flex items-center gap-2">
                        {(["today", "week", "month"] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${period === p ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                            >
                                {p === "today" ? "Auj." : p === "week" ? "Sem." : "Mois"}
                            </button>
                        ))}
                    </div>
                    <select
                        value={missionFilter}
                        onChange={(e) => setMissionFilter(e.target.value)}
                        className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 min-w-[140px]"
                    >
                        <option value="">Toutes les missions</option>
                        {missionsSummary.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <button onClick={fetchData} className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50" title="Rafraîchir">
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    <Link href="/manager/missions/new" className="text-xs font-medium px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Nouvelle mission
                    </Link>
                </div>
            </div>

            {/* KPI row — single row, compact */}
            <div className="grid grid-cols-4 gap-3">
                {STATS_CARDS.map((stat) => (
                    <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{stat.label}</p>
                            <p className="text-xl font-bold text-slate-900 mt-0.5 dev-counter">{stat.value}</p>
                        </div>
                        <div className={`w-9 h-9 rounded-lg ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* ROW 2 — Operations: 60% Missions | 40% Team (Top SDRs + Live + Inactifs) */}
            <div className="grid grid-cols-[3fr_2fr] gap-4">
                {/* Left: Missions actives — compact list */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-slate-900">Missions actives</h2>
                        <Link href="/manager/missions" className="text-xs text-indigo-600 hover:text-indigo-500 flex items-center gap-0.5">
                            Voir tout <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="space-y-1.5">
                        {missionsSummary.length === 0 ? (
                            <p className="text-xs text-slate-500 py-4">Aucune mission active</p>
                        ) : (
                            missionsSummary.map((mission) => (
                                <Link
                                    key={mission.id}
                                    href={`/manager/missions/${mission.id}`}
                                    className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-sm font-semibold text-indigo-600 flex-shrink-0">
                                        {mission.client?.name?.[0] || "M"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600">{mission.name}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${mission.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                {mission.isActive ? "Actif" : "Pause"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">
                                            {mission.client.name} · {mission.sdrCount} SDR{mission.sdrCount > 1 ? "s" : ""}
                                            {mission.actionsThisPeriod > 0 && <> · {mission.actionsThisPeriod} act. · {mission.meetingsThisPeriod} RDV</>}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Team Performance — Top SDRs + Équipe en direct + SDRs inactifs */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900 mb-2">Top SDRs</h2>
                        <div className="space-y-1">
                            {!stats?.leaderboard?.length ? (
                                <p className="text-xs text-slate-500 py-2">Pas de données</p>
                            ) : (
                                stats.leaderboard.map((performer, index) => (
                                    <div key={performer.id} className="flex items-center gap-2 py-1">
                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-slate-200 text-slate-600" : "bg-slate-100 text-slate-500"}`}>
                                            {index + 1}
                                        </span>
                                        <span className="text-sm font-medium text-slate-900 truncate">{performer.name}</span>
                                        <span className="text-xs text-slate-400 ml-auto">{performer.actions}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="border-t border-slate-100 pt-3">
                        <h2 className="text-sm font-semibold text-slate-900 mb-2">Équipe en direct</h2>
                        <div className="space-y-1">
                            {teamMembers.length === 0 ? (
                                <p className="text-xs text-slate-500 py-1">Aucun SDR</p>
                            ) : (
                                teamMembers.slice(0, 6).map((member) => {
                                    const act = activityByUserId[member.id];
                                    const isOnline = act?.isActive ?? false;
                                    const lastSeen = act?.lastSeenMinutesAgo;
                                    const statusLabel = act?.status === "online" || act?.status === "busy" ? "En ligne" : act?.status === "away" ? "Absent" : "Hors ligne";
                                    return (
                                        <div key={member.id} className="flex items-center gap-2 py-0.5">
                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
                                            <span className="text-xs font-medium text-slate-900 truncate flex-1">{member.name}</span>
                                            {!isOnline && lastSeen != null && lastSeen < 1440 && (
                                                <span className="text-[10px] text-slate-400">{lastSeen >= 60 ? `${Math.floor(lastSeen / 60)}h` : `${lastSeen}m`}</span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    {inactiveSdrs.length > 0 && (
                        <div className="border-t border-slate-100 pt-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-slate-500">Inactifs (24h)</span>
                                <Link href="/manager/team" className="text-[10px] text-indigo-600 hover:text-indigo-500">Voir</Link>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {inactiveSdrs.slice(0, 4).map((m) => (
                                    <span key={m.id} className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[100px]" title={m.email}>
                                        {m.name}{!m.isActive ? " (off)" : ""}
                                    </span>
                                ))}
                                {inactiveSdrs.length > 4 && <span className="text-[10px] text-slate-400">+{inactiveSdrs.length - 4}</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ROW 3 — Signals: 50% Activité récente | 50% Call outcomes (calls + result distribution) */}
            <div className="grid grid-cols-2 gap-4">
                {/* Left: Activité récente — compact feed */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-slate-900">Activité récente</h2>
                        <Link href="/manager/team" className="text-xs text-indigo-600 hover:text-indigo-500 flex items-center gap-0.5">Équipe <ArrowRight className="w-3 h-3" /></Link>
                    </div>
                    <div className="space-y-1">
                        {recentActivity.length === 0 ? (
                            <p className="text-xs text-slate-500 py-3">Aucune activité</p>
                        ) : (
                            recentActivity.slice(0, 8).map((item) => (
                                <div key={item.id} className="flex items-baseline gap-2 py-1.5 border-b border-slate-50 last:border-0">
                                    <span className="text-xs text-slate-500 whitespace-nowrap w-14">{item.time}</span>
                                    <p className="text-xs text-slate-900 truncate flex-1 min-w-0">
                                        <span className="font-medium">{item.user}</span> {item.action}
                                        {item.contactOrCompanyName && <span className="text-slate-500"> — {item.contactOrCompanyName}</span>}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Call outcomes — calls + result distribution merged */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900 mb-2">Appels</h2>
                            {callStats ? (
                                <>
                                    <p className="text-2xl font-bold text-slate-900">{callStats.totalCalls}</p>
                                    <p className="text-xs text-slate-500">{Math.floor((callStats.totalDurationSeconds || 0) / 60)} min</p>
                                    {callStats.byUser?.length > 0 && (
                                        <div className="mt-2 space-y-0.5">
                                            {callStats.byUser.slice(0, 3).map((u) => (
                                                <p key={u.userId} className="text-[10px] text-slate-600">{u.userName}: {u.calls}</p>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-xs text-slate-500">—</p>
                            )}
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900 mb-2">Résultats</h2>
                            {stats ? (
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                    {RESULT_BREAKDOWN.map(({ key, label, color }) => {
                                        const value = stats.resultBreakdown[key as keyof typeof stats.resultBreakdown];
                                        return (
                                            <div key={key} className="flex items-center gap-1">
                                                <span className={`w-2 h-2 rounded-sm ${color}`} />
                                                <span className="text-xs text-slate-700">{label}</span>
                                                <span className="text-xs font-semibold text-slate-900">{value}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500">—</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact footer strip: recent files */}
            {recentFiles.length > 0 && (
                <div className="flex items-center gap-4 py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                        <File className="w-3.5 h-3.5" /> Fichiers récents
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {recentFiles.slice(0, 4).map((file) => (
                            <a key={file.id} href={`/api/files/${file.id}/download`} className="text-xs text-indigo-600 hover:text-indigo-500 truncate max-w-[160px] flex items-center gap-1">
                                {file.name} <Download className="w-3 h-3 flex-shrink-0" />
                            </a>
                        ))}
                    </div>
                    <Link href="/manager/files" className="text-xs text-slate-500 hover:text-slate-700 ml-auto">Voir tout</Link>
                </div>
            )}
        </div>
    );
}
