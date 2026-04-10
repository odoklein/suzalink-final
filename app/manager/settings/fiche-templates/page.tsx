"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  FileText,
  Sparkles,
  ShieldCheck,
  Building2,
  Target,
  Layers,
} from "lucide-react";
import type { FicheField, FicheFieldType } from "@/lib/fiche/types";

interface TemplateRow {
  id: string;
  name: string;
  clientId: string | null;
  missionId: string | null;
  clientName?: string | null;
  missionName?: string | null;
  fields: FicheField[];
  isActive: boolean;
  scope: "mission" | "client" | "default";
}

const FIELD_TYPES: FicheFieldType[] = [
  "text",
  "textarea",
  "select",
  "multiselect",
  "number",
  "date",
  "boolean",
];

function emptyField(order: number): FicheField {
  return {
    key: `champ_${order + 1}`,
    label: "Nouveau champ",
    type: "text",
    required: false,
    options: [],
    order,
    active: true,
    placeholder: "",
  };
}

function scopeBadge(scope: TemplateRow["scope"]) {
  if (scope === "mission") {
    return {
      label: "Mission",
      cls: "text-purple-700 bg-purple-50 border-purple-200",
      icon: Target,
    };
  }
  if (scope === "client") {
    return {
      label: "Client",
      cls: "text-blue-700 bg-blue-50 border-blue-200",
      icon: Building2,
    };
  }
  return {
    label: "Défaut",
    cls: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: ShieldCheck,
  };
}

export default function FicheTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );
  const totalFields = useMemo(
    () => templates.reduce((sum, t) => sum + (t.fields?.length ?? 0), 0),
    [templates],
  );
  const activeTemplates = useMemo(
    () => templates.filter((t) => t.isActive).length,
    [templates],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manager/fiche-templates");
      const json = await res.json();
      if (json?.success) {
        const list = (json.data?.templates ?? []) as TemplateRow[];
        setTemplates(list);
        if (!selectedId && list.length > 0) setSelectedId(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchSelected = (next: Partial<TemplateRow>) => {
    if (!selected) return;
    setTemplates((prev) =>
      prev.map((t) => (t.id === selected.id ? { ...t, ...next } : t)),
    );
  };

  const patchField = (idx: number, next: Partial<FicheField>) => {
    if (!selected) return;
    const fields = [...selected.fields];
    fields[idx] = { ...fields[idx], ...next };
    patchSelected({ fields });
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    if (!selected) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= selected.fields.length) return;
    const fields = [...selected.fields];
    const cur = fields[idx];
    fields[idx] = fields[nextIdx];
    fields[nextIdx] = cur;
    patchSelected({
      fields: fields.map((f, i) => ({ ...f, order: i })),
    });
  };

  const addField = () => {
    if (!selected) return;
    patchSelected({
      fields: [...selected.fields, emptyField(selected.fields.length)],
    });
  };

  const removeField = (idx: number) => {
    if (!selected) return;
    patchSelected({
      fields: selected.fields
        .filter((_, i) => i !== idx)
        .map((f, i) => ({ ...f, order: i })),
    });
  };

  const saveTemplate = async () => {
    if (!selected) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/manager/fiche-templates/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          clientId: selected.clientId,
          missionId: selected.missionId,
          isActive: selected.isActive,
          fields: selected.fields.map((f, i) => ({ ...f, order: i })),
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setMsg(json?.error ?? "Erreur de sauvegarde.");
        return;
      }
      setTemplates((prev) =>
        prev.map((t) => (t.id === selected.id ? json.data.template : t)),
      );
      setMsg("Template sauvegardé.");
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  const createTemplate = async () => {
    setCreating(true);
    setMsg(null);
    try {
      const res = await fetch("/api/manager/fiche-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nouveau template" }),
      });
      const json = await res.json();
      if (!json?.success) {
        setMsg(json?.error ?? "Erreur de création.");
        return;
      }
      const created = json.data.template as TemplateRow;
      setTemplates((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setMsg("Template créé.");
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setCreating(false);
    }
  };

  const deleteTemplate = async () => {
    if (!selected) return;
    if (!window.confirm("Supprimer ce template ?")) return;
    setDeleting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/manager/fiche-templates/${selected.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json?.success || json.data?.deleted === false) {
        setMsg(json?.error ?? "Impossible de supprimer ce template.");
        return;
      }
      const next = templates.filter((t) => t.id !== selected.id);
      setTemplates(next);
      setSelectedId(next[0]?.id ?? null);
      setMsg("Template supprimé.");
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/manager/settings"
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 inline-flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" />
            Templates Fiche RDV
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configurez les champs dynamiques (ordre, requis, actif, options).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">Templates</p>
          <p className="text-2xl font-bold text-slate-900">{templates.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">Actifs</p>
          <p className="text-2xl font-bold text-emerald-600">{activeTemplates}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">Champs totaux</p>
          <p className="text-2xl font-bold text-slate-900">{totalFields}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">Sélectionné</p>
          <p className="text-sm font-semibold text-slate-800 mt-1 truncate">
            {selected?.name ?? "—"}
          </p>
        </div>
      </div>

      {msg && (
        <div className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-sm">
          <button
            onClick={createTemplate}
            disabled={creating}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 shadow"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Nouveau template
          </button>
          <div className="max-h-[70vh] overflow-auto space-y-1">
            {loading ? (
              <div className="text-sm text-slate-500 py-6 text-center">Chargement…</div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center">Aucun template</div>
            ) : (
              templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left p-2.5 rounded-lg border text-sm transition-all ${
                    selectedId === t.id
                      ? "border-indigo-200 bg-indigo-50 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="font-semibold text-slate-800 truncate flex items-center gap-2">
                    {t.name}
                    {!t.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Inactif
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {t.fields?.length ?? 0} champs
                    </span>
                    <span>•</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${scopeBadge(t.scope).cls}`}>
                      {(() => {
                        const Icon = scopeBadge(t.scope).icon;
                        return <Icon className="w-3 h-3" />;
                      })()}
                      {scopeBadge(t.scope).label}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {t.missionName ?? t.clientName ?? "Template par défaut"}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {!selected ? (
            <div className="text-sm text-slate-500 py-12 text-center">Sélectionnez un template</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2">
                <div className="text-sm text-indigo-900 font-medium inline-flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Édition du template: <span className="font-bold">{selected.name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${scopeBadge(selected.scope).cls}`}>
                  {scopeBadge(selected.scope).label}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nom</label>
                  <input
                    value={selected.name}
                    onChange={(e) => patchSelected({ name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Client ID</label>
                    <input
                      value={selected.clientId ?? ""}
                      onChange={(e) => patchSelected({ clientId: e.target.value || null })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      placeholder="(optionnel)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Mission ID</label>
                    <input
                      value={selected.missionId ?? ""}
                      onChange={(e) => patchSelected({ missionId: e.target.value || null })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      placeholder="(optionnel)"
                    />
                  </div>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selected.isActive}
                  onChange={(e) => patchSelected({ isActive: e.target.checked })}
                />
                Template actif
              </label>

              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Champs</h2>
                <button
                  onClick={addField}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Plus className="w-3 h-3" /> Ajouter champ
                </button>
              </div>

              <div className="space-y-2 max-h-[55vh] overflow-auto pr-1">
                {selected.fields.map((f, idx) => (
                  <div key={`${selected.id}-${idx}`} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/40">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Champ #{idx + 1}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={f.key}
                        onChange={(e) => patchField(idx, { key: e.target.value })}
                        className="w-1/3 px-2 py-1.5 text-xs border border-slate-200 rounded"
                        placeholder="key"
                      />
                      <input
                        value={f.label}
                        onChange={(e) => patchField(idx, { label: e.target.value })}
                        className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded"
                        placeholder="Libellé"
                      />
                      <select
                        value={f.type}
                        onChange={(e) => patchField(idx, { type: e.target.value as FicheFieldType })}
                        className="px-2 py-1.5 text-xs border border-slate-200 rounded"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      value={f.placeholder ?? ""}
                      onChange={(e) => patchField(idx, { placeholder: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded"
                      placeholder="Placeholder (optionnel)"
                    />
                    {(f.type === "select" || f.type === "multiselect") && (
                      <input
                        value={(f.options ?? []).join(", ")}
                        onChange={(e) =>
                          patchField(idx, {
                            options: e.target.value
                              .split(",")
                              .map((v) => v.trim())
                              .filter(Boolean),
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded"
                        placeholder="Options séparées par virgule"
                      />
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3">
                        <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={f.required}
                            onChange={(e) => patchField(idx, { required: e.target.checked })}
                          />
                          Requis
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={f.active}
                            onChange={(e) => patchField(idx, { active: e.target.checked })}
                          />
                          Actif
                        </label>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveField(idx, -1)}
                          className="p-1 rounded border border-slate-200 hover:bg-slate-50"
                          title="Monter"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveField(idx, 1)}
                          className="p-1 rounded border border-slate-200 hover:bg-slate-50"
                          title="Descendre"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeField(idx)}
                          className="p-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-2 sticky bottom-0 bg-white border-t border-slate-100 -mx-4 px-4 py-3">
                <button
                  onClick={deleteTemplate}
                  disabled={deleting || selected.scope === "default"}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Supprimer
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 shadow"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

