"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
    Phone,
    Mail,
    Linkedin,
    Building2,
    User,
    Globe,
    Clock,
    Calendar,
    Sparkles,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Ban,
    Loader2,
    ExternalLink,
    RefreshCw,
    AlertCircle,
} from "lucide-react";
import { Card, Badge, Button, LoadingState, EmptyState, Tabs, Drawer, DataTable } from "@/components/ui";
import type { Column } from "@/components/ui/DataTable";
import { CompanyDrawer, ContactDrawer } from "@/components/drawers";
import { BookingModal } from "@/components/sdr/BookingModal";
import type { ActionResult, Channel } from "@/lib/types";
import { ACTION_RESULT_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface NextActionData {
    hasNext: boolean;
    message?: string;
    priority?: "CALLBACK" | "FOLLOW_UP" | "NEW" | "RETRY";
    missionName?: string;
    contact?: {
        id: string;
        firstName?: string;
        lastName?: string;
        title?: string;
        email?: string;
        phone?: string;
        linkedin?: string;
        status: string;
    } | null;
    company?: {
        id: string;
        name: string;
        industry?: string;
        website?: string;
        country?: string;
        phone?: string | null;
    };
    campaignId?: string;
    channel?: Channel;
    script?: string;
    clientBookingUrl?: string;
    lastAction?: {
        result: string;
        note?: string;
        createdAt: string;
    };
}

interface Mission {
    id: string;
    name: string;
    channel: string;
    client: { name: string };
}

interface ListItem {
    id: string;
    name: string;
    mission: { id: string; name: string };
    contactsCount: number;
}

interface QueueItem {
    contactId: string | null;
    companyId: string;
    contact: NextActionData["contact"] | null;
    company: NonNullable<NextActionData["company"]>;
    campaignId: string;
    channel: string;
    missionName: string;
    lastAction: NextActionData["lastAction"] | null;
    priority: string;
    _displayName?: string;
    _companyName?: string;
}

interface DrawerContact {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    title: string | null;
    linkedin: string | null;
    status: "INCOMPLETE" | "PARTIAL" | "ACTIONABLE";
    companyId: string;
    companyName?: string;
}

interface DrawerCompany {
    id: string;
    name: string;
    industry: string | null;
    country: string | null;
    website: string | null;
    size: string | null;
    status: "INCOMPLETE" | "PARTIAL" | "ACTIONABLE";
    contacts: Array<{
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        title: string | null;
        linkedin: string | null;
        status: string;
        companyId: string;
    }>;
    _count: { contacts: number };
}

const RESULT_OPTIONS: { value: ActionResult; label: string; icon: React.ReactNode; key: string; color: string }[] = [
    { value: "NO_RESPONSE", label: "Pas de réponse", icon: <XCircle className="w-4 h-4" />, key: "1", color: "slate" },
    { value: "BAD_CONTACT", label: "Mauvais contact", icon: <Ban className="w-4 h-4" />, key: "2", color: "red" },
    { value: "INTERESTED", label: "Intéressé", icon: <Sparkles className="w-4 h-4" />, key: "3", color: "emerald" },
    { value: "CALLBACK_REQUESTED", label: "Rappel demandé", icon: <Clock className="w-4 h-4" />, key: "4", color: "amber" },
    { value: "MEETING_BOOKED", label: "RDV pris", icon: <Calendar className="w-4 h-4" />, key: "5", color: "indigo" },
    { value: "DISQUALIFIED", label: "Disqualifié", icon: <XCircle className="w-4 h-4" />, key: "6", color: "slate" },
];

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    CALLBACK: { label: "Rappel", color: "bg-amber-50 text-amber-700 border-amber-200" },
    FOLLOW_UP: { label: "Suivi", color: "bg-blue-50 text-blue-700 border-blue-200" },
    NEW: { label: "Nouveau", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    RETRY: { label: "Relance", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

const SCRIPT_TABS = [
    { id: "intro", label: "Intro" },
    { id: "discovery", label: "Découverte" },
    { id: "objection", label: "Objections" },
    { id: "closing", label: "Closing" },
];

export default function SDRActionPage() {
    const { data: session } = useSession();
    const [currentAction, setCurrentAction] = useState<NextActionData | null>(null);
    const [selectedResult, setSelectedResult] = useState<ActionResult | null>(null);
    const [note, setNote] = useState("");
    /** For CALLBACK_REQUESTED: date/time from calendar (YYYY-MM-DDTHH:mm for datetime-local). */
    const [callbackDateValue, setCallbackDateValue] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [actionsCompleted, setActionsCompleted] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [missions, setMissions] = useState<Mission[]>([]);
    const [lists, setLists] = useState<ListItem[]>([]);
    const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [viewType, setViewType] = useState<"all" | "companies" | "contacts">("all");
    const [activeTab, setActiveTab] = useState<string>("intro");
    const [showBookingModal, setShowBookingModal] = useState(false);

    // View mode: card (current) vs table
    const [viewMode, setViewMode] = useState<"card" | "table">("card");
    const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
    const [queueLoading, setQueueLoading] = useState(false);
    const [submittingRowKey, setSubmittingRowKey] = useState<string | null>(null);

    // Drawer for table view (contact/company fiche)
    const [drawerContactId, setDrawerContactId] = useState<string | null>(null);
    const [drawerCompanyId, setDrawerCompanyId] = useState<string | null>(null);
    const [drawerContact, setDrawerContact] = useState<DrawerContact | null>(null);
    const [drawerCompany, setDrawerCompany] = useState<DrawerCompany | null>(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // Load filters
    useEffect(() => {
        const loadFilters = async () => {
            try {
                const [missionsRes, listsRes] = await Promise.all([
                    fetch("/api/sdr/missions"),
                    fetch("/api/sdr/lists"),
                ]);
                const missionsJson = await missionsRes.json();
                const listsJson = await listsRes.json();

                if (missionsJson.success) {
                    setMissions(missionsJson.data);
                    const saved = localStorage.getItem("sdr_selected_mission");
                    if (saved && missionsJson.data.some((m: Mission) => m.id === saved)) {
                        setSelectedMissionId(saved);
                    } else if (missionsJson.data.length > 0) {
                        setSelectedMissionId(missionsJson.data[0].id);
                    }
                }
                if (listsJson.success) {
                    setLists(listsJson.data);
                }
            } catch (err) {
                console.error("Failed to load filters:", err);
            }
        };
        loadFilters();
    }, []);

    const filteredLists = selectedMissionId
        ? lists.filter((l) => l.mission.id === selectedMissionId)
        : lists;

    // Load next action
    const loadNextAction = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSelectedResult(null);
        setNote("");
        setCallbackDateValue("");
        setShowSuccess(false);
        setElapsedTime(0);
        setActiveTab("intro");

        try {
            const params = new URLSearchParams();
            if (selectedMissionId) params.set("missionId", selectedMissionId);
            if (selectedListId) params.set("listId", selectedListId);

            const res = await fetch(`/api/actions/next?${params.toString()}`);
            const json = await res.json();

            if (!json.success) {
                setError(json.error || "Erreur lors du chargement");
                setCurrentAction(null);
            } else {
                setCurrentAction(json.data);
                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
            }
        } catch {
            setError("Erreur de connexion");
            setCurrentAction(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedMissionId, selectedListId]);

    useEffect(() => {
        if (selectedMissionId !== null) loadNextAction();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [selectedMissionId, selectedListId, loadNextAction]);

    // Fetch queue for table view
    useEffect(() => {
        if (viewMode !== "table" || selectedMissionId === null) {
            setQueueItems([]);
            return;
        }
        setQueueLoading(true);
        const params = new URLSearchParams();
        params.set("missionId", selectedMissionId);
        if (selectedListId) params.set("listId", selectedListId);
        params.set("limit", "100");
        fetch(`/api/sdr/action-queue?${params.toString()}`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data?.items) {
                    const items = json.data.items as QueueItem[];
                    setQueueItems(items.map((i) => ({
                        ...i,
                        _displayName: i.contact
                            ? `${(i.contact.firstName || "").trim()} ${(i.contact.lastName || "").trim()}`.trim() || i.company.name
                            : i.company.name,
                        _companyName: i.company.name,
                    })));
                } else {
                    setQueueItems([]);
                }
            })
            .catch(() => setQueueItems([]))
            .finally(() => setQueueLoading(false));
    }, [viewMode, selectedMissionId, selectedListId]);

    // Fetch contact when opening contact drawer (table view)
    useEffect(() => {
        if (!drawerContactId) {
            setDrawerContact(null);
            return;
        }
        setDrawerLoading(true);
        fetch(`/api/contacts/${drawerContactId}`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data) {
                    const c = json.data;
                    setDrawerContact({
                        id: c.id,
                        firstName: c.firstName,
                        lastName: c.lastName,
                        email: c.email,
                        phone: c.phone,
                        title: c.title,
                        linkedin: c.linkedin,
                        status: c.status ?? "PARTIAL",
                        companyId: c.company?.id ?? "",
                        companyName: c.company?.name ?? undefined,
                    });
                } else {
                    setDrawerContact(null);
                }
            })
            .catch(() => setDrawerContact(null))
            .finally(() => setDrawerLoading(false));
    }, [drawerContactId]);

    // Fetch company when opening company drawer (table view)
    useEffect(() => {
        if (!drawerCompanyId) {
            setDrawerCompany(null);
            return;
        }
        setDrawerLoading(true);
        fetch(`/api/companies/${drawerCompanyId}`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data) {
                    const co = json.data;
                    setDrawerCompany({
                        id: co.id,
                        name: co.name,
                        industry: co.industry,
                        country: co.country,
                        website: co.website,
                        size: co.size,
                        status: co.status ?? "PARTIAL",
                        contacts: (co.contacts ?? []).map((ct: { id: string; firstName: string | null; lastName: string | null; email: string | null; phone: string | null; title: string | null; linkedin: string | null; status: string; companyId: string }) => ({
                            id: ct.id,
                            firstName: ct.firstName,
                            lastName: ct.lastName,
                            email: ct.email,
                            phone: ct.phone,
                            title: ct.title,
                            linkedin: ct.linkedin,
                            status: ct.status ?? "PARTIAL",
                            companyId: ct.companyId,
                        })),
                        _count: { contacts: co._count?.contacts ?? co.contacts?.length ?? 0 },
                    });
                } else {
                    setDrawerCompany(null);
                }
            })
            .catch(() => setDrawerCompany(null))
            .finally(() => setDrawerLoading(false));
    }, [drawerCompanyId]);

    const queueRowKey = (row: QueueItem) => row.contactId ?? row.companyId;
    const openDrawerForRow = (row: QueueItem) => {
        if (row.contactId) {
            setDrawerCompanyId(null);
            setDrawerContactId(row.contactId);
        } else {
            setDrawerContactId(null);
            setDrawerCompanyId(row.companyId);
        }
    };
    const closeContactDrawer = () => {
        setDrawerContactId(null);
        setDrawerContact(null);
    };
    const closeCompanyDrawer = () => {
        setDrawerCompanyId(null);
        setDrawerCompany(null);
    };
    const handleContactFromCompany = (contact: { id: string }) => {
        setDrawerCompanyId(null);
        setDrawerCompany(null);
        setDrawerContactId(contact.id);
    };

    const handleQuickAction = async (row: QueueItem, result: ActionResult) => {
        const key = queueRowKey(row);
        setSubmittingRowKey(key);
        const noteRequired = result === "INTERESTED" || result === "CALLBACK_REQUESTED";
        const note = noteRequired
            ? (result === "CALLBACK_REQUESTED" ? "Rappel demandé" : "Intéressé")
            : undefined;
        try {
            const res = await fetch("/api/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contactId: row.contactId ?? undefined,
                    companyId: row.contactId ? undefined : row.companyId,
                    campaignId: row.campaignId,
                    channel: row.channel,
                    result,
                    note: note ?? undefined,
                    callbackDate: result === "CALLBACK_REQUESTED" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setQueueItems((prev) => prev.filter((r) => queueRowKey(r) !== key));
                setActionsCompleted((c) => c + 1);
            }
        } catch {
            // ignore
        } finally {
            setSubmittingRowKey(null);
        }
    };

    // Submit
    const handleSubmit = async () => {
        if (!selectedResult || !currentAction?.campaignId) return;
        if (!currentAction.contact && !currentAction.company) {
            setError("Aucun contact ou entreprise disponible");
            return;
        }
        if ((selectedResult === "INTERESTED" || selectedResult === "CALLBACK_REQUESTED") && !note.trim()) {
            setError("Note requise pour ce résultat");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

        try {
            const res = await fetch("/api/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contactId: currentAction.contact?.id,
                    companyId: !currentAction.contact && currentAction.company ? currentAction.company.id : undefined,
                    campaignId: currentAction.campaignId,
                    channel: currentAction.channel,
                    result: selectedResult,
                    note: note || undefined,
                    callbackDate: selectedResult === "CALLBACK_REQUESTED" && callbackDateValue ? new Date(callbackDateValue).toISOString() : undefined,
                    duration: elapsedTime,
                }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.error || "Erreur");
                return;
            }
            setShowSuccess(true);
            setActionsCompleted((prev) => prev + 1);
            // Immediately load the next action and reset submitting state
            await loadNextAction();
            setShowSuccess(false);
        } catch {
            setError("Erreur de connexion");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handlers
    const handleMissionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedMissionId(id);
        localStorage.setItem("sdr_selected_mission", id);
        setSelectedListId(null);
    };

    const handleListChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedListId(id === "all" ? null : id);
    };

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLTextAreaElement) return;
            if (e.key >= "1" && e.key <= "6") {
                setSelectedResult(RESULT_OPTIONS[parseInt(e.key) - 1].value);
            }
            if (e.key === "Enter" && selectedResult && !isSubmitting) {
                e.preventDefault();
                handleSubmit();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [selectedResult, isSubmitting]);

    // Parse script
    let scriptSections: Record<string, string> | null = null;
    if (currentAction?.script) {
        try {
            const parsed = JSON.parse(currentAction.script);
            if (typeof parsed === "object") scriptSections = parsed;
        } catch { }
    }

    // Filter script tabs based on available content
    const availableScriptTabs = scriptSections
        ? SCRIPT_TABS.filter(tab => scriptSections && scriptSections[tab.id])
        : [];

    // ========== TABLE VIEW ==========
    if (viewMode === "table") {
        const queueColumns: Column<QueueItem>[] = [
            {
                key: "name",
                header: "Contact / Société",
                render: (_, row) => {
                    const name = row.contact
                        ? `${row.contact.firstName || ""} ${row.contact.lastName || ""}`.trim() || row.company.name
                        : row.company.name;
                    return (
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                {row.contactId ? (
                                    <User className="w-4 h-4 text-slate-500" />
                                ) : (
                                    <Building2 className="w-4 h-4 text-slate-500" />
                                )}
                            </div>
                            <div>
                                <p className="font-medium text-slate-900 truncate max-w-[200px]">{name}</p>
                                {row.contact && row.company.name !== name && (
                                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{row.company.name}</p>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                key: "missionName",
                header: "Mission",
                render: (v) => <span className="text-sm text-slate-600">{v}</span>,
            },
            {
                key: "lastAction",
                header: "Dernière action",
                render: (_, row) =>
                    row.lastAction ? (
                        <Badge className={cn("text-xs", PRIORITY_LABELS[row.priority as keyof typeof PRIORITY_LABELS]?.color ?? "bg-slate-100 text-slate-700")}>
                            {ACTION_RESULT_LABELS[row.lastAction.result as ActionResult] ?? row.lastAction.result}
                        </Badge>
                    ) : (
                        <span className="text-xs text-slate-400">—</span>
                    ),
            },
            {
                key: "priority",
                header: "Priorité",
                render: (v) => (
                    <Badge className={PRIORITY_LABELS[v as keyof typeof PRIORITY_LABELS]?.color ?? "bg-slate-100 text-slate-700"}>
                        {PRIORITY_LABELS[v as keyof typeof PRIORITY_LABELS]?.label ?? v}
                    </Badge>
                ),
            },
            {
                key: "quickActions",
                header: "Actions rapides",
                render: (_, row) => {
                    const key = queueRowKey(row);
                    const submitting = submittingRowKey === key;
                    return (
                        <div className="flex items-center gap-1 flex-wrap">
                            {submitting && (
                                <span className="flex items-center justify-center w-8 h-8 text-indigo-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                </span>
                            )}
                            {RESULT_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickAction(row, opt.value);
                                    }}
                                    disabled={submitting}
                                    title={opt.label}
                                    className={cn(
                                        "w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                                        "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600",
                                        submitting && "opacity-50 pointer-events-none"
                                    )}
                                >
                                    {opt.icon}
                                </button>
                            ))}
                        </div>
                    );
                },
            },
        ];

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => setViewMode("card")}
                                className={cn(
                                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                    viewMode === "card" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                Vue carte
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("table")}
                                className={cn(
                                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                    viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                Vue tableau
                            </button>
                        </div>
                        <select
                            value={selectedMissionId || ""}
                            onChange={handleMissionChange}
                            className="h-10 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <select
                            value={selectedListId || "all"}
                            onChange={handleListChange}
                            className="h-10 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Toutes les listes</option>
                            {filteredLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <span className="text-sm text-slate-500">{actionsCompleted} actions</span>
                </div>

                <Card className="overflow-hidden">
                    <DataTable
                        data={queueItems}
                        columns={queueColumns}
                        keyField={(row) => queueRowKey(row)}
                        searchable
                        searchPlaceholder="Rechercher contact ou société..."
                        searchFields={["_displayName", "_companyName", "missionName"]}
                        pagination
                        pageSize={15}
                        loading={queueLoading}
                        emptyMessage="Aucun contact dans la file. Changez de mission ou liste."
                        onRowClick={openDrawerForRow}
                    />
                </Card>

                {(drawerContactId || drawerCompanyId) && drawerLoading && (
                    <Drawer
                        isOpen
                        onClose={() => { setDrawerContactId(null); setDrawerCompanyId(null); }}
                        title="Chargement..."
                    >
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    </Drawer>
                )}
                {drawerContactId && drawerContact && (
                    <ContactDrawer
                        isOpen={!!drawerContactId}
                        onClose={closeContactDrawer}
                        contact={drawerContact}
                        onUpdate={(updated) => setDrawerContact(updated)}
                        isManager={true}
                        companies={[]}
                    />
                )}
                {drawerCompanyId && drawerCompany && (
                    <CompanyDrawer
                        isOpen={!!drawerCompanyId}
                        onClose={closeCompanyDrawer}
                        company={drawerCompany}
                        onUpdate={(updated) => setDrawerCompany(updated)}
                        onContactClick={handleContactFromCompany}
                        isManager={true}
                    />
                )}
            </div>
        );
    }

    // Loading (card view)
    if (isLoading && !currentAction) {
        return <LoadingState message="Chargement du prochain contact..." />;
    }

    // Empty queue (card view)
    if (!currentAction?.hasNext) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => setViewMode("card")}
                                className={cn(
                                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                    viewMode === "card" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                Vue carte
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("table")}
                                className={cn(
                                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                    viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                Vue tableau
                            </button>
                        </div>
                        <select
                            value={selectedMissionId || ""}
                            onChange={handleMissionChange}
                            className="h-10 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            {missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <select
                            value={selectedListId || "all"}
                            onChange={handleListChange}
                            className="h-10 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">Toutes les listes</option>
                            {filteredLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                </div>

                <EmptyState
                    icon={CheckCircle2}
                    title="File d'attente vide"
                    description={currentAction?.message || "Aucun contact disponible pour le moment"}
                    action={
                        <Button variant="secondary" onClick={loadNextAction} className="gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Actualiser
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Success Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="text-center animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">Action enregistrée</p>
                        <p className="text-sm text-slate-500 mt-1">Chargement du contact suivant...</p>
                    </div>
                </div>
            )}

            {/* Header with Filters */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                        <button
                            type="button"
                            onClick={() => setViewMode("card")}
                            className={cn(
                                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                viewMode === "card" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            Vue carte
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={cn(
                                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            Vue tableau
                        </button>
                    </div>
                    <select
                        value={selectedMissionId || ""}
                        onChange={handleMissionChange}
                        className="h-10 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        {missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <select
                        value={selectedListId || "all"}
                        onChange={handleListChange}
                        className="h-10 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="all">Toutes les listes</option>
                        {filteredLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <select
                        value={viewType}
                        onChange={(e) => setViewType(e.target.value as "all" | "companies" | "contacts")}
                        className="h-10 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="all">Tout afficher</option>
                        <option value="companies">Sociétés uniquement</option>
                        <option value="contacts">Contacts uniquement</option>
                    </select>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">{actionsCompleted} actions</span>
                    <span className={cn(
                        "font-mono px-2 py-1 rounded-lg",
                        elapsedTime > 300 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"
                    )}>
                        {formatTime(elapsedTime)}
                    </span>
                    {currentAction.priority && (
                        <Badge className={PRIORITY_LABELS[currentAction.priority].color}>
                            {PRIORITY_LABELS[currentAction.priority].label}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <Card className="!p-4 border-red-200 bg-red-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-red-700">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                </Card>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left - Contact Panel (2 cols) */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Company Card */}
                    <Card>
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-semibold text-slate-900 truncate">
                                    {currentAction.company?.name}
                                </h2>
                                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                    {currentAction.company?.industry && <span>{currentAction.company.industry}</span>}
                                    {currentAction.company?.country && <span>• {currentAction.company.country}</span>}
                                </div>
                                {currentAction.company?.website && (
                                    <a
                                        href={`https://${currentAction.company.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        {currentAction.company.website}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Contact/Company Card */}
                    <Card>
                        {currentAction.contact ? (
                            <>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <User className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {currentAction.contact.firstName} {currentAction.contact.lastName}
                                        </p>
                                        {currentAction.contact.title && (
                                            <Badge variant="default" className="mt-1">
                                                {currentAction.contact.title}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Actions */}
                                <div className="space-y-2">
                                    {/* Phone - validate it looks like a phone number (contains digits) */}
                                    {(() => {
                                        const phone = currentAction.contact.phone || (currentAction.channel === 'CALL' && currentAction.company?.phone ? currentAction.company.phone : null);
                                        const isValidPhone = phone && /[\d+\-().\s]/.test(phone) && phone.length >= 8;
                                        return isValidPhone ? (
                                            <a
                                                href={`tel:${phone}`}
                                                className="flex items-center justify-center gap-2 h-12 w-full text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                                            >
                                                <Phone className="w-4 h-4" />
                                                {phone}
                                            </a>
                                        ) : null;
                                    })()}
                                    {/* Email - validate it looks like an email */}
                                    {(() => {
                                        const email = currentAction.contact.email;
                                        const isValidEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                                        return isValidEmail ? (
                                            <a
                                                href={`mailto:${email}`}
                                                className="flex items-center justify-center gap-2 h-11 w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                                            >
                                                <Mail className="w-4 h-4" />
                                                {email}
                                            </a>
                                        ) : null;
                                    })()}
                                    {currentAction.contact.linkedin && (
                                        <a
                                            href={currentAction.contact.linkedin.startsWith("http") ? currentAction.contact.linkedin : `https://${currentAction.contact.linkedin}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 h-11 w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                                        >
                                            <Linkedin className="w-4 h-4" />
                                            LinkedIn
                                        </a>
                                    )}
                                    {/* Show warning if contact info is missing or invalid */}
                                    {(() => {
                                        const phone = currentAction.contact.phone || (currentAction.channel === 'CALL' && currentAction.company?.phone ? currentAction.company.phone : null);
                                        const isValidPhone = phone && /[\d+\-().\s]/.test(phone) && phone.length >= 8;
                                        const email = currentAction.contact.email;
                                        const isValidEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

                                        if (currentAction.channel === 'CALL' && !isValidPhone) {
                                            return (
                                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                                                    <AlertCircle className="w-4 h-4 inline mr-2" />
                                                    Aucun numéro de téléphone valide disponible
                                                </div>
                                            );
                                        }
                                        if (currentAction.channel === 'EMAIL' && !isValidEmail) {
                                            return (
                                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                                                    <AlertCircle className="w-4 h-4 inline mr-2" />
                                                    Aucune adresse email valide disponible
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                    {currentAction.clientBookingUrl && (
                                        <Button
                                            variant="primary"
                                            onClick={() => setShowBookingModal(true)}
                                            className="w-full gap-2"
                                        >
                                            <Calendar className="w-4 h-4" />
                                            Planifier un RDV
                                        </Button>
                                    )}
                                </div>
                            </>
                        ) : currentAction.company?.phone ? (
                            <>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {currentAction.company.name}
                                        </p>
                                        <Badge variant="default" className="mt-1">
                                            Entreprise
                                        </Badge>
                                    </div>
                                </div>

                                {/* Company Actions */}
                                <div className="space-y-2">
                                    {currentAction.company.phone && (
                                        <a
                                            href={`tel:${currentAction.company.phone}`}
                                            className="flex items-center justify-center gap-2 h-12 w-full text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                                        >
                                            <Phone className="w-4 h-4" />
                                            {currentAction.company.phone}
                                        </a>
                                    )}
                                </div>
                            </>
                        ) : null}

                        {/* Previous Note */}
                        {currentAction.lastAction?.note && (
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Note précédente</p>
                                <p className="text-sm text-amber-900">{currentAction.lastAction.note}</p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right - Script Panel (3 cols) */}
                <div className="lg:col-span-3">
                    <Card className="h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">Script d'appel</h3>
                        </div>

                        {scriptSections && availableScriptTabs.length > 0 ? (
                            <>
                                <Tabs
                                    tabs={availableScriptTabs}
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    className="mb-4"
                                />
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 min-h-[200px]">
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {scriptSections[activeTab] || ""}
                                    </p>
                                </div>
                            </>
                        ) : currentAction.script ? (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {currentAction.script}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-sm text-slate-400">
                                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                Aucun script disponible
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Action Results */}
            <Card>
                <p className="text-sm font-semibold text-slate-900 mb-4">Résultat de l'action</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {RESULT_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setSelectedResult(option.value)}
                            className={cn(
                                "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                selectedResult === option.value
                                    ? "bg-indigo-50 border-indigo-300"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <span className={selectedResult === option.value ? "text-indigo-600" : "text-slate-400"}>
                                {option.icon}
                            </span>
                            <span className={cn(
                                "text-sm font-medium",
                                selectedResult === option.value ? "text-indigo-900" : "text-slate-700"
                            )}>
                                {option.label}
                            </span>
                            <span className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-[10px] font-mono text-slate-400 bg-slate-100 rounded">
                                {option.key}
                            </span>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Note */}
            <Card>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                    Note
                    {(selectedResult === "INTERESTED" || selectedResult === "CALLBACK_REQUESTED") && (
                        <span className="text-red-500 ml-1">*</span>
                    )}
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ajouter une note..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-slate-400 mt-2 text-right">{note.length}/500</p>
            </Card>

            {/* Callback date (Rappel) - calendar when "Rappel demandé" */}
            {selectedResult === "CALLBACK_REQUESTED" && (
                <Card className="border-amber-200 bg-amber-50/50">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-5 h-5 text-amber-600" />
                        <label className="block text-sm font-semibold text-slate-900">Date de rappel</label>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                        {currentAction?.missionName && (
                            <span className="font-medium text-slate-700">Mission: {currentAction.missionName}</span>
                        )}
                        {!currentAction?.missionName && "Choisissez une date et heure pour le rappel."}
                    </p>
                    <input
                        type="datetime-local"
                        value={callbackDateValue}
                        onChange={(e) => setCallbackDateValue(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-4 py-3 text-sm border border-amber-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-300"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                        Optionnel. Vous pouvez aussi indiquer la date dans la note (ex: &quot;rappeler demain 14h&quot;).
                    </p>
                </Card>
            )}

            {/* Submit */}
            <div className="flex justify-end">
                <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!selectedResult || isSubmitting}
                    isLoading={isSubmitting}
                    className="gap-2"
                >
                    Valider & Suivant
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            {/* Booking Modal */}
            {currentAction?.clientBookingUrl && currentAction.contact && (
                <BookingModal
                    isOpen={showBookingModal}
                    onClose={() => setShowBookingModal(false)}
                    bookingUrl={currentAction.clientBookingUrl}
                    contactId={currentAction.contact.id}
                    contactName={`${currentAction.contact.firstName || ""} ${currentAction.contact.lastName || ""}`.trim() || "Contact"}
                    onBookingSuccess={() => {
                        // Reload next action after booking success
                        loadNextAction();
                    }}
                />
            )}
        </div>
    );
}
