"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, Badge, Button } from "@/components/ui";
import Link from "next/link";
import {
    Phone,
    Calendar,
    Clock,
    Briefcase,
    Target,
    ChevronRight,
    TrendingUp,
    Zap,
    Users,
    Mail,
    Linkedin,
    Play,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface SDRStats {
    actionsToday: number;
    meetingsBooked: number;
    callbacksPending: number;
    opportunitiesGenerated: number;
    weeklyProgress: number;
}

interface Mission {
    id: string;
    name: string;
    channel: "CALL" | "EMAIL" | "LINKEDIN";
    client: { name: string };
    progress: number;
    contactsRemaining: number;
    _count: {
        lists: number;
        campaigns: number;
    };
}

// ============================================
// CHANNEL ICONS
// ============================================

const CHANNEL_ICONS = {
    CALL: Phone,
    EMAIL: Mail,
    LINKEDIN: Linkedin,
};

const CHANNEL_COLORS = {
    CALL: "text-emerald-500 bg-emerald-50",
    EMAIL: "text-blue-500 bg-blue-50",
    LINKEDIN: "text-sky-500 bg-sky-50",
};

// ============================================
// SDR DASHBOARD PAGE
// ============================================

export default function SDRDashboardPage() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<SDRStats | null>(null);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ============================================
    // FETCH DATA
    // ============================================

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch stats
                const statsRes = await fetch("/api/sdr/stats");
                const statsJson = await statsRes.json();
                if (statsJson.success) {
                    setStats(statsJson.data);
                }

                // Fetch missions
                const missionsRes = await fetch("/api/sdr/missions");
                const missionsJson = await missionsRes.json();
                if (missionsJson.success) {
                    setMissions(missionsJson.data);
                    // Get selected mission from localStorage
                    const saved = localStorage.getItem("sdr_selected_mission");
                    if (saved && missionsJson.data.some((m: Mission) => m.id === saved)) {
                        setSelectedMissionId(saved);
                    } else if (missionsJson.data.length > 0) {
                        setSelectedMissionId(missionsJson.data[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Listen for mission changes
    useEffect(() => {
        const handleMissionChange = (e: CustomEvent) => {
            setSelectedMissionId(e.detail);
        };
        window.addEventListener("sdr_mission_changed", handleMissionChange as EventListener);
        return () => {
            window.removeEventListener("sdr_mission_changed", handleMissionChange as EventListener);
        };
    }, []);

    const activeMission = missions.find(m => m.id === selectedMissionId);
    const ChannelIcon = activeMission ? CHANNEL_ICONS[activeMission.channel] : Phone;

    // ============================================
    // GREETING
    // ============================================

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Bonjour";
        if (hour < 18) return "Bon après-midi";
        return "Bonsoir";
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Chargement du dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome Header */}
            <div className="text-center py-4">
                <h1 className="text-2xl font-bold text-slate-900">
                    {getGreeting()}, {session?.user?.name?.split(" ")[0] ?? "vous"} ! 👋
                </h1>
                <p className="text-slate-500 mt-1">
                    Voici votre journée en un coup d'œil
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Phone className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.actionsToday || 0}</p>
                            <p className="text-xs text-slate-500">Appels faits aujourd'hui</p>
                        </div>
                    </div>
                </Card>

                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-emerald-600">{stats?.meetingsBooked || 0}</p>
                            <p className="text-xs text-slate-500">RDV pris</p>
                        </div>
                    </div>
                </Card>

                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-600">{stats?.callbacksPending || 0}</p>
                            <p className="text-xs text-slate-500">Rappels en attente</p>
                        </div>
                    </div>
                </Card>

                <Card className="!p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{stats?.opportunitiesGenerated || 0}</p>
                            <p className="text-xs text-slate-500">Contacts chauds</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* No missions assigned */}
            {missions.length === 0 && (
                <Card className="!p-6 border-dashed border-2 bg-slate-50/50 text-center">
                    <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-slate-700">Aucune mission assignée</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Contactez votre manager pour être assigné à une mission.
                    </p>
                </Card>
            )}

            {/* Active Mission Card */}
            {activeMission && (
                <Card className="!p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5" />
                                <span className="font-medium">Mission Active</span>
                            </div>
                            <Badge variant="outline" className="!bg-white/20 !text-white !border-white/30">
                                <ChannelIcon className="w-3 h-3 mr-1" />
                                {activeMission.channel === "CALL" ? "Appel" : activeMission.channel === "EMAIL" ? "Email" : "LinkedIn"}
                            </Badge>
                        </div>
                    </div>

                    <div className="p-4 space-y-4 bg-white">
                        <div>
                            <h3 className="font-semibold text-lg text-slate-900">{activeMission.name}</h3>
                            <p className="text-sm text-slate-500">{activeMission.client.name}</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Progression</span>
                                <span className="font-medium text-indigo-600">{activeMission.progress || 0}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                                    style={{ width: `${activeMission.progress || 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-600">{activeMission.contactsRemaining || 0} contacts restants</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-600">{activeMission._count?.campaigns || 0} campagnes</span>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <Link href="/sdr/action" className="block">
                            <Button variant="primary" size="lg" className="w-full gap-2">
                                <Play className="w-5 h-5" />
                                Commencer à appeler
                            </Button>
                        </Link>
                    </div>
                </Card>
            )}

            {/* Other Missions */}
            {missions.length > 1 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">Autres Missions</h2>
                        <span className="text-xs text-slate-500">{missions.length} missions assignées</span>
                    </div>

                    <div className="space-y-2">
                        {missions
                            .filter(m => m.id !== selectedMissionId)
                            .slice(0, 3)
                            .map((mission) => {
                                const Icon = CHANNEL_ICONS[mission.channel];
                                return (
                                    <Card
                                        key={mission.id}
                                        className="!p-3 hover:border-indigo-300 cursor-pointer transition-all"
                                        onClick={() => {
                                            setSelectedMissionId(mission.id);
                                            localStorage.setItem("sdr_selected_mission", mission.id);
                                            window.dispatchEvent(new CustomEvent("sdr_mission_changed", { detail: mission.id }));
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                                CHANNEL_COLORS[mission.channel]
                                            )}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-slate-900 truncate">{mission.name}</h3>
                                                <p className="text-xs text-slate-500 truncate">{mission.client.name}</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        </div>
                                    </Card>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Quick Tips */}
            <Card className="!p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-amber-900">Astuce du jour</h3>
                        <p className="text-sm text-amber-700 mt-1">
                            Utilisez les raccourcis clavier (1-6) lors des actions pour gagner du temps.
                            Appuyez sur Entrée pour valider rapidement.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Weekly Progress (evolution vs last week) */}
            {stats && (
                <Card className="!p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-slate-900">Évolution vs semaine dernière</h3>
                        <div className="flex items-center gap-1 text-emerald-600 text-sm">
                            <TrendingUp className="w-4 h-4" />
                            <span>{stats.weeklyProgress != null && stats.weeklyProgress >= 0 ? "Beau travail !" : "À toi de jouer"}</span>
                        </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(Math.max(stats.weeklyProgress ?? 0, 0), 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {stats.weeklyProgress != null && stats.weeklyProgress > 0
                            ? "Tu as fait plus d'actions cette semaine que la précédente."
                            : stats.weeklyProgress === 0
                                ? "Même rythme que la semaine dernière."
                                : "Continue comme ça !"}
                    </p>
                </Card>
            )}
        </div>
    );
}
