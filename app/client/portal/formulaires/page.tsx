"use client";

import { useMemo, useState } from "react";
import {
    ClipboardList,
    Search,
    Target,
    Building2,
    User,
    Calendar,
    Loader2,
    Save,
    Download,
    X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui";
import {
    isFicheHygieneAlimentaireContent,
    FicheHygieneAlimentaireData,
} from "@/lib/constants/ficheHygieneAlimentaire";
import FicheHygieneAlimentaireForm from "@/components/fiche/FicheHygieneAlimentaireForm";

interface FormulaireItem {
    id: string;
    missionId: string;
    clientId: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    mission: { id: string; name: string } | null;
    client: { id: string; name: string } | null;
    contact: { firstName: string | null; lastName: string | null; email: string | null } | null;
    createdBy: { name: string } | null;
}

async function fetchFormulaires(): Promise<FormulaireItem[]> {
    const res = await fetch("/api/formulaires?limit=300");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Impossible de charger les formulaires");
    return json.data ?? [];
}

function contactLabel(contact: FormulaireItem["contact"]): string {
    if (!contact) return "Contact inconnu";
    const n = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
    return n || contact.email || "Contact inconnu";
}

function csvEscape(input: string): string {
    return `"${input.replace(/"/g, '""')}"`;
}

export default function ClientFormulairesPage() {
    const { success, error: showError } = useToast();
    const [search, setSearch] = useState("");
    const [missionFilter, setMissionFilter] = useState("");
    const [selected, setSelected] = useState<FormulaireItem | null>(null);
    const [editContent, setEditContent] = useState("");
    const [editFiche, setEditFiche] = useState<FicheHygieneAlimentaireData | null>(null);
    const [saving, setSaving] = useState(false);

    const { data: formulaires = [], isFetching, refetch } = useQuery({
        queryKey: ["client", "formulaires"],
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
                    contactLabel(f.contact),
                    f.createdBy?.name,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return hay.includes(q);
            });
    }, [formulaires, missionFilter, search]);

    const openDetail = (item: FormulaireItem) => {
        setSelected(item);
        const fiche = isFicheHygieneAlimentaireContent(item.content);
        if (fiche) {
            setEditFiche(fiche);
            setEditContent("");
        } else {
            setEditFiche(null);
            setEditContent(item.content);
        }
    };

    const isDirty = selected
        ? editFiche
            ? JSON.stringify(editFiche) !== selected.content
            : editContent !== selected.content
        : false;

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

    const exportAll = () => {
        if (!filtered.length) {
            showError("Export", "Aucun formulaire à exporter avec les filtres actuels.");
            return;
        }
        const rows = [
            ["id", "date_creation", "date_modification", "mission", "client", "contact", "sdr", "titre", "contenu"],
            ...filtered.map((f) => [
                f.id,
                new Date(f.createdAt).toISOString(),
                new Date(f.updatedAt).toISOString(),
                f.mission?.name ?? "",
                f.client?.name ?? "",
                contactLabel(f.contact),
                f.createdBy?.name ?? "",
                f.title,
                f.content,
            ]),
        ];
        const csv = rows.map((r) => r.map((c) => csvEscape(String(c ?? ""))).join(";")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `formulaires-client-${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-full bg-gradient-to-br from-[#F8F9FC] via-[#F4F6F9] to-[#ECEEF4] p-4 md:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-[22px] font-bold text-[#12122A] tracking-tight">Formulaires</h1>
                    <p className="text-sm text-[#6B7194] mt-0.5">
                        Consultez, modifiez et exportez les fiches de renseignement.
                    </p>
                </div>
                <div className="flex items-center gap-2">
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
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#E8EBF0] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400"
                    />
                </div>
                <select
                    value={missionFilter}
                    onChange={(e) => setMissionFilter(e.target.value)}
                    className="w-full sm:w-72 px-3 py-2.5 text-sm bg-white border border-[#E8EBF0] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400"
                >
                    <option value="">Toutes les missions</option>
                    {missionOptions.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </div>

            <section className="premium-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E8EBF0] bg-white/80">
                    <p className="text-sm font-semibold text-[#3D3F6B]">{filtered.length} formulaire{filtered.length > 1 ? "s" : ""}</p>
                </div>
                {filtered.length === 0 ? (
                    <div className="py-14 text-center text-sm text-[#6B7194]">Aucun formulaire trouvé.</div>
                ) : (
                    <ul className="divide-y divide-[#EEF1F5]">
                        {filtered.map((f) => (
                            <li key={f.id}>
                                <button
                                    type="button"
                                    onClick={() => openDetail(f)}
                                    className="w-full text-left px-4 py-3 hover:bg-[#FAFBFF] transition-colors"
                                >
                                    <p className="text-sm font-semibold text-[#12122A] truncate">{f.title}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7194]">
                                        <span className="inline-flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {f.mission?.name ?? "Mission"}</span>
                                        <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {f.client?.name ?? "Client"}</span>
                                        <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> {contactLabel(f.contact)}</span>
                                        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(f.createdAt).toLocaleDateString("fr-FR")}</span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {selected && (
                <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSelected(null)} />
                    <div className="relative w-full max-w-2xl h-full bg-white shadow-xl flex flex-col">
                        <div className="px-5 py-4 border-b border-[#E8EBF0] flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-[#12122A]">{selected.title}</h2>
                                <p className="text-xs text-[#6B7194] mt-0.5">
                                    {selected.mission?.name} • {contactLabel(selected.contact)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="p-1.5 text-[#8B8DAF] hover:text-[#3D3F6B] hover:bg-[#F4F6F9] rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto">
                            {editFiche ? (
                                <FicheHygieneAlimentaireForm value={editFiche} onChange={setEditFiche} />
                            ) : (
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={26}
                                    className="w-full px-3 py-2.5 text-xs font-mono border border-[#E8EBF0] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400"
                                />
                            )}
                        </div>
                        <div className="px-5 py-3 border-t border-[#E8EBF0] bg-[#FAFBFF] flex justify-end">
                            <button
                                type="button"
                                onClick={saveFormulaire}
                                disabled={saving || !isDirty}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
