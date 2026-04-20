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
    Download,
    Mail,
    PenLine,
    QrCode,
} from "lucide-react";
import {
    isFicheHygieneAlimentaireContent,
    FicheHygieneAlimentaireData,
} from "@/lib/constants/ficheHygieneAlimentaire";
import FicheHygieneAlimentaireForm from "@/components/fiche/FicheHygieneAlimentaireForm";
import { downloadFormulairesCsv } from "@/lib/utils/formulaireExport";
import { InPersonSignModal } from "@/components/formulaires/InPersonSignModal";
import { QrCodeModal } from "@/components/formulaires/QrCodeModal";

interface FormulaireItem {
    id: string;
    missionId: string;
    clientId: string;
    contactId: string | null;
    companyId: string | null;
    actionId: string | null;
    title: string;
    content: string;
    status: "DRAFT" | "SENT" | "SIGNED";
    sentToEmail: string | null;
    sentAt: string | null;
    signedAt: string | null;
    signedBy: string | null;
    createdAt: string;
    updatedAt: string;
    mission: { id: string; name: string; clientId: string } | null;
    client: { id: string; name: string; email?: string | null } | null;
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
    const [editFiche, setEditFiche] = useState<FicheHygieneAlimentaireData | null>(null);
    const [copied, setCopied] = useState(false);
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [recipientEmail, setRecipientEmail] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [originFilter, setOriginFilter] = useState<"ALL" | "CALLING" | "EMAIL_SENT">("ALL");
    const [showInPersonSign, setShowInPersonSign] = useState(false);
    const [showQr, setShowQr] = useState(false);

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
        const base = !q
            ? formulaires
            : formulaires.filter((f) => {
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
        if (originFilter === "CALLING") return base.filter((f) => Boolean(f.actionId));
        if (originFilter === "EMAIL_SENT") return base.filter((f) => Boolean(f.sentAt));
        return base;
    }, [formulaires, searchQuery, originFilter]);

    const verificationCounts = useMemo(
        () => ({
            total: formulaires.length,
            fromCalling: formulaires.filter((f) => Boolean(f.actionId)).length,
            sentByEmail: formulaires.filter((f) => Boolean(f.sentAt)).length,
        }),
        [formulaires]
    );

    const openDetail = (f: FormulaireItem) => {
        setSelected(f);
        setRecipientEmail(f.sentToEmail || f.contact?.email || "");
        const fiche = isFicheHygieneAlimentaireContent(f.content);
        if (fiche) {
            setEditFiche(fiche);
            setEditContent("");
        } else {
            setEditFiche(null);
            setEditContent(f.content);
        }
    };

    const closeDetail = () => {
        setSelected(null);
        setEditContent("");
        setEditFiche(null);
        setCopied(false);
    };

    const isDirty = selected
        ? editFiche
            ? JSON.stringify(editFiche) !== selected.content
            : editContent !== selected.content
        : false;

    const handleSave = async () => {
        if (!selected) return;
        const contentToSave = editFiche ? JSON.stringify(editFiche) : editContent;
        const res = await fetch(`/api/formulaires/${selected.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: contentToSave }),
        });
        const json = await res.json();
        if (!json.success) {
            showError("Erreur", json.error || "Impossible de sauvegarder");
            return;
        }
        success("Fiche mise à jour", "Le contenu a été enregistré");
        queryClient.invalidateQueries({ queryKey: ["manager", "formulaires"] });
        setSelected(json.data);
        const fiche = isFicheHygieneAlimentaireContent(json.data.content);
        if (fiche) setEditFiche(fiche);
        else setEditContent(json.data.content);
    };

    const toggleCheck = (id: string) => {
        setChecked((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (checked.size === filtered.length) setChecked(new Set());
        else setChecked(new Set(filtered.map((f) => f.id)));
    };

    const exportItems = (items: FormulaireItem[], prefix: string) => {
        if (!items.length) {
            showError("Export", "Aucun formulaire à exporter.");
            return;
        }
        downloadFormulairesCsv(items, prefix);
    };

    const exportSelected = () =>
        exportItems(filtered.filter((f) => checked.has(f.id)), "formulaires-selection");
    const exportAll = () => exportItems(filtered, "formulaires-manager");
    const exportSingle = (f: FormulaireItem) =>
        exportItems([f], `formulaire-${f.id.slice(0, 8)}`);

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

    const statusUi: Record<FormulaireItem["status"], { label: string; className: string }> = {
        DRAFT: { label: "Brouillon", className: "bg-slate-100 text-slate-700" },
        SENT: { label: "Envoye", className: "bg-amber-100 text-amber-700" },
        SIGNED: { label: "Signe", className: "bg-emerald-100 text-emerald-700" },
    };

    const handleSendForSignature = async () => {
        if (!selected) return;
        if (!recipientEmail.trim()) {
            showError("Email requis", "Saisissez un email de destinataire");
            return;
        }
        setIsSending(true);
        try {
            const res = await fetch(`/api/formulaires/${selected.id}/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipientEmail: recipientEmail.trim() }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Envoi impossible");
            success("Formulaire envoye", "Le lien de signature a ete envoye par email.");
            await queryClient.invalidateQueries({ queryKey: ["manager", "formulaires"] });
            setSelected((prev) => (prev ? { ...prev, ...json.data } : prev));
        } catch (e) {
            showError("Erreur", e instanceof Error ? e.message : "Envoi impossible");
        } finally {
            setIsSending(false);
        }
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
                <div className="flex items-center gap-2 flex-wrap">
                    {checked.size > 0 && (
                        <button
                            onClick={exportSelected}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100"
                        >
                            <Download className="w-4 h-4" />
                            Exporter la sélection ({checked.size})
                        </button>
                    )}
                    <button
                        onClick={exportAll}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                    >
                        <Download className="w-4 h-4" />
                        Exporter tout
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                        Rafraîchir
                    </button>
                </div>
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
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setOriginFilter("ALL")}
                            className={`text-xs px-3 py-1.5 rounded-full border ${
                                originFilter === "ALL"
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                    : "bg-white border-slate-200 text-slate-600"
                            }`}
                        >
                            Tous ({verificationCounts.total})
                        </button>
                        <button
                            onClick={() => setOriginFilter("CALLING")}
                            className={`text-xs px-3 py-1.5 rounded-full border ${
                                originFilter === "CALLING"
                                    ? "bg-violet-50 border-violet-200 text-violet-700"
                                    : "bg-white border-slate-200 text-slate-600"
                            }`}
                        >
                            Depuis appels ({verificationCounts.fromCalling})
                        </button>
                        <button
                            onClick={() => setOriginFilter("EMAIL_SENT")}
                            className={`text-xs px-3 py-1.5 rounded-full border ${
                                originFilter === "EMAIL_SENT"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-white border-slate-200 text-slate-600"
                            }`}
                        >
                            Envoyes par email ({verificationCounts.sentByEmail})
                        </button>
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
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">
                        {filtered.length} fiche{filtered.length > 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-3">
                        {filtered.length > 0 && (
                            <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={checked.size === filtered.length}
                                    onChange={toggleAll}
                                    className="w-3.5 h-3.5 rounded border-slate-300"
                                />
                                Tout sélectionner
                            </label>
                        )}
                        {isFetching && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…
                            </span>
                        )}
                    </div>
                </div>
                {filtered.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-500">
                        Aucune fiche de renseignement pour ces filtres.
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {filtered.map((f) => (
                            <li key={f.id} className="flex items-center gap-2 pl-3 hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={checked.has(f.id)}
                                    onChange={() => toggleCheck(f.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-3.5 h-3.5 rounded border-slate-300 shrink-0"
                                />
                                <button
                                    type="button"
                                    onClick={() => openDetail(f)}
                                    className="flex-1 text-left py-3 pr-2"
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
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${statusUi[f.status].className}`}>
                                                    {statusUi[f.status].label}
                                                </span>
                                                <Badge variant={f.actionId ? "primary" : "default"}>
                                                    {f.actionId ? "Depuis appel" : "Saisie interne"}
                                                </Badge>
                                                <Badge variant={f.sentAt ? "success" : "warning"}>
                                                    {f.sentAt ? "Envoye client" : "A envoyer client"}
                                                </Badge>
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
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); exportSingle(f); }}
                                    className="mr-3 p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                    title="Exporter"
                                >
                                    <Download className="w-4 h-4" />
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
                                <div className="mt-2 flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-semibold ${statusUi[selected.status].className}`}>
                                        <Check className="w-3 h-3 mr-1" />
                                        {statusUi[selected.status].label}
                                    </span>
                                    {selected.signedBy && (
                                        <span className="text-xs text-emerald-700">
                                            Signe par {selected.signedBy}
                                            {selected.signedAt ? ` le ${new Date(selected.signedAt).toLocaleDateString("fr-FR")}` : ""}
                                        </span>
                                    )}
                                </div>
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
                                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-semibold text-slate-700 mb-2">Envoi pour signature</p>
                                    {(selected.contact?.email || selected.client?.email) && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {selected.contact?.email && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRecipientEmail(selected.contact!.email!)}
                                                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                                        recipientEmail === selected.contact.email
                                                            ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200"
                                                    }`}
                                                >
                                                    Contact: {selected.contact.email}
                                                </button>
                                            )}
                                            {selected.client?.email && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRecipientEmail(selected.client!.email!)}
                                                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                                        recipientEmail === selected.client.email
                                                            ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200"
                                                    }`}
                                                >
                                                    Client: {selected.client.email}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <input
                                            value={recipientEmail}
                                            onChange={(e) => setRecipientEmail(e.target.value)}
                                            placeholder="email@prospect.com"
                                            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSendForSignature}
                                            disabled={isSending}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                                        >
                                            <Mail className="w-4 h-4" />
                                            {isSending ? "Envoi..." : "Envoyer"}
                                        </button>
                                    </div>
                                    {selected.status === "SENT" && (
                                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex items-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                                            <p className="text-xs font-medium text-amber-700">En attente de signature</p>
                                            {selected.sentToEmail && (
                                                <span className="text-xs text-amber-600 ml-auto truncate">→ {selected.sentToEmail}</span>
                                            )}
                                        </div>
                                    )}
                                    {selected.sentAt && (
                                        <p className="text-xs text-slate-500 mt-1.5">
                                            Dernier envoi: {new Date(selected.sentAt).toLocaleString("fr-FR")}
                                        </p>
                                    )}
                                    {selected.status !== "SIGNED" && (
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => setShowInPersonSign(true)}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100"
                                            >
                                                <PenLine className="w-3.5 h-3.5" />
                                                Signer en présentiel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowQr(true)}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
                                            >
                                                <QrCode className="w-3.5 h-3.5" />
                                                QR Code
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="formulaire-edit" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Fiche de renseignement
                                    </label>
                                    {!editFiche && (
                                        <button
                                            onClick={handleCopy}
                                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            Copier
                                        </button>
                                    )}
                                </div>
                                {editFiche ? (
                                    <FicheHygieneAlimentaireForm value={editFiche} onChange={setEditFiche} />
                                ) : (
                                    <textarea
                                        id="formulaire-edit"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        rows={22}
                                        className="w-full px-3 py-2.5 text-xs font-mono border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 resize-y"
                                    />
                                )}
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
                                    onClick={() => exportSingle(selected)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                                >
                                    <Download className="w-4 h-4" />
                                    Exporter
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!isDirty}
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

            {/* In-person sign modal */}
            {showInPersonSign && selected && (
                <InPersonSignModal
                    formulaireId={selected.id}
                    title={selected.title}
                    content={selected.content}
                    onClose={() => setShowInPersonSign(false)}
                    onSigned={(name) => {
                        setShowInPersonSign(false);
                        queryClient.invalidateQueries({ queryKey: ["manager", "formulaires"] });
                        setSelected((prev) =>
                            prev ? { ...prev, status: "SIGNED", signedBy: name, signedAt: new Date().toISOString() } : prev
                        );
                    }}
                />
            )}

            {/* QR code modal */}
            {showQr && selected && (
                <QrCodeModal
                    formulaireId={selected.id}
                    title={selected.title}
                    onClose={() => setShowQr(false)}
                />
            )}
        </div>
    );
}
