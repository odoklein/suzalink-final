"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/components/ui";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Plus,
    Loader2,
    Users,
    Clock,
    Phone,
    Mail,
    Linkedin,
    X,
    Check,
    Repeat,
    Sun,
    Sunset,
    Target,
    Copy,
    AlertCircle,
    Info,
    Search,
    CalendarDays,
    Zap,
    BarChart3,
    TrendingUp,
    ChevronDown,
    CalendarRange,
    CalendarCheck,
    Repeat1,
    ArrowRight,
} from "lucide-react";
import { Card, Button, Modal, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface Mission {
    id: string;
    name: string;
    channel: string;
    clientName: string;
}

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: "SDR" | "BUSINESS_DEVELOPER";
    missions: Mission[];
}

interface ScheduleBlock {
    id: string;
    sdrId: string;
    missionId: string;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
    status: string;
    mission: {
        id: string;
        name: string;
        channel?: string;
        client?: { name: string };
    };
}

type ScheduleMode = "day" | "week" | "repeat";

// ============================================
// CONSTANTS
// ============================================

const CHANNEL_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
    CALL: { icon: Phone, label: "Appels", color: "text-amber-600", bgColor: "bg-amber-50" },
    EMAIL: { icon: Mail, label: "Emails", color: "text-blue-600", bgColor: "bg-blue-50" },
    LINKEDIN: { icon: Linkedin, label: "LinkedIn", color: "text-sky-600", bgColor: "bg-sky-50" },
};

const MISSION_COLORS = [
    { bg: "bg-violet-100", border: "border-violet-200", text: "text-violet-700", left: "border-l-violet-500" },
    { bg: "bg-emerald-100", border: "border-emerald-200", text: "text-emerald-700", left: "border-l-emerald-500" },
    { bg: "bg-amber-100", border: "border-amber-200", text: "text-amber-700", left: "border-l-amber-500" },
    { bg: "bg-rose-100", border: "border-rose-200", text: "text-rose-700", left: "border-l-rose-500" },
    { bg: "bg-cyan-100", border: "border-cyan-200", text: "text-cyan-700", left: "border-l-cyan-500" },
    { bg: "bg-indigo-100", border: "border-indigo-200", text: "text-indigo-700", left: "border-l-indigo-500" },
];

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

const QUICK_TIMES = [
    { label: "Matin", icon: Sun, start: "09:00", end: "12:00", hours: 3 },
    { label: "Après-midi", icon: Sunset, start: "14:00", end: "18:00", hours: 4 },
    { label: "Journée", icon: Clock, start: "09:00", end: "18:00", hours: 8 },
];

const SCHEDULE_MODES: { mode: ScheduleMode; icon: React.ElementType; label: string; desc: string }[] = [
    { mode: "day", icon: CalendarCheck, label: "Ce jour", desc: "Seulement ce jour" },
    { mode: "week", icon: CalendarRange, label: "Cette semaine", desc: "Lun-Ven cette semaine" },
    { mode: "repeat", icon: Repeat1, label: "Répéter", desc: "Chaque semaine (5 sem.)" },
];

function getColor(id: string) {
    const h = id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    return MISSION_COLORS[Math.abs(h) % MISSION_COLORS.length];
}

function normalizeDate(d: string | Date): string {
    return typeof d === 'string' ? d.split("T")[0] : new Date(d).toISOString().split("T")[0];
}

function calcHours(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 10) / 10;
}

// ============================================
// STAT CARD
// ============================================

function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: React.ElementType; label: string; value: string | number; sub?: string;
    color: "indigo" | "emerald" | "amber" | "rose";
}) {
    const c = {
        indigo: { bg: "bg-indigo-50", icon: "text-indigo-600" },
        emerald: { bg: "bg-emerald-50", icon: "text-emerald-600" },
        amber: { bg: "bg-amber-50", icon: "text-amber-600" },
        rose: { bg: "bg-rose-50", icon: "text-rose-600" },
    }[color];
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
                    {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
                </div>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.bg)}>
                    <Icon className={cn("w-5 h-5", c.icon)} />
                </div>
            </div>
        </div>
    );
}

// ============================================
// MISSION PILL
// ============================================

function MissionPill({ m, selected, onClick }: { m: Mission; selected: boolean; onClick: () => void }) {
    const ch = CHANNEL_CONFIG[m.channel] || CHANNEL_CONFIG.CALL;
    const Icon = ch.icon;
    const c = getColor(m.id);
    return (
        <button onClick={onClick} className={cn(
            "group flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-left w-full",
            selected ? `${c.bg} ${c.border} shadow-sm` : "bg-white border-slate-200 hover:border-slate-300"
        )}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", ch.bgColor)}>
                <Icon className={cn("w-3.5 h-3.5", ch.color)} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", selected ? c.text : "text-slate-900")}>{m.name}</p>
                <p className="text-xs text-slate-500 truncate">{m.clientName}</p>
            </div>
            {selected && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
        </button>
    );
}

// ============================================
// BLOCK CARD
// ============================================

function BlockCard({ block, onDelete }: { block: ScheduleBlock; onDelete: () => void }) {
    const c = getColor(block.missionId);
    const ch = block.mission.channel || "CALL";
    const Icon = CHANNEL_CONFIG[ch]?.icon || Phone;
    const hours = calcHours(block.startTime, block.endTime);

    return (
        <div className={cn("group relative p-2 rounded-lg border-l-4 transition-all hover:shadow-md", c.bg, c.border, c.left)}>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg hover:scale-110">
                <X className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className={cn("w-3 h-3 flex-shrink-0", c.text)} />
                <span className={cn("text-xs font-semibold truncate flex-1", c.text)}>{block.mission.name}</span>
                <span className="text-[10px] font-medium text-slate-500 bg-white/60 px-1 rounded">{hours}h</span>
            </div>
            <div className="text-[10px] text-slate-500">{block.startTime} - {block.endTime}</div>
        </div>
    );
}

// ============================================
// MEMBER POPOVER
// ============================================

function MemberPopover({
    member,
    blocks,
    weekDates,
    isOpen,
    onClose,
    anchorRef,
}: {
    member: TeamMember;
    blocks: ScheduleBlock[];
    weekDates: Date[];
    isOpen: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, openUp: false });

    useEffect(() => {
        if (isOpen && anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            const popoverHeight = 400; // approximate height
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const openUp = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

            setPosition({
                top: openUp ? rect.top - popoverHeight - 8 : rect.bottom + 8,
                left: Math.max(16, Math.min(rect.left, window.innerWidth - 336)), // 320 + 16 margin
                openUp,
            });
        }
    }, [isOpen, anchorRef]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        // Close on escape
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    const memberBlocks = blocks.filter(b => b.sdrId === member.id && b.status !== "CANCELLED");

    // Calculate stats
    const weeklyHours = memberBlocks.reduce((acc, b) => acc + calcHours(b.startTime, b.endTime), 0);
    const hoursPerDay: Record<string, number> = {};
    weekDates.forEach(d => { hoursPerDay[normalizeDate(d)] = 0; });
    memberBlocks.forEach(b => {
        const dateStr = normalizeDate(b.date);
        if (hoursPerDay[dateStr] !== undefined) {
            hoursPerDay[dateStr] += calcHours(b.startTime, b.endTime);
        }
    });

    // Hours by mission
    const hoursByMission: Record<string, { name: string; hours: number; channel: string }> = {};
    memberBlocks.forEach(b => {
        if (!hoursByMission[b.missionId]) {
            hoursByMission[b.missionId] = { name: b.mission.name, hours: 0, channel: b.mission.channel || "CALL" };
        }
        hoursByMission[b.missionId].hours += calcHours(b.startTime, b.endTime);
    });

    const missionStats = Object.entries(hoursByMission).sort((a, b) => b[1].hours - a[1].hours);

    return (
        <div
            ref={popoverRef}
            className="fixed z-[200] w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            style={{ top: Math.max(16, position.top), left: position.left }}>
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 w-6 h-6 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition-colors"
            >
                <X className="w-4 h-4 text-white" />
            </button>

            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold",
                        member.role === "SDR" ? "bg-indigo-500" : "bg-emerald-500"
                    )}>
                        {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                        <h3 className="font-semibold">{member.name}</h3>
                        <p className="text-sm text-slate-300">{member.email}</p>
                    </div>
                </div>
            </div>

            {/* Weekly hours breakdown */}
            <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Cette semaine</span>
                    <span className="text-lg font-bold text-indigo-600">{weeklyHours}h</span>
                </div>

                {/* Mini bar chart */}
                <div className="flex items-end gap-1 h-16">
                    {weekDates.map((d, i) => {
                        const h = hoursPerDay[normalizeDate(d)] || 0;
                        const pct = weeklyHours > 0 ? (h / 10) * 100 : 0; // 10h max per day for scale
                        const isToday = d.toDateString() === new Date().toDateString();
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center">
                                <div className={cn(
                                    "w-full rounded-t transition-all",
                                    isToday ? "bg-indigo-500" : h > 0 ? "bg-indigo-300" : "bg-slate-100"
                                )} style={{ height: `${Math.max(4, Math.min(100, pct))}%` }} />
                                <span className={cn(
                                    "text-[10px] mt-1 font-medium",
                                    isToday ? "text-indigo-600" : "text-slate-400"
                                )}>{DAYS[i]}</span>
                                <span className="text-[9px] text-slate-400">{h > 0 ? `${h}h` : "-"}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Missions breakdown */}
            <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Par mission</span>
                    <span className="text-xs text-slate-400">{member.missions.length} assignées</span>
                </div>

                {missionStats.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">Aucun créneau cette semaine</p>
                ) : (
                    <div className="space-y-2">
                        {missionStats.slice(0, 4).map(([id, data]) => {
                            const Icon = CHANNEL_CONFIG[data.channel]?.icon || Phone;
                            const c = getColor(id);
                            return (
                                <div key={id} className="flex items-center gap-2">
                                    <div className={cn("w-6 h-6 rounded flex items-center justify-center", c.bg)}>
                                        <Icon className={cn("w-3 h-3", c.text)} />
                                    </div>
                                    <span className="flex-1 text-sm text-slate-700 truncate">{data.name}</span>
                                    <span className="text-sm font-medium text-slate-900">{data.hours}h</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Capacity indicator */}
            <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Capacité (40h/sem)</span>
                    <span className={cn(
                        "text-xs font-medium",
                        weeklyHours > 40 ? "text-red-600" : weeklyHours > 32 ? "text-amber-600" : "text-emerald-600"
                    )}>
                        {Math.round((weeklyHours / 40) * 100)}%
                    </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn(
                        "h-full rounded-full transition-all",
                        weeklyHours > 40 ? "bg-red-500" : weeklyHours > 32 ? "bg-amber-500" : "bg-emerald-500"
                    )} style={{ width: `${Math.min(100, (weeklyHours / 40) * 100)}%` }} />
                </div>
            </div>
        </div>
    );
}

// ============================================
// TEAM ROW
// ============================================

function TeamRow({
    member, weekDates, blocks, selectedMission, onAddBlock, onDeleteBlock
}: {
    member: TeamMember; weekDates: Date[]; blocks: ScheduleBlock[];
    selectedMission: Mission | null;
    onAddBlock: (memberId: string, date: Date) => void;
    onDeleteBlock: (id: string) => void;
}) {
    const [showPopover, setShowPopover] = useState(false);
    const memberRef = useRef<HTMLDivElement>(null);

    const memberBlocks = blocks.filter(b => b.sdrId === member.id && b.status !== "CANCELLED");
    const hasAssigned = selectedMission ? member.missions.some(m => m.id === selectedMission.id) : false;
    const canAdd = !!selectedMission && hasAssigned;
    const isSDR = member.role === "SDR";

    const weeklyHours = memberBlocks.reduce((acc, b) => acc + calcHours(b.startTime, b.endTime), 0);

    return (
        <div className={cn(
            "grid grid-cols-[220px_repeat(5,1fr)] gap-2 p-3 rounded-xl transition-all",
            !selectedMission && "bg-white",
            selectedMission && hasAssigned && "bg-gradient-to-r from-indigo-50/80 to-white ring-1 ring-indigo-100",
            selectedMission && !hasAssigned && "bg-slate-50/50 opacity-50"
        )}>
            {/* Member info - clickable */}
            <div
                ref={memberRef}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setShowPopover(!showPopover)}
            >
                <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm transition-transform group-hover:scale-105",
                    isSDR ? "bg-gradient-to-br from-indigo-500 to-indigo-600" : "bg-gradient-to-br from-emerald-500 to-emerald-600"
                )}>
                    {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">{member.name}</p>
                        <ChevronDown className={cn(
                            "w-4 h-4 text-slate-400 transition-transform",
                            showPopover && "rotate-180"
                        )} />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-md font-semibold",
                            isSDR ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                        )}>{isSDR ? "SDR" : "BD"}</span>
                        <span className={cn(
                            "font-bold px-1.5 py-0.5 rounded-md",
                            weeklyHours > 35 ? "bg-amber-100 text-amber-700" :
                                weeklyHours > 20 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}>
                            {weeklyHours}h/sem
                        </span>
                    </div>
                </div>

                <MemberPopover
                    member={member}
                    blocks={blocks}
                    weekDates={weekDates}
                    isOpen={showPopover}
                    onClose={() => setShowPopover(false)}
                    anchorRef={memberRef}
                />
            </div>

            {/* Day cells */}
            {weekDates.map((date, i) => {
                const dateStr = normalizeDate(date);
                const dayBlocks = memberBlocks.filter(b => normalizeDate(b.date) === dateStr);
                const isToday = date.toDateString() === new Date().toDateString();
                const dayHours = dayBlocks.reduce((acc, b) => acc + calcHours(b.startTime, b.endTime), 0);

                return (
                    <div
                        key={i}
                        onClick={() => canAdd && onAddBlock(member.id, date)}
                        className={cn(
                            "min-h-[100px] p-2 rounded-xl border-2 transition-all relative",
                            isToday ? "border-indigo-300 bg-indigo-50/30" : "border-slate-200 bg-white",
                            canAdd && "cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-sm",
                            !canAdd && selectedMission && "opacity-50"
                        )}
                    >
                        {dayHours > 0 && (
                            <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold">
                                {dayHours}h
                            </div>
                        )}

                        {dayBlocks.length === 0 ? (
                            canAdd && (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center text-slate-400">
                                        <Plus className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                        <span className="text-xs">Ajouter</span>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="space-y-2">
                                {dayBlocks.map(b => (
                                    <BlockCard key={b.id} block={b} onDelete={() => onDeleteBlock(b.id)} />
                                ))}
                                {canAdd && (
                                    <button className="w-full py-1 text-xs text-slate-400 hover:text-indigo-600 border border-dashed border-slate-200 hover:border-indigo-300 rounded-lg transition-colors">
                                        <Plus className="w-3 h-3 inline mr-1" />Ajouter
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================
// MAIN PAGE
// ============================================

export default function EnterprisePlanningPage() {
    const { success, error: showError } = useToast();

    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [allMissions, setAllMissions] = useState<Mission[]>([]);
    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<"ALL" | "SDR" | "BUSINESS_DEVELOPER">("ALL");

    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        return monday;
    });

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [pendingAdd, setPendingAdd] = useState<{ memberId: string; date: Date } | null>(null);
    const [selectedQuickTime, setSelectedQuickTime] = useState(QUICK_TIMES[0]);
    const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("day");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ============================================
    // FETCH
    // ============================================

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const startDate = currentWeekStart.toISOString().split("T")[0];
            const endDate = new Date(currentWeekStart);
            endDate.setDate(endDate.getDate() + 6);

            const [teamRes, blocksRes, missionsRes] = await Promise.all([
                fetch("/api/planning/sdrs"),
                fetch(`/api/planning?startDate=${startDate}&endDate=${endDate.toISOString().split("T")[0]}`),
                fetch("/api/missions?isActive=true"),
            ]);

            const [teamJson, blocksJson, missionsJson] = await Promise.all([
                teamRes.json(), blocksRes.json(), missionsRes.json(),
            ]);

            if (teamJson.success) setTeamMembers(teamJson.data);
            if (blocksJson.success) setBlocks(blocksJson.data || []);
            if (missionsJson.success && missionsJson.data) {
                const data = Array.isArray(missionsJson.data) ? missionsJson.data : [];
                setAllMissions(data.map((m: any) => ({
                    id: m.id, name: m.name, channel: m.channel, clientName: m.client?.name || "—"
                })));
            }
        } catch (err) {
            showError("Erreur", "Impossible de charger les données");
        } finally { setIsLoading(false); }
    }, [currentWeekStart, showError]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ============================================
    // COMPUTED
    // ============================================

    const weekDates = useMemo(() => Array.from({ length: 5 }, (_, i) => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        return d;
    }), [currentWeekStart]);

    const filteredMembers = useMemo(() => {
        let r = teamMembers;
        if (roleFilter !== "ALL") r = r.filter(m => m.role === roleFilter);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            r = r.filter(m => m.name.toLowerCase().includes(q));
        }
        return r;
    }, [teamMembers, roleFilter, searchQuery]);

    const stats = useMemo(() => {
        const active = blocks.filter(b => b.status !== "CANCELLED");
        const hours = active.reduce((a, b) => a + calcHours(b.startTime, b.endTime), 0);
        const members = new Set(active.map(b => b.sdrId)).size;
        return { blocks: active.length, hours, members, coverage: teamMembers.length ? Math.round((members / teamMembers.length) * 100) : 0 };
    }, [blocks, teamMembers]);

    const formatWeekRange = () => {
        const end = new Date(currentWeekStart);
        end.setDate(end.getDate() + 4);
        return `${currentWeekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
    };

    // ============================================
    // ACTIONS
    // ============================================

    const navigateWeek = (dir: "prev" | "next") => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + (dir === "prev" ? -7 : 7));
        setCurrentWeekStart(d);
    };

    const goToToday = () => {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        setCurrentWeekStart(monday);
    };

    const handleAddBlock = (memberId: string, date: Date) => {
        if (!selectedMission) return;
        setPendingAdd({ memberId, date });
        setScheduleMode("day");
        setShowAddModal(true);
    };

    const handleConfirmAdd = async () => {
        if (!pendingAdd || !selectedMission) return;
        setIsSubmitting(true);

        const { start, end } = selectedQuickTime;
        const datesToCreate: Date[] = [];

        if (scheduleMode === "day") {
            datesToCreate.push(pendingAdd.date);
        } else if (scheduleMode === "week") {
            weekDates.forEach(d => datesToCreate.push(d));
        } else {
            // Repeat for 5 weeks
            for (let w = 0; w < 5; w++) {
                const d = new Date(pendingAdd.date);
                d.setDate(d.getDate() + w * 7);
                datesToCreate.push(d);
            }
        }

        try {
            const promises = datesToCreate.map(date =>
                fetch("/api/planning", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sdrId: pendingAdd.memberId,
                        missionId: selectedMission.id,
                        date: date.toISOString().split("T")[0],
                        startTime: start,
                        endTime: end,
                    }),
                }).then(r => r.json())
            );

            const results = await Promise.allSettled(promises);
            const successCount = results.filter(r => r.status === "fulfilled" && (r.value as any).success).length;

            if (successCount > 0) {
                success(
                    `${successCount} créneau${successCount > 1 ? "x" : ""} créé${successCount > 1 ? "s" : ""}`,
                    scheduleMode === "day" ? "" : scheduleMode === "week" ? "Pour toute la semaine" : "Répétés sur 5 semaines"
                );
                setShowAddModal(false);
                setPendingAdd(null);
                fetchData();
            } else {
                showError("Erreur", "Impossible de créer les créneaux");
            }
        } catch { showError("Erreur", "Une erreur est survenue"); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteBlock = async (id: string) => {
        const res = await fetch(`/api/planning/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success) { success("Supprimé", ""); fetchData(); }
        else showError("Erreur", json.error);
    };

    const handleCopyWeek = async () => {
        setIsSubmitting(true);
        const next = new Date(currentWeekStart);
        next.setDate(next.getDate() + 7);
        const res = await fetch("/api/planning/copy-week", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sourceStartDate: currentWeekStart.toISOString().split("T")[0],
                targetStartDate: next.toISOString().split("T")[0],
            }),
        });
        const json = await res.json();
        setIsSubmitting(false);
        if (json.success) { success("Copié", `${json.data.created} créneaux`); navigateWeek("next"); }
        else showError("Erreur", json.error);
    };

    // ============================================
    // RENDER
    // ============================================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Planning de l'équipe</h1>
                    <p className="text-slate-500 mt-0.5">Organisez les créneaux de travail</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleCopyWeek} disabled={isSubmitting} className="gap-2">
                    <Copy className="w-4 h-4" />Copier la semaine
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard icon={CalendarDays} label="Créneaux" value={stats.blocks} sub="cette semaine" color="indigo" />
                <StatCard icon={Clock} label="Heures" value={`${stats.hours}h`} sub="planifiées" color="emerald" />
                <StatCard icon={Users} label="Équipe" value={`${stats.members}/${teamMembers.length}`} sub={`${stats.coverage}%`} color="amber" />
                <StatCard icon={Target} label="Missions" value={allMissions.length} sub="actives" color="rose" />
            </div>

            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-80 flex-shrink-0 space-y-4">
                    <Card className="overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">1. Choisir une mission</h2>
                                    <p className="text-sm text-indigo-100">Puis cliquez sur une case</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 max-h-[40vh] overflow-y-auto space-y-2">
                            {allMissions.map(m => (
                                <MissionPill key={m.id} m={m} selected={selectedMission?.id === m.id}
                                    onClick={() => setSelectedMission(selectedMission?.id === m.id ? null : m)} />
                            ))}
                        </div>
                    </Card>

                    <Card className="p-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg" />
                        </div>
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                            {(["ALL", "SDR", "BUSINESS_DEVELOPER"] as const).map(r => (
                                <button key={r} onClick={() => setRoleFilter(r)} className={cn(
                                    "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                    roleFilter === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                                )}>{r === "ALL" ? "Tous" : r === "SDR" ? "SDR" : "BD"}</button>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Calendar */}
                <div className="flex-1 min-w-0">
                    <Card className="!p-3 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                                    <button onClick={() => navigateWeek("prev")} className="p-2 hover:bg-slate-50 border-r border-slate-200">
                                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                                    </button>
                                    <button onClick={() => navigateWeek("next")} className="p-2 hover:bg-slate-50">
                                        <ChevronRight className="w-5 h-5 text-slate-600" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                    <span className="font-semibold text-slate-900">{formatWeekRange()}</span>
                                </div>
                            </div>
                            <Button variant="secondary" size="sm" onClick={goToToday}>Aujourd'hui</Button>
                        </div>
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="grid grid-cols-[220px_repeat(5,1fr)] gap-2 p-3 bg-slate-50 border-b border-slate-200">
                            <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                                <Users className="w-4 h-4" />Équipe <span className="text-slate-400">(cliquez pour détails)</span>
                            </div>
                            {weekDates.map((d, i) => (
                                <div key={i} className={cn("text-center py-2 rounded-lg", d.toDateString() === new Date().toDateString() && "bg-indigo-100")}>
                                    <div className={cn("text-xs font-medium uppercase", d.toDateString() === new Date().toDateString() ? "text-indigo-600" : "text-slate-500")}>{DAYS[i]}</div>
                                    <div className={cn("text-lg font-bold", d.toDateString() === new Date().toDateString() ? "text-indigo-600" : "text-slate-900")}>{d.getDate()}</div>
                                </div>
                            ))}
                        </div>

                        <div className="divide-y divide-slate-100">
                            {filteredMembers.map(m => (
                                <TeamRow key={m.id} member={m} weekDates={weekDates} blocks={blocks}
                                    selectedMission={selectedMission} onAddBlock={handleAddBlock} onDeleteBlock={handleDeleteBlock} />
                            ))}
                        </div>
                    </Card>

                    {!selectedMission && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <p className="text-sm text-amber-800"><strong>Sélectionnez une mission</strong> à gauche pour ajouter des créneaux.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setPendingAdd(null); }} title="Nouveau créneau">
                {pendingAdd && selectedMission && (
                    <div className="space-y-5">
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <Target className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{selectedMission.name}</p>
                                    <p className="text-sm text-slate-500">{selectedMission.clientName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar className="w-4 h-4" />
                                <span>{pendingAdd.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
                            </div>
                        </div>

                        {/* Time selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Horaires</label>
                            <div className="grid grid-cols-3 gap-2">
                                {QUICK_TIMES.map(t => {
                                    const Icon = t.icon;
                                    const sel = selectedQuickTime.label === t.label;
                                    return (
                                        <button key={t.label} onClick={() => setSelectedQuickTime(t)} className={cn(
                                            "p-3 rounded-xl border-2 text-center transition-all",
                                            sel ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                                        )}>
                                            <Icon className={cn("w-5 h-5 mx-auto mb-1", sel ? "text-indigo-600" : "text-slate-400")} />
                                            <p className={cn("font-medium text-sm", sel ? "text-indigo-700" : "text-slate-700")}>{t.label}</p>
                                            <p className="text-xs text-slate-500">{t.hours}h</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Schedule mode */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Appliquer à</label>
                            <div className="space-y-2">
                                {SCHEDULE_MODES.map(m => {
                                    const Icon = m.icon;
                                    const sel = scheduleMode === m.mode;
                                    return (
                                        <button key={m.mode} onClick={() => setScheduleMode(m.mode)} className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                                            sel ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                                        )}>
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", sel ? "bg-indigo-100" : "bg-slate-100")}>
                                                <Icon className={cn("w-5 h-5", sel ? "text-indigo-600" : "text-slate-400")} />
                                            </div>
                                            <div className="flex-1">
                                                <p className={cn("font-medium", sel ? "text-indigo-700" : "text-slate-700")}>{m.label}</p>
                                                <p className="text-xs text-slate-500">{m.desc}</p>
                                            </div>
                                            {sel && <Check className="w-5 h-5 text-indigo-600" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="p-3 bg-indigo-50 rounded-xl flex items-center gap-3">
                            <Zap className="w-5 h-5 text-indigo-600" />
                            <div className="text-sm text-indigo-700">
                                <strong>
                                    {scheduleMode === "day" ? "1 créneau" : scheduleMode === "week" ? "5 créneaux" : "5 créneaux"}
                                </strong>
                                {" de "}{selectedQuickTime.hours}h
                                {scheduleMode === "repeat" && " (répétés chaque semaine)"}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Annuler</Button>
                            <Button variant="primary" onClick={handleConfirmAdd} isLoading={isSubmitting} className="gap-2">
                                <Zap className="w-4 h-4" />Créer
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
