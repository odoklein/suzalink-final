"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast, Badge } from "@/components/ui";
import {
    ClipboardList,
    Search,
    Target,
    Building2,
    User,
    Calendar,
    Loader2,
    RefreshCw,
    X,
    Save,
    Trash2,
    Copy,
    Check,
} from "lucide-react";

interface FormulaireItem {
    id: string;
    missionId: string;
    clientId: string;
    contactId: string | null;
    companyId: string | null;
    actionId: string | null;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    mission: { id: string; name: string; clientId: string } | null;
    client: { id: string; name: string } | null;
    company: { id: string; name: string } | null;
    contact: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
    createdBy: { id: string; name: string; email: string } | null;
}

interface ClientOpt { id: string; name: string }
interface MissionOpt { id: string; name: string; clientId: string }

async function fetchFormulaires(params: { missionId?: string; clientId?: string }): Promise<FormulaireItem[]> {
    const qs = new URLSearchParams();
    if (params.missionId) qs.set("missionId", params.missionId);
    if (params.clientId) qs.set("clientId", params.clientId);
    qs.set("limit", "100");
    const res = await fetch(`/api/formulaires?${qs.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Erreur lors du chargement");
    return json.data;
}

async function fetchClients(): Promise<ClientOpt[]> {
    const res = await fetch("/api/clients");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Erreur clients");
    return json.data;
}

async function fetchMissions(): Promise<MissionOpt[]> {
    const res = await fetch("/api/missions?limit=500");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Erreur missions");
    return (json.data ?? json).map((m: { id: string; name: string; clientId: string }) => ({
        id: m.id,
        name: m.name,
        clientId: m.clientId,
    }));
}

function fullName(c: FormulaireItem["contact"]): string | null {
    if (!c) return null;
    const n = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
    return n || null;
}

export default function ManagerFormulairesPage() {
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const [clientFilter, setClientFilter] = useState<string>("");
    const [missionFilter, setMissionFilter] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selected, setSelected] = useState<FormulaireItem | null>(null);
    const [editContent, setEditContent] = useState<string>("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const missionFromUrl = searchParams.get("missionId") ?? "";
        const clientFromUrl = searchParams.get("clientId") ?? "";
        if (clientFromUrl) setClientFilter(clientFromUrl);
        if (missionFromUrl) setMissionFilter(missionFromUrl);
    }, [searchParams]);

    const { data: clients = [] } = useQuery({
        queryKey: ["manager", "formulaires", "clients"],
        queryFn: fetchClients,
        staleTime: 60_000,
    });
    const { data: missions = [] } = useQuery({
        queryKey: ["manager", "formulaires", "missions"],
        queryFn: fetchMissions,
        staleTime: 60_000,
    });

    const missionOptions = useMemo(
        () =>
            clientFilter
                ? missions.filter((m) => m.clientId === clientFilter)
                : missions,
        [missions, clientFilter]
    );

    const {
        data: formulaires = [],
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ["manager", "formulaires", { clientFilter, missionFilter }],
        queryFn: () =>
            fetchFormulaires({
                missionId: missionFilter || undefined,
                clientId: clientFilter || undefined,
            }),
        staleTime: 10_000,
    });

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return formulaires;
        return formulaires.filter((f) => {
            const hay = [
                f.title,
                f.content,
                f.mission?.name,
                f.client?.name,
                f.company?.name,
                fullName(f.contact),
                f.createdBy?.name,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [formulaires, searchQuery]);

    const openDetail = (f: FormulaireItem) => {
        setSelected(f);
        setEditContent(f.content);
    };

    const closeDetail = () => {
        setSelected(null);
        setEditContent("");
        setCopied(false);
    };

    const handleSave = async () => {
        if (!selected) return;
        const res = await fetch(`/api/formulaires/${selected.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: editContent }),
        });
        const json = await res.json();
        if (!json.success) {
            showError("Erreur", json.error || "Impossible de sauvegarder");
            return;
        }
        success("Fiche mise à jour", "Le contenu a été enregistré");
        queryClient.invalidateQueries({ queryKey: ["manager", "formulaires"] });
        setSelected(json.data);
    };

    const handleDelete = async () => {
        if (!selected) return;
        if (!confirm("Supprimer cette fiche ?")) return;
        const res = await fetch(`/api/formulaires/${selected.id}`, { method: "DELETE" });
        const json = await res.json();
        if (!json.success) {
            showError("Erreur", json.error || "Impossible de supprimer");
            return;
        }
        success("Fiche supprimée", "La fiche a été supprimée");
        queryClient.invalidateQueries({ queryKey: ["manager", "formulaires"] });
        closeDetail();
    };

    const handleCopy = () => {
        if (!selected) return;
        navigator.clipboard.writeText(editContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="p-6 space-y-6">
            <header className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Formulaires</h1>
                            <p className="text-sm text-slate-500">
                                Fiches de renseignement remplies depuis la prospection.
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                    Rafraîchir
                </button>
            </header>

            {/* Filters */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Recherche</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Titre, mission, client, contact…"
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Client</label>
                    <select
                        value={clientFilter}
                        onChange={(e) => {
                            setClientFilter(e.target.value);
                            setMissionFilter("");
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
                    >
                        <option value="">Tous les clients</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mission</label>
                    <select
                        value={missionFilter}
                        onChange={(e) => setMissionFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
                    >
                        <option value="">Toutes les missions</option>
                        {missionOptions.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
            </section>

            {/* List */}
            <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                        {filtered.length} fiche{filtered.length > 1 ? "s" : ""}
                    </p>
                    {isFetching && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…
                        </span>
                    )}
                </div>
                {filtered.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-500">
                        Aucune fiche de renseignement pour ces filtres.
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {filtered.map((f) => (
                            <li key={f.id}>
                                <button
                                    type="button"
                                    onClick={() => openDetail(f)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-900 truncate">
                                                {f.title}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                {f.mission && (
                                                    <Badge variant="default" className="gap-1">
                                                        <Target className="w-3 h-3" /> {f.mission.name}
                                                    </Badge>
                                                )}
                                                {f.client && (
                                                    <Badge variant="default" className="gap-1">
                                                        <Building2 className="w-3 h-3" /> {f.client.name}
                                                    </Badge>
                                                )}
                                                {f.company && (
                                                    <span className="inline-flex items-center gap-1 text-slate-500">
                                                        <Building2 className="w-3 h-3" /> {f.company.name}
                                                    </span>
                                                )}
                                                {f.contact && (
                                                    <span className="inline-flex items-center gap-1 text-slate-500">
                                                        <User className="w-3 h-3" /> {fullName(f.contact)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right text-xs text-slate-500 shrink-0">
                                            <div className="inline-flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                                            </div>
                                            {f.createdBy && (
                                                <div className="mt-0.5 text-slate-400 truncate max-w-[160px]">
                                                    {f.createdBy.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Detail side panel */}
            {selected && (
                <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={closeDetail} />
                    <div className="relative w-full max-w-2xl bg-white shadow-xl h-full flex flex-col">
                        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {selected.mission?.name} • {selected.client?.name}
                                    {selected.createdBy?.name ? ` • ${selected.createdBy.name}` : ""}
                                </p>
                            </div>
                            <button
                                onClick={closeDetail}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                {selected.contact && (
                                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                                        <p className="font-semibold text-slate-600">Contact</p>
                                        <p className="text-slate-800 mt-0.5">{fullName(selected.contact)}</p>
                                        {selected.contact.email && (
                                            <p className="text-slate-500">{selected.contact.email}</p>
                                        )}
                                    </div>
                                )}
                                {selected.company && (
                                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                                        <p className="font-semibold text-slate-600">Société</p>
                                        <p className="text-slate-800 mt-0.5">{selected.company.name}</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="formulaire-edit" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Fiche de renseignement
                                    </label>
                                    <button
                                        onClick={handleCopy}
                                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        Copier
                                    </button>
                                </div>
                                <textarea
                                    id="formulaire-edit"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={22}
                                    className="w-full px-3 py-2.5 text-xs font-mono border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 resize-y"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/40">
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            >
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={closeDetail}
                                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={editContent === selected.content}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                                >
                                    <Save className="w-4 h-4" />
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
