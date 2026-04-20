"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ClipboardList,
    Search,
    Target,
    Building2,
    User,
    Calendar,
    Loader2,
    Save,
    X,
    Download,
    Mail,
    CheckCircle2,
    PenLine,
    QrCode,
} from "lucide-react";
import { useToast } from "@/components/ui";
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
    title: string;
    content: string;
    status: "DRAFT" | "SENT" | "SIGNED";
    sentToEmail: string | null;
    sentAt: string | null;
    signedAt: string | null;
    signedBy: string | null;
    createdAt: string;
    updatedAt: string;
    mission: { id: string; name: string } | null;
    client: { id: string; name: string; email?: string | null } | null;
    company: { id: string; name: string } | null;
    contact: { firstName: string | null; lastName: string | null; email: string | null } | null;
    createdBy: { name: string } | null;
}

async function fetchFormulaires(): Promise<FormulaireItem[]> {
    const res = await fetch("/api/formulaires?limit=200");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Impossible de charger les formulaires");
    return json.data ?? [];
}

function contactLabel(contact: FormulaireItem["contact"]) {
    if (!contact) return "Contact inconnu";
    const n = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
    return n || contact.email || "Contact inconnu";
}

const statusUi: Record<FormulaireItem["status"], { label: string; className: string }> = {
    DRAFT: { label: "Brouillon", className: "bg-slate-100 text-slate-700" },
    SENT: { label: "Envoyé", className: "bg-amber-100 text-amber-700" },
    SIGNED: { label: "Signé", className: "bg-emerald-100 text-emerald-700" },
};

export default function CommercialFormulairesPage() {
    const { success, error: showError } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [missionFilter, setMissionFilter] = useState("");
    const [selected, setSelected] = useState<FormulaireItem | null>(null);
    const [editContent, setEditContent] = useState("");
    const [editFiche, setEditFiche] = useState<FicheHygieneAlimentaireData | null>(null);
    const [saving, setSaving] = useState(false);
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [recipientEmail, setRecipientEmail] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [showInPersonSign, setShowInPersonSign] = useState(false);
    const [showQr, setShowQr] = useState(false);

    const { data: formulaires = [], isFetching, refetch } = useQuery({
        queryKey: ["commercial", "formulaires"],
        queryFn: fetchFormulaires,
        staleTime: 10_000,
    });

    const missionOptions = useMemo(() => {
        const map = new Map<string, string>();
        formulaires.forEach((f) => {
            if (f.mission?.id) map.set(f.mission.id, f.mission.name);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [formulaires]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return formulaires
            .filter((f) => !missionFilter || f.missionId === missionFilter)
            .filter((f) => {
                if (!q) return true;
                const hay = [
                    f.title,
                    f.content,
                    f.mission?.name,
                    f.client?.name,
                    contactLabel(f.contact),
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return hay.includes(q);
            });
    }, [formulaires, missionFilter, search]);

    const openDetail = (item: FormulaireItem) => {
        setSelected(item);
        setRecipientEmail(item.sentToEmail || item.contact?.email || "");
        const fiche = isFicheHygieneAlimentaireContent(item.content);
        if (fiche) {
            setEditFiche(fiche);
            setEditContent("");
        } else {
            setEditFiche(null);
            setEditContent(item.content);
        }
    };

    const closeDetail = () => {
        setSelected(null);
        setEditFiche(null);
        setEditContent("");
        setRecipientEmail("");
    };

    const isDirty = useMemo(() => {
        if (!selected) return false;
        if (editFiche) return JSON.stringify(editFiche) !== selected.content;
        return editContent !== selected.content;
    }, [selected, editFiche, editContent]);

    const saveFormulaire = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            const contentToSave = editFiche ? JSON.stringify(editFiche) : editContent;
            const res = await fetch(`/api/formulaires/${selected.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: contentToSave }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Échec de sauvegarde");
            setSelected(json.data);
            const fiche = isFicheHygieneAlimentaireContent(json.data.content);
            if (fiche) setEditFiche(fiche);
            else setEditContent(json.data.content);
            success("Formulaire mis à jour", "Les modifications ont été enregistrées.");
            await refetch();
        } catch (e) {
            showError("Erreur", e instanceof Error ? e.message : "Impossible de sauvegarder");
        } finally {
            setSaving(false);
        }
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
            success("Formulaire envoyé", "Le lien de signature a été envoyé par email.");
            await queryClient.invalidateQueries({ queryKey: ["commercial", "formulaires"] });
            setSelected((prev) => (prev ? { ...prev, ...json.data } : prev));
        } catch (e) {
            showError("Erreur", e instanceof Error ? e.message : "Envoi impossible");
        } finally {
            setIsSending(false);
        }
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

    const exportSelected = () => {
        const items = filtered.filter((f) => checked.has(f.id));
        exportItems(items, "formulaires-commercial-selection");
    };

    const exportAll = () => exportItems(filtered, "formulaires-commercial");

    const exportSingle = (item: FormulaireItem) =>
        exportItems([item], `formulaire-${item.id.slice(0, 8)}`);

    return (
        <div className="min-h-full bg-gradient-to-br from-[#F8F9FC] via-[#F4F6F9] to-[#ECEEF4] p-4 md:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-[22px] font-bold text-[#12122A] tracking-tight">Formulaires</h1>
                    <p className="text-sm text-[#6B7194] mt-0.5">Fiches de renseignement liées à vos missions client.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {checked.size > 0 && (
                        <button
                            type="button"
                            onClick={exportSelected}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                        >
                            <Download className="w-4 h-4" />
                            Exporter la sélection ({checked.size})
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={exportAll}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                        <Download className="w-4 h-4" />
                        Exporter tout
                    </button>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border border-[#E8EBF0] bg-white text-[#3D3F6B] hover:bg-[#F8F9FC]"
                    >
                        {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                        Rafraîchir
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A3BD]" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher mission, contact, contenu..."
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#E8EBF0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                    />
                </div>
                <select
                    value={missionFilter}
                    onChange={(e) => setMissionFilter(e.target.value)}
                    className="w-full sm:w-72 px-3 py-2.5 text-sm bg-white border border-[#E8EBF0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                >
                    <option value="">Toutes les missions</option>
                    {missionOptions.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </div>

            <section className="premium-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E8EBF0] bg-white/80 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#3D3F6B]">{filtered.length} formulaire{filtered.length > 1 ? "s" : ""}</p>
                    {filtered.length > 0 && (
                        <label className="inline-flex items-center gap-2 text-xs text-[#6B7194] cursor-pointer">
                            <input
                                type="checkbox"
                                checked={checked.size === filtered.length}
                                onChange={toggleAll}
                                className="w-3.5 h-3.5 rounded border-slate-300"
                            />
                            Tout sélectionner
                        </label>
                    )}
                </div>
                {filtered.length === 0 ? (
                    <div className="py-14 text-center text-sm text-[#6B7194]">Aucun formulaire trouvé.</div>
                ) : (
                    <ul className="divide-y divide-[#EEF1F5]">
                        {filtered.map((f) => (
                            <li key={f.id} className="flex items-center gap-2 pl-3 hover:bg-[#FAFBFF] transition-colors">
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
                                    className="flex-1 text-left py-3 pr-4"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[#12122A] truncate">{f.title}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7194]">
                                                <span className="inline-flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {f.mission?.name ?? "Mission"}</span>
                                                <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {f.client?.name ?? "Client"}</span>
                                                <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> {contactLabel(f.contact)}</span>
                                                <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(f.createdAt).toLocaleDateString("fr-FR")}</span>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusUi[f.status].className}`}>
                                            {statusUi[f.status].label}
                                        </span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); exportSingle(f); }}
                                    className="mr-3 p-1.5 text-[#8B8DAF] hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                    title="Exporter"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {selected && (
                <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={closeDetail} />
                    <div className="relative w-full max-w-3xl h-full bg-white shadow-xl flex flex-col">
                        <div className="px-5 py-4 border-b border-[#E8EBF0] flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-[#12122A]">{selected.title}</h2>
                                <p className="text-xs text-[#6B7194] mt-0.5">
                                    {selected.mission?.name} • {selected.client?.name} • {contactLabel(selected.contact)}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusUi[selected.status].className}`}>
                                        {statusUi[selected.status].label}
                                    </span>
                                    {selected.status === "SIGNED" && selected.signedBy && (
                                        <span className="text-xs text-emerald-700">
                                            Signé par {selected.signedBy}
                                            {selected.signedAt ? ` le ${new Date(selected.signedAt).toLocaleDateString("fr-FR")}` : ""}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeDetail}
                                className="p-1.5 text-[#8B8DAF] hover:text-[#3D3F6B] hover:bg-[#F4F6F9] rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto space-y-4">
                            {selected.status !== "SIGNED" && (
                                <div className="rounded-xl border border-[#E8EBF0] bg-[#FAFBFF] p-4">
                                    <p className="text-xs font-semibold text-[#3D3F6B] mb-2">Envoi pour signature</p>
                                    {(selected.contact?.email || selected.client?.email) && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {selected.contact?.email && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRecipientEmail(selected.contact!.email!)}
                                                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                                        recipientEmail === selected.contact.email
                                                            ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                                                            : "bg-white border-[#E8EBF0] text-[#6B7194] hover:border-indigo-200"
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
                                                            : "bg-white border-[#E8EBF0] text-[#6B7194] hover:border-emerald-200"
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
                                            className="flex-1 px-3 py-2 text-sm border border-[#E8EBF0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSendForSignature}
                                            disabled={isSending}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
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
                                        <p className="text-xs text-[#6B7194] mt-1.5">
                                            Dernier envoi: {new Date(selected.sentAt).toLocaleString("fr-FR")}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E8EBF0]">
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
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#3D3F6B] bg-[#F4F6F9] border border-[#E8EBF0] rounded-lg hover:bg-[#ECEEF4]"
                                        >
                                            <QrCode className="w-3.5 h-3.5" />
                                            QR Code
                                        </button>
                                    </div>
                                </div>
                            )}
                            {selected.status === "SIGNED" && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <p className="text-sm font-medium text-emerald-700">
                                        Signé{selected.signedBy ? ` par ${selected.signedBy}` : ""}
                                        {selected.signedAt ? ` le ${new Date(selected.signedAt).toLocaleDateString("fr-FR")}` : ""}
                                    </p>
                                </div>
                            )}
                            {editFiche ? (
                                <FicheHygieneAlimentaireForm value={editFiche} onChange={setEditFiche} />
                            ) : (
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={22}
                                    className="w-full px-3 py-2.5 text-xs font-mono border border-[#E8EBF0] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                                />
                            )}
                        </div>
                        <div className="px-5 py-3 border-t border-[#E8EBF0] bg-[#FAFBFF] flex justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => exportSingle(selected)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            >
                                <Download className="w-4 h-4" />
                                Exporter
                            </button>
                            <button
                                type="button"
                                onClick={saveFormulaire}
                                disabled={saving || !isDirty}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showInPersonSign && selected && (
                <InPersonSignModal
                    formulaireId={selected.id}
                    title={selected.title}
                    content={selected.content}
                    onClose={() => setShowInPersonSign(false)}
                    onSigned={(name) => {
                        setShowInPersonSign(false);
                        queryClient.invalidateQueries({ queryKey: ["commercial", "formulaires"] });
                        setSelected((prev) =>
                            prev ? { ...prev, status: "SIGNED", signedBy: name, signedAt: new Date().toISOString() } : prev
                        );
                    }}
                />
            )}

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
