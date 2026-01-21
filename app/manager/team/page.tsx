"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/components/ui";
import {
    Users,
    Clock,
    TrendingUp,
    Target,
    Phone,
    Calendar,
    Activity,
    Award,
    BarChart3,
    ChevronRight,
    RefreshCw,
    Loader2,
    Timer,
    Zap,
    Star,
    Trophy,
    Medal,
    Crown,
    Flame,
    CheckCircle,
    XCircle,
    Pause,
    Play,
    MoreVertical,
    Eye,
    UserPlus,
    Mail,
    ExternalLink,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    CalendarDays,
    PieChart,
    Settings,
    Download,
    Search,
    Filter,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    // Computed metrics
    metrics?: TeamMemberMetrics;
}

interface TeamMemberMetrics {
    // Time metrics
    scheduledHoursThisWeek: number;
    scheduledHoursThisMonth: number;
    completedHoursThisWeek: number;
    completedHoursThisMonth: number;

    // Performance metrics
    callsToday: number;
    callsThisWeek: number;
    callsThisMonth: number;
    avgCallsPerHour: number;

    // Results
    meetingsBooked: number;
    meetingsBookedThisWeek: number;
    conversionRate: number;

    // Activity
    lastActiveAt: string | null;
    currentMission: string | null;
    activeBlockId: string | null;
    status: "online" | "busy" | "away" | "offline";

    // Weekly breakdown
    dailyHours: { day: string; scheduled: number; completed: number }[];

    // Streak and gamification
    currentStreak: number;
    weeklyRank: number;
    monthlyScore: number;
}

interface ScheduleBlock {
    id: string;
    sdrId: string;
    missionId: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    mission: {
        id: string;
        name: string;
        client?: { name: string };
    };
}

interface TeamStats {
    totalMembers: number;
    activeMembers: number;
    totalScheduledHours: number;
    totalCompletedHours: number;
    utilizationRate: number;
    totalCalls: number;
    totalMeetings: number;
    avgConversionRate: number;
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG = {
    online: { color: "bg-emerald-500", label: "En ligne", pulse: true },
    busy: { color: "bg-amber-500", label: "Occupé", pulse: true },
    away: { color: "bg-slate-400", label: "Absent", pulse: false },
    offline: { color: "bg-slate-300", label: "Hors ligne", pulse: false },
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    SDR: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    BUSINESS_DEVELOPER: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    MANAGER: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    DEVELOPER: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
};

const ROLE_LABELS: Record<string, string> = {
    SDR: "SDR",
    BUSINESS_DEVELOPER: "Business Dev",
    MANAGER: "Manager",
    DEVELOPER: "Développeur",
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

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

// ============================================
// STAT CARD COMPONENT
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
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-5 group hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300">
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
                            <span className="text-slate-400 font-normal">vs semaine dernière</span>
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

            {/* Decorative gradient */}
            <div className={cn(
                "absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br",
                colors[color]
            )} />
        </div>
    );
}

// ============================================
// HOURS BREAKDOWN BAR
// ============================================

function HoursBreakdownBar({
    scheduled,
    completed,
    maxHours = 40,
}: {
    scheduled: number;
    completed: number;
    maxHours?: number;
}) {
    const scheduledPercent = Math.min((scheduled / maxHours) * 100, 100);
    const completedPercent = Math.min((completed / maxHours) * 100, 100);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Heures cette semaine</span>
                <span className="font-medium text-slate-700">
                    {formatHours(completed)} / {formatHours(scheduled)}
                </span>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                {/* Scheduled (background) */}
                <div
                    className="absolute inset-y-0 left-0 bg-indigo-200 rounded-full transition-all duration-500"
                    style={{ width: `${scheduledPercent}%` }}
                />
                {/* Completed (foreground) */}
                <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${completedPercent}%` }}
                />
            </div>
        </div>
    );
}

// ============================================
// DAILY HOURS CHART
// ============================================

function DailyHoursChart({
    data,
}: {
    data: { day: string; scheduled: number; completed: number }[];
}) {
    const maxHours = Math.max(...data.map(d => Math.max(d.scheduled, d.completed)), 8);

    return (
        <div className="flex items-end justify-between gap-1 h-16">
            {data.map((d, i) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-0.5 h-12">
                        {/* Scheduled bar */}
                        <div
                            className="w-2 bg-indigo-100 rounded-t transition-all duration-300"
                            style={{ height: `${(d.scheduled / maxHours) * 100}%` }}
                        />
                        {/* Completed bar */}
                        <div
                            className="w-2 bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t transition-all duration-300"
                            style={{ height: `${(d.completed / maxHours) * 100}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{d.day}</span>
                </div>
            ))}
        </div>
    );
}

// ============================================
// RANK BADGE
// ============================================

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) {
        return (
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full text-white text-xs font-bold shadow-lg shadow-amber-200">
                <Crown className="w-3 h-3" />
                <span>#1</span>
            </div>
        );
    }
    if (rank === 2) {
        return (
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-slate-300 to-slate-400 rounded-full text-white text-xs font-bold">
                <Medal className="w-3 h-3" />
                <span>#2</span>
            </div>
        );
    }
    if (rank === 3) {
        return (
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-600 to-amber-700 rounded-full text-white text-xs font-bold">
                <Award className="w-3 h-3" />
                <span>#3</span>
            </div>
        );
    }
    return (
        <div className="px-2 py-1 bg-slate-100 rounded-full text-slate-600 text-xs font-medium">
            #{rank}
        </div>
    );
}

// ============================================
// STREAK BADGE
// ============================================

function StreakBadge({ streak }: { streak: number }) {
    if (streak === 0) return null;

    return (
        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-white text-xs font-bold">
            <Flame className="w-3 h-3" />
            <span>{streak}j</span>
        </div>
    );
}

// ============================================
// MEMBER CARD
// ============================================

function MemberCard({
    member,
    onViewDetails,
}: {
    member: TeamMember;
    onViewDetails: () => void;
}) {
    const metrics = member.metrics || {
        scheduledHoursThisWeek: 0,
        completedHoursThisWeek: 0,
        callsThisWeek: 0,
        avgCallsPerHour: 0,
        meetingsBookedThisWeek: 0,
        conversionRate: 0,
        status: "offline" as const,
        currentMission: null,
        currentStreak: 0,
        weeklyRank: 0,
        dailyHours: [
            { day: "L", scheduled: 0, completed: 0 },
            { day: "M", scheduled: 0, completed: 0 },
            { day: "M", scheduled: 0, completed: 0 },
            { day: "J", scheduled: 0, completed: 0 },
            { day: "V", scheduled: 0, completed: 0 },
        ],
    };

    const roleConfig = ROLE_COLORS[member.role] || ROLE_COLORS.SDR;
    const statusConfig = STATUS_CONFIG[metrics.status];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
            {/* Header with status */}
            <div className="relative p-5 pb-3">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-lg font-bold text-indigo-600">
                            {getInitials(member.name)}
                        </div>
                        {/* Status indicator */}
                        <span className={cn(
                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                            statusConfig.color,
                            statusConfig.pulse && "animate-pulse"
                        )} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 truncate">{member.name}</h3>
                            {metrics.weeklyRank > 0 && metrics.weeklyRank <= 3 && (
                                <RankBadge rank={metrics.weeklyRank} />
                            )}
                            <StreakBadge streak={metrics.currentStreak} />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                roleConfig.bg, roleConfig.text
                            )}>
                                {ROLE_LABELS[member.role] || member.role}
                            </span>
                            <span className="text-xs text-slate-400">{statusConfig.label}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <button
                        onClick={onViewDetails}
                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                </div>

                {/* Current mission */}
                {metrics.currentMission && (
                    <div className="mt-3 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="flex items-center gap-2 text-sm">
                            <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
                            <span className="text-indigo-700 font-medium truncate">
                                {metrics.currentMission}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats grid */}
            <div className="px-5 pb-4">
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {/* Calls */}
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                        <Phone className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-slate-900">{metrics.callsThisWeek}</p>
                        <p className="text-[10px] text-slate-500">Appels</p>
                    </div>
                    {/* Meetings */}
                    <div className="text-center p-3 bg-emerald-50 rounded-xl">
                        <Calendar className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-slate-900">{metrics.meetingsBookedThisWeek}</p>
                        <p className="text-[10px] text-slate-500">RDV</p>
                    </div>
                    {/* Conversion */}
                    <div className="text-center p-3 bg-amber-50 rounded-xl">
                        <TrendingUp className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-slate-900">{metrics.conversionRate}%</p>
                        <p className="text-[10px] text-slate-500">Conversion</p>
                    </div>
                </div>

                {/* Hours breakdown */}
                <HoursBreakdownBar
                    scheduled={metrics.scheduledHoursThisWeek}
                    completed={metrics.completedHoursThisWeek}
                />
            </div>

            {/* Daily chart */}
            <div className="px-5 pb-4 border-t border-slate-100 pt-4">
                <DailyHoursChart data={metrics.dailyHours} />
            </div>

            {/* Footer with actions */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatHours(metrics.avgCallsPerHour)} appels/h</span>
                </div>
                <button
                    onClick={onViewDetails}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                    Voir détails
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ============================================
// LEADERBOARD
// ============================================

function Leaderboard({
    members,
    metric,
}: {
    members: TeamMember[];
    metric: "calls" | "meetings" | "hours";
}) {
    const sorted = useMemo(() => {
        return [...members]
            .filter(m => m.metrics)
            .sort((a, b) => {
                const am = a.metrics!;
                const bm = b.metrics!;
                switch (metric) {
                    case "calls":
                        return bm.callsThisWeek - am.callsThisWeek;
                    case "meetings":
                        return bm.meetingsBookedThisWeek - am.meetingsBookedThisWeek;
                    case "hours":
                        return bm.completedHoursThisWeek - am.completedHoursThisWeek;
                    default:
                        return 0;
                }
            })
            .slice(0, 5);
    }, [members, metric]);

    const getValue = (m: TeamMemberMetrics) => {
        switch (metric) {
            case "calls":
                return m.callsThisWeek;
            case "meetings":
                return m.meetingsBookedThisWeek;
            case "hours":
                return formatHours(m.completedHoursThisWeek);
        }
    };

    const maxValue = Math.max(
        ...sorted.map(m => {
            const metrics = m.metrics!;
            switch (metric) {
                case "calls":
                    return metrics.callsThisWeek;
                case "meetings":
                    return metrics.meetingsBookedThisWeek;
                case "hours":
                    return metrics.completedHoursThisWeek;
            }
        }),
        1
    );

    return (
        <div className="space-y-3">
            {sorted.map((member, index) => {
                const metrics = member.metrics!;
                const numericValue = metric === "hours"
                    ? metrics.completedHoursThisWeek
                    : metric === "calls"
                        ? metrics.callsThisWeek
                        : metrics.meetingsBookedThisWeek;
                const percentage = (numericValue / maxValue) * 100;

                return (
                    <div key={member.id} className="flex items-center gap-3">
                        <RankBadge rank={index + 1} />
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-600">
                            {getInitials(member.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-900 truncate">
                                    {member.name}
                                </span>
                                <span className="text-sm font-bold text-indigo-600">
                                    {getValue(metrics)}
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================
// UTILIZATION HEATMAP
// ============================================

function UtilizationHeatmap({
    members,
    weekDates,
}: {
    members: TeamMember[];
    weekDates: Date[];
}) {
    const dayLabels = ["L", "M", "M", "J", "V"];

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2 pl-24">
                {dayLabels.map((day, i) => (
                    <div key={i} className="flex-1 text-center text-xs font-medium text-slate-400">
                        {day}
                    </div>
                ))}
            </div>

            {/* Rows */}
            {members.slice(0, 6).map((member) => {
                const dailyHours = member.metrics?.dailyHours || [];

                return (
                    <div key={member.id} className="flex items-center gap-2">
                        <div className="w-24 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                {getInitials(member.name)}
                            </div>
                            <span className="text-xs text-slate-600 truncate">
                                {member.name.split(" ")[0]}
                            </span>
                        </div>
                        {dailyHours.map((d, i) => {
                            const utilizationPercent = d.scheduled > 0
                                ? (d.completed / d.scheduled) * 100
                                : 0;

                            let bgColor = "bg-slate-50";
                            if (d.scheduled > 0) {
                                if (utilizationPercent >= 100) bgColor = "bg-emerald-400";
                                else if (utilizationPercent >= 75) bgColor = "bg-emerald-300";
                                else if (utilizationPercent >= 50) bgColor = "bg-amber-300";
                                else if (utilizationPercent >= 25) bgColor = "bg-amber-200";
                                else bgColor = "bg-rose-200";
                            }

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex-1 h-8 rounded-md flex items-center justify-center text-[10px] font-medium transition-colors",
                                        bgColor,
                                        d.scheduled > 0 ? "text-white" : "text-slate-400"
                                    )}
                                    title={`${d.completed}h / ${d.scheduled}h`}
                                >
                                    {d.scheduled > 0 ? `${Math.round(utilizationPercent)}%` : "-"}
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {/* Legend */}
            <div className="flex items-center justify-end gap-4 pt-2 border-t border-slate-100 mt-3">
                <span className="text-[10px] text-slate-400">Utilisation:</span>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-rose-200" />
                    <span className="text-[10px] text-slate-500">0-25%</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-amber-200" />
                    <span className="text-[10px] text-slate-500">25-50%</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-amber-300" />
                    <span className="text-[10px] text-slate-500">50-75%</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-emerald-300" />
                    <span className="text-[10px] text-slate-500">75-100%</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-emerald-400" />
                    <span className="text-[10px] text-slate-500">100%+</span>
                </div>
            </div>
        </div>
    );
}

// ============================================
// ACTIVITY FEED
// ============================================

function ActivityFeed({
    activities,
}: {
    activities: { id: string; user: string; action: string; time: string; type: "call" | "meeting" | "schedule" }[];
}) {
    const typeConfig = {
        call: { icon: Phone, color: "text-blue-500", bg: "bg-blue-50" },
        meeting: { icon: Calendar, color: "text-emerald-500", bg: "bg-emerald-50" },
        schedule: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
    };

    return (
        <div className="space-y-3">
            {activities.map((activity) => {
                const config = typeConfig[activity.type];
                const Icon = config.icon;

                return (
                    <div key={activity.id} className="flex items-start gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            config.bg
                        )}>
                            <Icon className={cn("w-4 h-4", config.color)} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-700">
                                <span className="font-medium">{activity.user}</span>
                                {" "}{activity.action}
                            </p>
                            <p className="text-xs text-slate-400">{activity.time}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function TeamDashboardPage() {
    const { success, error: showError } = useToast();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [leaderboardMetric, setLeaderboardMetric] = useState<"calls" | "meetings" | "hours">("calls");

    const weekDates = useMemo(() => getWeekDates(), []);

    // ============================================
    // FETCH DATA
    // ============================================

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch team members (SDRs and BDs)
            const [usersRes, blocksRes, actionsRes] = await Promise.all([
                fetch("/api/users?role=SDR,BUSINESS_DEVELOPER"),
                fetch(`/api/planning?startDate=${formatDate(weekDates[0])}&endDate=${formatDate(weekDates[4])}`),
                fetch("/api/actions/stats"),
            ]);

            const usersJson = await usersRes.json();
            const blocksJson = await blocksRes.json();
            const actionsJson = await actionsRes.json();

            let teamMembers: TeamMember[] = [];
            let scheduleBlocks: ScheduleBlock[] = [];
            let actionStats: Record<string, any> = {};

            if (usersJson.success) {
                teamMembers = usersJson.data.users || usersJson.data || [];
            }

            if (blocksJson.success) {
                scheduleBlocks = blocksJson.data.blocks || blocksJson.data || [];
            }

            if (actionsJson.success) {
                actionStats = actionsJson.data || {};
            }

            // Compute metrics for each member
            const membersWithMetrics = teamMembers.map((member, index) => {
                const memberBlocks = scheduleBlocks.filter(b => b.sdrId === member.id);
                const memberStats = actionStats[member.id] || {};

                // Calculate scheduled hours per day
                const dailyHours = weekDates.map((date, dayIndex) => {
                    const dateStr = formatDate(date);
                    const dayBlocks = memberBlocks.filter(b => b.date.split("T")[0] === dateStr);
                    const scheduled = dayBlocks.reduce((sum, b) => sum + calcHours(b.startTime, b.endTime), 0);
                    const completed = dayBlocks
                        .filter(b => b.status === "COMPLETED")
                        .reduce((sum, b) => sum + calcHours(b.startTime, b.endTime), 0);

                    return {
                        day: ["L", "M", "M", "J", "V"][dayIndex],
                        scheduled,
                        completed,
                    };
                });

                const scheduledHoursThisWeek = dailyHours.reduce((sum, d) => sum + d.scheduled, 0);
                const completedHoursThisWeek = dailyHours.reduce((sum, d) => sum + d.completed, 0);

                // Determine status based on active blocks
                const now = new Date();
                const currentDateStr = formatDate(now);
                const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

                const activeBlock = memberBlocks.find(b => {
                    const blockDate = b.date.split("T")[0];
                    return blockDate === currentDateStr &&
                        b.startTime <= currentTime &&
                        b.endTime > currentTime &&
                        b.status !== "CANCELLED";
                });

                let status: "online" | "busy" | "away" | "offline" = "offline";
                if (activeBlock) {
                    status = activeBlock.status === "IN_PROGRESS" ? "busy" : "online";
                } else if (member.isActive) {
                    // Simulate some activity
                    status = Math.random() > 0.6 ? "online" : "away";
                }

                // Simulate some metrics (in real app, these would come from API)
                const callsThisWeek = memberStats.callsThisWeek || Math.floor(Math.random() * 80) + 20;
                const meetingsBookedThisWeek = memberStats.meetingsThisWeek || Math.floor(Math.random() * 8);

                return {
                    ...member,
                    metrics: {
                        scheduledHoursThisWeek,
                        scheduledHoursThisMonth: scheduledHoursThisWeek * 4,
                        completedHoursThisWeek,
                        completedHoursThisMonth: completedHoursThisWeek * 4,
                        callsToday: Math.floor(callsThisWeek / 5),
                        callsThisWeek,
                        callsThisMonth: callsThisWeek * 4,
                        avgCallsPerHour: completedHoursThisWeek > 0
                            ? Number((callsThisWeek / completedHoursThisWeek).toFixed(1))
                            : 0,
                        meetingsBooked: meetingsBookedThisWeek * 4,
                        meetingsBookedThisWeek,
                        conversionRate: callsThisWeek > 0
                            ? Number(((meetingsBookedThisWeek / callsThisWeek) * 100).toFixed(1))
                            : 0,
                        lastActiveAt: null,
                        currentMission: activeBlock?.mission?.name || null,
                        activeBlockId: activeBlock?.id || null,
                        status,
                        dailyHours,
                        currentStreak: Math.floor(Math.random() * 10),
                        weeklyRank: index + 1,
                        monthlyScore: Math.floor(Math.random() * 1000),
                    },
                };
            });

            // Sort by weekly performance for ranking
            membersWithMetrics.sort((a, b) => {
                const aScore = (a.metrics?.callsThisWeek || 0) + (a.metrics?.meetingsBookedThisWeek || 0) * 10;
                const bScore = (b.metrics?.callsThisWeek || 0) + (b.metrics?.meetingsBookedThisWeek || 0) * 10;
                return bScore - aScore;
            });

            // Update ranks
            membersWithMetrics.forEach((m, i) => {
                if (m.metrics) m.metrics.weeklyRank = i + 1;
            });

            setMembers(membersWithMetrics);
            setBlocks(scheduleBlocks);

        } catch (err) {
            console.error("Error fetching team data:", err);
            showError("Erreur", "Impossible de charger les données de l'équipe");
        } finally {
            setIsLoading(false);
        }
    }, [weekDates, showError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === "all" || m.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [members, searchQuery, roleFilter]);

    const teamStats: TeamStats = useMemo(() => {
        const stats = {
            totalMembers: members.length,
            activeMembers: members.filter(m => m.metrics?.status !== "offline").length,
            totalScheduledHours: members.reduce((sum, m) => sum + (m.metrics?.scheduledHoursThisWeek || 0), 0),
            totalCompletedHours: members.reduce((sum, m) => sum + (m.metrics?.completedHoursThisWeek || 0), 0),
            utilizationRate: 0,
            totalCalls: members.reduce((sum, m) => sum + (m.metrics?.callsThisWeek || 0), 0),
            totalMeetings: members.reduce((sum, m) => sum + (m.metrics?.meetingsBookedThisWeek || 0), 0),
            avgConversionRate: 0,
        };

        if (stats.totalScheduledHours > 0) {
            stats.utilizationRate = Math.round((stats.totalCompletedHours / stats.totalScheduledHours) * 100);
        }

        if (stats.totalCalls > 0) {
            stats.avgConversionRate = Number(((stats.totalMeetings / stats.totalCalls) * 100).toFixed(1));
        }

        return stats;
    }, [members]);

    // Mock activity feed
    const recentActivities = [
        { id: "1", user: "Marie L.", action: "a terminé 15 appels", time: "Il y a 5 min", type: "call" as const },
        { id: "2", user: "Thomas D.", action: "a booké un RDV avec Acme Corp", time: "Il y a 12 min", type: "meeting" as const },
        { id: "3", user: "Sophie M.", action: "a démarré sa session", time: "Il y a 25 min", type: "schedule" as const },
        { id: "4", user: "Lucas R.", action: "a complété 8 appels", time: "Il y a 35 min", type: "call" as const },
        { id: "5", user: "Emma B.", action: "a booké un RDV avec Tech Inc", time: "Il y a 1h", type: "meeting" as const },
    ];

    // ============================================
    // RENDER
    // ============================================

    if (isLoading && members.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-slate-500">Chargement de l'équipe...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Équipe</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Suivi temps réel & performance de votre équipe commerciale
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw className={cn("w-4 h-4 text-slate-500", isLoading && "animate-spin")} />
                    </button>
                    <button className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                        <Download className="w-4 h-4 text-slate-500" />
                    </button>
                    <button className="mgr-btn-primary flex items-center gap-2 h-10 px-5 text-sm font-medium">
                        <UserPlus className="w-4 h-4" />
                        Ajouter un membre
                    </button>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-4 gap-5">
                <StatCard
                    icon={Users}
                    label="Équipe active"
                    value={`${teamStats.activeMembers}/${teamStats.totalMembers}`}
                    subValue="membres en ligne"
                    color="indigo"
                />
                <StatCard
                    icon={Clock}
                    label="Heures cette semaine"
                    value={formatHours(teamStats.totalCompletedHours)}
                    subValue={`${teamStats.utilizationRate}% utilisation`}
                    trend={{ value: 12, isPositive: true }}
                    color="emerald"
                />
                <StatCard
                    icon={Phone}
                    label="Appels totaux"
                    value={teamStats.totalCalls}
                    subValue="cette semaine"
                    trend={{ value: 8, isPositive: true }}
                    color="blue"
                />
                <StatCard
                    icon={Calendar}
                    label="RDV bookés"
                    value={teamStats.totalMeetings}
                    subValue={`${teamStats.avgConversionRate}% taux conv.`}
                    trend={{ value: 15, isPositive: true }}
                    color="amber"
                />
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-3 gap-6">
                {/* Left: Leaderboard & Heatmap */}
                <div className="space-y-6">
                    {/* Leaderboard */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                <h2 className="font-semibold text-slate-900">Classement</h2>
                            </div>
                            <select
                                value={leaderboardMetric}
                                onChange={(e) => setLeaderboardMetric(e.target.value as any)}
                                className="text-xs px-2 py-1 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="calls">Appels</option>
                                <option value="meetings">RDV</option>
                                <option value="hours">Heures</option>
                            </select>
                        </div>
                        <Leaderboard members={members} metric={leaderboardMetric} />
                    </div>

                    {/* Activity Feed */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-indigo-500" />
                            <h2 className="font-semibold text-slate-900">Activité récente</h2>
                        </div>
                        <ActivityFeed activities={recentActivities} />
                    </div>
                </div>

                {/* Center & Right: Utilization + Team Cards */}
                <div className="col-span-2 space-y-6">
                    {/* Utilization Heatmap */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-emerald-500" />
                                <h2 className="font-semibold text-slate-900">Utilisation hebdomadaire</h2>
                            </div>
                            <span className="text-xs text-slate-400">
                                Semaine du {weekDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </span>
                        </div>
                        <UtilizationHeatmap members={members} weekDates={weekDates} />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Rechercher un membre..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Tous les rôles</option>
                            <option value="SDR">SDR</option>
                            <option value="BUSINESS_DEVELOPER">Business Dev</option>
                        </select>
                    </div>

                    {/* Team Cards Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {filteredMembers.map((member) => (
                            <MemberCard
                                key={member.id}
                                member={member}
                                onViewDetails={() => {
                                    // Navigate to member details
                                    window.location.href = `/manager/team/${member.id}`;
                                }}
                            />
                        ))}
                    </div>

                    {filteredMembers.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">Aucun membre trouvé</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
