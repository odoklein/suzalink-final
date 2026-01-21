"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Calendar,
    Clock,
    Target,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Activity,
    Award,
    Flame,
    Star,
    CheckCircle,
    XCircle,
    Loader2,
    RefreshCw,
    Edit,
    Settings,
    Download,
    ChevronRight,
    Timer,
    Zap,
    Trophy,
    Crown,
    Medal,
    ArrowUpRight,
    ArrowDownRight,
    Play,
    Pause,
    CalendarDays,
    PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ============================================
// TYPES
// ============================================

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    _count: {
        assignedMissions: number;
        actions: number;
    };
}

interface ScheduleBlock {
    id: string;
    sdrId: string;
    missionId: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    notes?: string;
    mission: {
        id: string;
        name: string;
        channel?: string;
        client?: { name: string };
    };
}

interface ActionStats {
    result: string;
    count: number;
    date: string;
}

interface DetailedMetrics {
    // Time metrics
    scheduledHours: { today: number; thisWeek: number; thisMonth: number };
    completedHours: { today: number; thisWeek: number; thisMonth: number };
    utilizationRate: { thisWeek: number; thisMonth: number };

    // Performance
    calls: { today: number; thisWeek: number; thisMonth: number; total: number };
    meetings: { today: number; thisWeek: number; thisMonth: number; total: number };
    conversionRate: { thisWeek: number; thisMonth: number; overall: number };
    avgCallsPerHour: number;
    avgCallDuration: number;

    // Results breakdown
    resultBreakdown: { result: string; count: number; percentage: number }[];

    // Daily trend (last 14 days)
    dailyTrend: { date: string; calls: number; meetings: number; hours: number }[];

    // Hourly distribution
    hourlyDistribution: { hour: string; calls: number }[];

    // Missions
    missionPerformance: { missionId: string; missionName: string; calls: number; meetings: number }[];

    // Streak & gamification
    currentStreak: number;
    longestStreak: number;
    rank: number;
    score: number;
    achievements: { id: string; name: string; icon: string; earnedAt: string }[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
}

function calcHours(start: string, end: string): number {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return (eh * 60 + em - sh * 60 - sm) / 60;
}

function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

function getInitials(name: string): string {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getWeekDates(): Date[] {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    return Array.from({ length: 5 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

// ============================================
// STAT CARD
// ============================================

function StatCard({
    icon: Icon,
    label,
    value,
    subValue,
    trend,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subValue?: string;
    trend?: { value: number; isPositive: boolean };
    color: "indigo" | "emerald" | "amber" | "rose" | "blue" | "purple";
}) {
    const colors = {
        indigo: "from-indigo-500 to-indigo-600",
        emerald: "from-emerald-500 to-emerald-600",
        amber: "from-amber-500 to-amber-600",
        rose: "from-rose-500 to-rose-600",
        blue: "from-blue-500 to-blue-600",
        purple: "from-purple-500 to-purple-600",
    };

    return (
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-5 group hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
                    <p className="text-3xl font-bold text-slate-900">{value}</p>
                    {subValue && (
                        <p className="text-sm text-slate-400 mt-1">{subValue}</p>
                    )}
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 mt-2 text-sm font-medium",
                            trend.isPositive ? "text-emerald-600" : "text-rose-600"
                        )}>
                            {trend.isPositive ? (
                                <ArrowUpRight className="w-4 h-4" />
                            ) : (
                                <ArrowDownRight className="w-4 h-4" />
                            )}
                            <span>{trend.value}%</span>
                        </div>
                    )}
                </div>
                <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                    colors[color]
                )}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );
}

// ============================================
// MINI BAR CHART
// ============================================

function MiniBarChart({
    data,
    valueKey,
    color = "indigo",
}: {
    data: { label: string; value: number }[];
    valueKey?: string;
    color?: string;
}) {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="flex items-end justify-between gap-1 h-20">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                        className={cn(
                            "w-full rounded-t-sm transition-all duration-300",
                            `bg-${color}-500`
                        )}
                        style={{
                            height: `${Math.max((d.value / maxValue) * 60, 4)}px`,
                            background: `linear-gradient(to top, rgb(99, 102, 241), rgb(129, 140, 248))`,
                        }}
                    />
                    <span className="text-[10px] text-slate-400">{d.label}</span>
                </div>
            ))}
        </div>
    );
}

// ============================================
// RESULT BREAKDOWN DONUT
// ============================================

function ResultBreakdown({
    data,
}: {
    data: { result: string; count: number; percentage: number }[];
}) {
    const resultLabels: Record<string, { label: string; color: string }> = {
        MEETING_BOOKED: { label: "RDV pris", color: "bg-emerald-500" },
        INTERESTED: { label: "Intéressé", color: "bg-blue-500" },
        CALLBACK_REQUESTED: { label: "Rappel", color: "bg-amber-500" },
        NO_RESPONSE: { label: "Pas de réponse", color: "bg-slate-400" },
        BAD_CONTACT: { label: "Mauvais contact", color: "bg-rose-400" },
        DISQUALIFIED: { label: "Non qualifié", color: "bg-slate-300" },
    };

    return (
        <div className="space-y-2">
            {data.slice(0, 5).map((item) => {
                const config = resultLabels[item.result] || { label: item.result, color: "bg-slate-400" };
                return (
                    <div key={item.result} className="flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full", config.color)} />
                        <span className="flex-1 text-sm text-slate-600">{config.label}</span>
                        <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                        <span className="text-xs text-slate-400 w-10 text-right">{item.percentage}%</span>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================
// SCHEDULE TIMELINE
// ============================================

function ScheduleTimeline({
    blocks,
    date,
}: {
    blocks: ScheduleBlock[];
    date: Date;
}) {
    const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8AM to 6PM
    const dateStr = formatDate(date);
    const dayBlocks = blocks.filter(b => b.date.split("T")[0] === dateStr);

    return (
        <div className="relative">
            {/* Time markers */}
            <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col">
                {hours.map((h) => (
                    <div key={h} className="flex-1 flex items-start">
                        <span className="text-[10px] text-slate-400">{h}:00</span>
                    </div>
                ))}
            </div>

            {/* Timeline track */}
            <div className="ml-14 relative h-60 bg-slate-50 rounded-lg border border-slate-100">
                {/* Hour lines */}
                {hours.map((h, i) => (
                    <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-slate-100"
                        style={{ top: `${(i / hours.length) * 100}%` }}
                    />
                ))}

                {/* Blocks */}
                {dayBlocks.map((block) => {
                    const [sh, sm] = block.startTime.split(":").map(Number);
                    const [eh, em] = block.endTime.split(":").map(Number);
                    const startMinutes = sh * 60 + sm - 8 * 60;
                    const endMinutes = eh * 60 + em - 8 * 60;
                    const totalMinutes = 10 * 60;

                    const top = (startMinutes / totalMinutes) * 100;
                    const height = ((endMinutes - startMinutes) / totalMinutes) * 100;

                    const statusColors: Record<string, string> = {
                        SCHEDULED: "bg-indigo-100 border-l-indigo-500",
                        IN_PROGRESS: "bg-amber-100 border-l-amber-500",
                        COMPLETED: "bg-emerald-100 border-l-emerald-500",
                        CANCELLED: "bg-slate-100 border-l-slate-400",
                    };

                    return (
                        <div
                            key={block.id}
                            className={cn(
                                "absolute left-1 right-1 rounded-md border-l-4 px-2 py-1 overflow-hidden",
                                statusColors[block.status] || statusColors.SCHEDULED
                            )}
                            style={{ top: `${top}%`, height: `${height}%` }}
                        >
                            <p className="text-xs font-medium text-slate-900 truncate">
                                {block.mission.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {block.startTime} - {block.endTime}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================
// ACHIEVEMENT BADGE
// ============================================

function AchievementBadge({
    name,
    icon,
    earnedAt,
}: {
    name: string;
    icon: string;
    earnedAt: string;
}) {
    const iconMap: Record<string, React.ElementType> = {
        trophy: Trophy,
        star: Star,
        flame: Flame,
        crown: Crown,
        medal: Medal,
        zap: Zap,
    };

    const Icon = iconMap[icon] || Star;

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center">
                <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
                <p className="text-xs font-semibold text-amber-900">{name}</p>
                <p className="text-[10px] text-amber-600">{earnedAt}</p>
            </div>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamMemberDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { success, error: showError } = useToast();
    const memberId = params.id as string;

    const [member, setMember] = useState<TeamMember | null>(null);
    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [metrics, setMetrics] = useState<DetailedMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "performance" | "history">("overview");

    const weekDates = useMemo(() => getWeekDates(), []);

    // ============================================
    // FETCH DATA
    // ============================================

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                // Fetch member details
                const [memberRes, blocksRes, statsRes] = await Promise.all([
                    fetch(`/api/users/${memberId}`),
                    fetch(`/api/planning?userId=${memberId}&startDate=${formatDate(weekDates[0])}&endDate=${formatDate(weekDates[4])}`),
                    fetch(`/api/actions/stats?userId=${memberId}`),
                ]);

                const memberJson = await memberRes.json();
                const blocksJson = await blocksRes.json();
                const statsJson = await statsRes.json();

                if (memberJson.success) {
                    setMember(memberJson.data);
                }

                if (blocksJson.success) {
                    setBlocks(blocksJson.data.blocks || blocksJson.data || []);
                }

                // Compute detailed metrics
                const memberBlocks = blocksJson.data?.blocks || blocksJson.data || [];
                const userStats = statsJson.data?.[memberId] || {};

                // Calculate hours from blocks
                const todayStr = formatDate(new Date());
                const todayBlocks = memberBlocks.filter((b: ScheduleBlock) => b.date.split("T")[0] === todayStr);
                const weekBlocks = memberBlocks;

                const scheduledHoursToday = todayBlocks.reduce((sum: number, b: ScheduleBlock) =>
                    sum + calcHours(b.startTime, b.endTime), 0);
                const completedHoursToday = todayBlocks
                    .filter((b: ScheduleBlock) => b.status === "COMPLETED")
                    .reduce((sum: number, b: ScheduleBlock) => sum + calcHours(b.startTime, b.endTime), 0);

                const scheduledHoursWeek = weekBlocks.reduce((sum: number, b: ScheduleBlock) =>
                    sum + calcHours(b.startTime, b.endTime), 0);
                const completedHoursWeek = weekBlocks
                    .filter((b: ScheduleBlock) => b.status === "COMPLETED")
                    .reduce((sum: number, b: ScheduleBlock) => sum + calcHours(b.startTime, b.endTime), 0);

                // Generate mock metrics (in real app, this would come from API)
                const detailedMetrics: DetailedMetrics = {
                    scheduledHours: {
                        today: scheduledHoursToday,
                        thisWeek: scheduledHoursWeek,
                        thisMonth: scheduledHoursWeek * 4,
                    },
                    completedHours: {
                        today: completedHoursToday,
                        thisWeek: completedHoursWeek,
                        thisMonth: completedHoursWeek * 4,
                    },
                    utilizationRate: {
                        thisWeek: scheduledHoursWeek > 0 ? Math.round((completedHoursWeek / scheduledHoursWeek) * 100) : 0,
                        thisMonth: 85,
                    },
                    calls: {
                        today: userStats.callsToday || Math.floor(Math.random() * 20) + 5,
                        thisWeek: userStats.callsThisWeek || Math.floor(Math.random() * 80) + 20,
                        thisMonth: userStats.callsThisMonth || Math.floor(Math.random() * 300) + 100,
                        total: userStats.totalActions || Math.floor(Math.random() * 1000) + 500,
                    },
                    meetings: {
                        today: Math.floor(Math.random() * 3),
                        thisWeek: userStats.meetingsThisWeek || Math.floor(Math.random() * 8),
                        thisMonth: userStats.meetingsThisMonth || Math.floor(Math.random() * 25),
                        total: userStats.meetingsBooked || Math.floor(Math.random() * 100),
                    },
                    conversionRate: {
                        thisWeek: userStats.conversionRate || Number((Math.random() * 10 + 2).toFixed(1)),
                        thisMonth: Number((Math.random() * 10 + 2).toFixed(1)),
                        overall: Number((Math.random() * 10 + 2).toFixed(1)),
                    },
                    avgCallsPerHour: completedHoursWeek > 0
                        ? Number(((userStats.callsThisWeek || 50) / completedHoursWeek).toFixed(1))
                        : 0,
                    avgCallDuration: Math.floor(Math.random() * 180) + 60, // seconds
                    resultBreakdown: [
                        { result: "MEETING_BOOKED", count: 8, percentage: 8 },
                        { result: "INTERESTED", count: 15, percentage: 15 },
                        { result: "CALLBACK_REQUESTED", count: 12, percentage: 12 },
                        { result: "NO_RESPONSE", count: 45, percentage: 45 },
                        { result: "DISQUALIFIED", count: 20, percentage: 20 },
                    ],
                    dailyTrend: Array.from({ length: 14 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (13 - i));
                        return {
                            date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                            calls: Math.floor(Math.random() * 25) + 5,
                            meetings: Math.floor(Math.random() * 3),
                            hours: Math.floor(Math.random() * 6) + 2,
                        };
                    }),
                    hourlyDistribution: Array.from({ length: 10 }, (_, i) => ({
                        hour: `${i + 8}h`,
                        calls: Math.floor(Math.random() * 15) + 3,
                    })),
                    missionPerformance: [
                        { missionId: "1", missionName: "Acme Corp Q1", calls: 45, meetings: 4 },
                        { missionId: "2", missionName: "Tech Startup Outreach", calls: 32, meetings: 2 },
                        { missionId: "3", missionName: "Enterprise Sales", calls: 28, meetings: 1 },
                    ],
                    currentStreak: Math.floor(Math.random() * 15),
                    longestStreak: Math.floor(Math.random() * 30) + 10,
                    rank: Math.floor(Math.random() * 5) + 1,
                    score: Math.floor(Math.random() * 2000) + 500,
                    achievements: [
                        { id: "1", name: "First Meeting", icon: "star", earnedAt: "Il y a 2 semaines" },
                        { id: "2", name: "10 Meetings", icon: "trophy", earnedAt: "Il y a 1 mois" },
                        { id: "3", name: "100 Appels", icon: "flame", earnedAt: "Il y a 3 semaines" },
                    ],
                };

                setMetrics(detailedMetrics);

            } catch (err) {
                console.error("Error fetching member data:", err);
                showError("Erreur", "Impossible de charger les données");
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [memberId, weekDates, showError]);

    // ============================================
    // RENDER LOADING
    // ============================================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-slate-500">Chargement du profil...</p>
                </div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="text-center py-20">
                <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Membre non trouvé</p>
                <Link
                    href="/manager/team"
                    className="inline-flex items-center gap-2 mt-4 text-indigo-600 hover:text-indigo-700"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour à l&apos;équipe
                </Link>
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/manager/team"
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-lg font-bold text-indigo-600">
                            {getInitials(member.name)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{member.name}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                    {member.role}
                                </span>
                                <span className="flex items-center gap-1 text-sm text-slate-500">
                                    <Mail className="w-3.5 h-3.5" />
                                    {member.email}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <Download className="w-4 h-4 text-slate-500" />
                    </button>
                    <button className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <Settings className="w-4 h-4 text-slate-500" />
                    </button>
                    <button className="mgr-btn-primary px-4 py-2.5 flex items-center gap-2 text-sm font-medium">
                        <Edit className="w-4 h-4" />
                        Modifier
                    </button>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-5 gap-4">
                <StatCard
                    icon={Clock}
                    label="Heures cette semaine"
                    value={formatHours(metrics?.completedHours.thisWeek || 0)}
                    subValue={`/ ${formatHours(metrics?.scheduledHours.thisWeek || 0)} prévues`}
                    color="indigo"
                />
                <StatCard
                    icon={Phone}
                    label="Appels ce jour"
                    value={metrics?.calls.today || 0}
                    trend={{ value: 12, isPositive: true }}
                    color="blue"
                />
                <StatCard
                    icon={Calendar}
                    label="RDV cette semaine"
                    value={metrics?.meetings.thisWeek || 0}
                    color="emerald"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Taux conversion"
                    value={`${metrics?.conversionRate.thisWeek || 0}%`}
                    color="amber"
                />
                <StatCard
                    icon={Zap}
                    label="Appels/heure"
                    value={metrics?.avgCallsPerHour || 0}
                    color="purple"
                />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                {[
                    { id: "overview", label: "Vue d'ensemble", icon: BarChart3 },
                    { id: "schedule", label: "Planning", icon: Calendar },
                    { id: "performance", label: "Performance", icon: TrendingUp },
                    { id: "history", label: "Historique", icon: Clock },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
                            activeTab === tab.id
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
                <div className="grid grid-cols-3 gap-6">
                    {/* Left column */}
                    <div className="space-y-6">
                        {/* Daily trend */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-semibold text-slate-900 mb-4">Tendance 14 jours</h3>
                            <MiniBarChart
                                data={(metrics?.dailyTrend || []).map(d => ({
                                    label: d.date.split("/")[0],
                                    value: d.calls,
                                }))}
                            />
                        </div>

                        {/* Achievements */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                <h3 className="font-semibold text-slate-900">Succès</h3>
                            </div>
                            <div className="space-y-2">
                                {(metrics?.achievements || []).map((a) => (
                                    <AchievementBadge
                                        key={a.id}
                                        name={a.name}
                                        icon={a.icon}
                                        earnedAt={a.earnedAt}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Center column */}
                    <div className="space-y-6">
                        {/* Result breakdown */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-semibold text-slate-900 mb-4">Résultats des appels</h3>
                            <ResultBreakdown data={metrics?.resultBreakdown || []} />
                        </div>

                        {/* Hourly distribution */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-semibold text-slate-900 mb-4">Activité par heure</h3>
                            <MiniBarChart
                                data={(metrics?.hourlyDistribution || []).map(d => ({
                                    label: d.hour,
                                    value: d.calls,
                                }))}
                            />
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-6">
                        {/* Today's schedule */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-900">Planning du jour</h3>
                                <span className="text-xs text-slate-400">
                                    {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                                </span>
                            </div>
                            <ScheduleTimeline blocks={blocks} date={new Date()} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "schedule" && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-slate-900">Planning de la semaine</h3>
                        <div className="flex items-center gap-2">
                            {weekDates.map((date, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                        formatDate(date) === formatDate(selectedDate)
                                            ? "bg-indigo-100 text-indigo-700"
                                            : "hover:bg-slate-100 text-slate-600"
                                    )}
                                >
                                    {date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ScheduleTimeline blocks={blocks} date={selectedDate} />
                </div>
            )}

            {activeTab === "performance" && (
                <div className="grid grid-cols-2 gap-6">
                    {/* Mission performance */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 mb-4">Performance par mission</h3>
                        <div className="space-y-3">
                            {(metrics?.missionPerformance || []).map((m) => (
                                <div key={m.missionId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                        <Target className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900">{m.missionName}</p>
                                        <p className="text-xs text-slate-500">{m.calls} appels • {m.meetings} RDV</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-indigo-600">
                                            {m.calls > 0 ? ((m.meetings / m.calls) * 100).toFixed(1) : 0}%
                                        </p>
                                        <p className="text-xs text-slate-400">conversion</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gamification stats */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="w-5 h-5 text-amber-500" />
                            <h3 className="font-semibold text-slate-900">Gamification</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Flame className="w-5 h-5 text-orange-500" />
                                    <span className="text-sm text-amber-700">Streak actuel</span>
                                </div>
                                <p className="text-3xl font-bold text-amber-900">{metrics?.currentStreak || 0} jours</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="w-5 h-5 text-indigo-500" />
                                    <span className="text-sm text-indigo-700">Classement</span>
                                </div>
                                <p className="text-3xl font-bold text-indigo-900">#{metrics?.rank || "-"}</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Star className="w-5 h-5 text-emerald-500" />
                                    <span className="text-sm text-emerald-700">Score</span>
                                </div>
                                <p className="text-3xl font-bold text-emerald-900">{metrics?.score || 0} pts</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Crown className="w-5 h-5 text-purple-500" />
                                    <span className="text-sm text-purple-700">Meilleur streak</span>
                                </div>
                                <p className="text-3xl font-bold text-purple-900">{metrics?.longestStreak || 0} jours</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "history" && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-900 mb-4">Historique des actions</h3>
                    <p className="text-slate-500">Historique détaillé des appels et actions à venir...</p>
                </div>
            )}
        </div>
    );
}
