"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalFooter, Select, ConfirmModal, useToast } from "@/components/ui";
import {
    ArrowLeft,
    Target,
    Users,
    Calendar,
    Phone,
    Mail,
    Linkedin,
    Edit,
    Trash2,
    UserPlus,
    PlayCircle,
    PauseCircle,
    Loader2,
    ListIcon,
    ChevronRight,
    Sparkles,
} from "lucide-react";
import Link from "next/link";

// ============================================
// TYPES
// ============================================

interface Mission {
    id: string;
    name: string;
    objective?: string;
    channel: "CALL" | "EMAIL" | "LINKEDIN";
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    client?: {
        id: string;
        name: string;
    };
    sdrAssignments: Array<{
        id: string;
        sdr: {
            id: string;
            name: string;
            email: string;
        };
    }>;
    campaigns: Array<{
        id: string;
        name: string;
        isActive: boolean;
    }>;
    lists: Array<{
        id: string;
        name: string;
        type: string;
        _count?: { companies: number; contacts: number };
    }>;
    _count: {
        sdrAssignments: number;
        campaigns: number;
        lists: number;
    };
}

interface SDR {
    id: string;
    name: string;
    email: string;
}

// ============================================
// CHANNEL CONFIG
// ============================================

const CHANNEL_CONFIG = {
    CALL: { icon: Phone, label: "Appel", className: "mgr-channel-call" },
    EMAIL: { icon: Mail, label: "Email", className: "mgr-channel-email" },
    LINKEDIN: { icon: Linkedin, label: "LinkedIn", className: "mgr-channel-linkedin" },
};

// ============================================
// MISSION DETAIL PAGE
// ============================================

export default function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const { success, error: showError } = useToast();

    const [mission, setMission] = useState<Mission | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    // Modals
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [availableSDRs, setAvailableSDRs] = useState<SDR[]>([]);
    const [selectedSDRId, setSelectedSDRId] = useState<string>("");
    const [isAssigning, setIsAssigning] = useState(false);

    // ============================================
    // FETCH MISSION
    // ============================================

    const fetchMission = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/missions/${resolvedParams.id}`);
            const json = await res.json();

            if (json.success) {
                setMission(json.data);
            } else {
                showError("Erreur", json.error || "Mission non trouvée");
                router.push("/manager/missions");
            }
        } catch (err) {
            console.error("Failed to fetch mission:", err);
            showError("Erreur", "Impossible de charger la mission");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMission();
    }, [resolvedParams.id]);

    // ============================================
    // FETCH AVAILABLE SDRS
    // ============================================

    const fetchAvailableSDRs = async () => {
        try {
            const res = await fetch("/api/users?role=SDR&status=active");
            const json = await res.json();
            if (json.success && json.data?.users) {
                const assignedIds = mission?.sdrAssignments.map(a => a.sdr.id) || [];
                const available = json.data.users.filter((sdr: SDR) => !assignedIds.includes(sdr.id));
                setAvailableSDRs(available);
            }
        } catch (err) {
            console.error("Failed to fetch SDRs:", err);
        }
    };

    // ============================================
    // TOGGLE ACTIVE STATUS
    // ============================================

    const toggleActive = async () => {
        if (!mission) return;

        setIsToggling(true);
        try {
            const res = await fetch(`/api/missions/${mission.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !mission.isActive }),
            });

            const json = await res.json();

            if (json.success) {
                setMission(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
                success(
                    mission.isActive ? "Mission mise en pause" : "Mission activée",
                    `${mission.name} est maintenant ${!mission.isActive ? "active" : "en pause"}`
                );
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            showError("Erreur", "Impossible de modifier le statut");
        } finally {
            setIsToggling(false);
        }
    };

    // ============================================
    // DELETE MISSION
    // ============================================

    const handleDelete = async () => {
        if (!mission) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/missions/${mission.id}`, {
                method: "DELETE",
            });

            const json = await res.json();

            if (json.success) {
                success("Mission supprimée", `${mission.name} a été supprimée`);
                router.push("/manager/missions");
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            showError("Erreur", "Impossible de supprimer la mission");
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    // ============================================
    // ASSIGN SDR
    // ============================================

    const handleAssign = async () => {
        if (!mission || !selectedSDRId) return;

        setIsAssigning(true);
        try {
            const res = await fetch(`/api/missions/${mission.id}/assign`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sdrId: selectedSDRId }),
            });

            const json = await res.json();

            if (json.success) {
                success("SDR assigné", "Le SDR a été assigné à la mission");
                setShowAssignModal(false);
                setSelectedSDRId("");
                fetchMission();
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            showError("Erreur", "Impossible d'assigner le SDR");
        } finally {
            setIsAssigning(false);
        }
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-slate-500">Chargement de la mission...</p>
                </div>
            </div>
        );
    }

    if (!mission) {
        return null;
    }

    const channel = CHANNEL_CONFIG[mission.channel];
    const ChannelIcon = channel.icon;

    return (
        <div className="space-y-6">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-50" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <Link
                            href="/manager/missions"
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-xl font-bold">
                            {mission.client?.name?.[0] || "M"}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-1">
                                <h1 className="text-2xl font-bold">{mission.name}</h1>
                                <span className={mission.isActive ? "mgr-badge-active" : "mgr-badge-paused"}>
                                    {mission.isActive ? "Actif" : "Pause"}
                                </span>
                                <span className={`mgr-channel-badge ${channel.className}`}>
                                    <ChannelIcon className="w-3 h-3" />
                                    {channel.label}
                                </span>
                            </div>
                            <p className="text-slate-400">
                                {mission.client?.name}
                                {mission.objective && ` · ${mission.objective}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleActive}
                            disabled={isToggling}
                            className="flex items-center gap-2 h-9 px-4 text-sm font-medium bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-lg transition-colors"
                        >
                            {isToggling ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : mission.isActive ? (
                                <PauseCircle className="w-4 h-4" />
                            ) : (
                                <PlayCircle className="w-4 h-4" />
                            )}
                            {mission.isActive ? "Pause" : "Activer"}
                        </button>
                        <Link
                            href={`/manager/missions/${mission.id}/edit`}
                            className="flex items-center gap-2 h-9 px-4 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                            Modifier
                        </Link>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="flex items-center gap-2 h-9 px-4 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Premium Stats */}
            <div className="grid grid-cols-4 gap-5">
                <div className="mgr-stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Users className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{mission._count.sdrAssignments}</p>
                            <p className="text-sm text-slate-500">SDRs assignés</p>
                        </div>
                    </div>
                </div>
                <div className="mgr-stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <Target className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{mission._count.campaigns}</p>
                            <p className="text-sm text-slate-500">Campagnes</p>
                        </div>
                    </div>
                </div>
                <div className="mgr-stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                            <ListIcon className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{mission._count.lists}</p>
                            <p className="text-sm text-slate-500">Listes</p>
                        </div>
                    </div>
                </div>
                <div className="mgr-stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-cyan-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-900">
                                {mission.startDate ? new Date(mission.startDate).toLocaleDateString("fr-FR") : "-"}
                            </p>
                            <p className="text-xs text-slate-500">
                                → {mission.endDate ? new Date(mission.endDate).toLocaleDateString("fr-FR") : "En cours"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SDRs Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">SDRs assignés</h2>
                    </div>
                    <button
                        onClick={() => {
                            fetchAvailableSDRs();
                            setShowAssignModal(true);
                        }}
                        className="flex items-center gap-2 h-9 px-4 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Assigner
                    </button>
                </div>

                {mission.sdrAssignments.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Aucun SDR assigné</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {mission.sdrAssignments.map((assignment) => (
                            <div
                                key={assignment.id}
                                className="mgr-mission-card flex items-center gap-4 p-4"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-600">
                                    {assignment.sdr.name.split(" ").map(n => n[0]).join("")}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">{assignment.sdr.name}</p>
                                    <p className="text-sm text-slate-500">{assignment.sdr.email}</p>
                                </div>
                                <span className="mgr-badge-active">Actif</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Campaigns Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <Target className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Campagnes</h2>
                    </div>
                    <Link
                        href={`/manager/campaigns/new?missionId=${mission.id}`}
                        className="flex items-center gap-2 h-9 px-4 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                        <Target className="w-4 h-4" />
                        Nouvelle
                    </Link>
                </div>

                {mission.campaigns.length === 0 ? (
                    <div className="text-center py-12">
                        <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Aucune campagne</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {mission.campaigns.map((campaign) => (
                            <Link
                                key={campaign.id}
                                href={`/manager/campaigns/${campaign.id}`}
                                className="mgr-mission-card group flex items-center gap-4 p-4 block"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <Target className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{campaign.name}</p>
                                </div>
                                <span className={campaign.isActive ? "mgr-badge-active" : "mgr-badge-paused"}>
                                    {campaign.isActive ? "Actif" : "Pause"}
                                </span>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Lists Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <ListIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Listes de contacts</h2>
                    </div>
                    <Link
                        href={`/manager/lists/new?missionId=${mission.id}`}
                        className="flex items-center gap-2 h-9 px-4 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                    >
                        <ListIcon className="w-4 h-4" />
                        Nouvelle
                    </Link>
                </div>

                {mission.lists.length === 0 ? (
                    <div className="text-center py-12">
                        <ListIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Aucune liste</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {mission.lists.map((list) => (
                            <Link
                                key={list.id}
                                href={`/manager/lists/${list.id}`}
                                className="mgr-mission-card group flex items-center gap-4 p-4 block"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <ListIcon className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{list.name}</p>
                                    <p className="text-sm text-slate-500">
                                        {list._count?.companies || 0} sociétés · {list._count?.contacts || 0} contacts
                                    </p>
                                </div>
                                <span className="text-xs font-medium text-slate-500 px-2 py-1 bg-slate-100 rounded">{list.type}</span>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Supprimer la mission ?"
                message={`Êtes-vous sûr de vouloir supprimer "${mission.name}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Assign SDR Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 dev-modal-overlay z-50 flex items-center justify-center p-4">
                    <div className="dev-modal w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Assigner un SDR</h2>
                                <p className="text-sm text-slate-500">Sélectionnez un SDR à assigner</p>
                            </div>
                        </div>

                        <Select
                            label="SDR"
                            placeholder="Sélectionner un SDR..."
                            options={availableSDRs.map(sdr => ({
                                value: sdr.id,
                                label: `${sdr.name} (${sdr.email})`,
                            }))}
                            value={selectedSDRId}
                            onChange={setSelectedSDRId}
                            searchable
                        />
                        {availableSDRs.length === 0 && (
                            <p className="text-sm text-slate-500 mt-2">
                                Tous les SDRs sont déjà assignés à cette mission
                            </p>
                        )}

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="h-10 px-5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={!selectedSDRId || isAssigning}
                                className="mgr-btn-primary h-10 px-5 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {isAssigning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Assignation...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4" />
                                        Assigner
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
