"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Check, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FicheField,
  FicheTemplateDTO,
  FicheValues,
  FicheValidationError,
} from "@/lib/fiche/types";

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic RDV briefing form rendered from a server-resolved template.
// Visual style mirrors the commercial portal (premium-card / emerald accent),
// matching `app/commercial/portal/meetings/page.tsx` and friends.
// ─────────────────────────────────────────────────────────────────────────────

export interface DynamicFicheFormProps {
  template: FicheTemplateDTO;
  initialValues?: FicheValues;
  saving?: boolean;
  onSubmit: (values: FicheValues) => Promise<void> | void;
  onCancel?: () => void;
  /** Server-side validation errors keyed by field key. */
  errors?: FicheValidationError[];
  /** Hide the wrapping card; for embedding in a modal that already has chrome. */
  bare?: boolean;
  submitLabel?: string;
}

function defaultValueFor(field: FicheField): unknown {
  if (field.type === "boolean") return false;
  if (field.type === "multiselect") return [];
  if (field.type === "number") return "";
  return "";
}

export function DynamicFicheForm({
  template,
  initialValues,
  saving,
  onSubmit,
  onCancel,
  errors,
  bare,
  submitLabel,
}: DynamicFicheFormProps) {
  const activeFields = useMemo(
    () => template.fields.filter((f) => f.active).sort((a, b) => a.order - b.order),
    [template.fields],
  );

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const out: Record<string, unknown> = {};
    for (const f of activeFields) {
      const v = initialValues?.[f.key];
      out[f.key] = v === undefined || v === null ? defaultValueFor(f) : v;
    }
    return out;
  });

  // If template/initialValues change (e.g. after fetch), reseed once.
  useEffect(() => {
    setValues((prev) => {
      const next: Record<string, unknown> = { ...prev };
      for (const f of activeFields) {
        if (next[f.key] === undefined) {
          const v = initialValues?.[f.key];
          next[f.key] = v === undefined || v === null ? defaultValueFor(f) : v;
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  const errorMap = useMemo(() => {
    const m = new Map<string, string>();
    (errors ?? []).forEach((e) => m.set(e.key, e.message));
    return m;
  }, [errors]);

  const setField = (key: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned: FicheValues = {};
    for (const f of activeFields) {
      const v = values[f.key];
      if (f.type === "number") {
        cleaned[f.key] = v === "" || v === null || v === undefined ? null : Number(v);
      } else if (f.type === "multiselect") {
        cleaned[f.key] = Array.isArray(v) ? (v as string[]) : [];
      } else if (f.type === "boolean") {
        cleaned[f.key] = Boolean(v);
      } else if (typeof v === "string") {
        cleaned[f.key] = v;
      } else {
        cleaned[f.key] = v as never;
      }
    }
    await onSubmit(cleaned);
  };

  const renderField = (field: FicheField) => {
    const id = `fiche-${field.key}`;
    const value = values[field.key];
    const fieldError = errorMap.get(field.key);

    const labelEl = (
      <label
        htmlFor={id}
        className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7194] mb-2"
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );

    const inputBase =
      "w-full text-sm text-[#12122A] bg-[#F8F9FC] border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all";
    const borderClass = fieldError ? "border-red-300" : "border-[#E8EBF0]";

    let input: React.ReactNode = null;
    switch (field.type) {
      case "text":
        input = (
          <input
            id={id}
            type="text"
            value={(value as string) ?? ""}
            placeholder={field.placeholder ?? `Saisir ${field.label.toLowerCase()}…`}
            onChange={(e) => setField(field.key, e.target.value)}
            className={cn(inputBase, borderClass)}
          />
        );
        break;
      case "textarea":
        input = (
          <textarea
            id={id}
            rows={4}
            value={(value as string) ?? ""}
            placeholder={field.placeholder ?? `Saisir ${field.label.toLowerCase()}…`}
            onChange={(e) => setField(field.key, e.target.value)}
            className={cn(inputBase, borderClass, "resize-y")}
          />
        );
        break;
      case "number":
        input = (
          <input
            id={id}
            type="number"
            value={(value as string | number) ?? ""}
            placeholder={field.placeholder ?? "0"}
            onChange={(e) => setField(field.key, e.target.value)}
            className={cn(inputBase, borderClass)}
          />
        );
        break;
      case "date":
        input = (
          <input
            id={id}
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => setField(field.key, e.target.value)}
            className={cn(inputBase, borderClass)}
          />
        );
        break;
      case "boolean":
        input = (
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-[#3D3F6B]">
            <input
              id={id}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => setField(field.key, e.target.checked)}
              className="w-4 h-4 accent-emerald-600"
            />
            Oui
          </label>
        );
        break;
      case "select":
        input = (
          <select
            id={id}
            value={(value as string) ?? ""}
            onChange={(e) => setField(field.key, e.target.value)}
            className={cn(inputBase, borderClass)}
          >
            <option value="">— Choisir —</option>
            {(field.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
        break;
      case "multiselect":
        input = (
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((o) => {
              const selected = Array.isArray(value) && (value as string[]).includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    const cur = Array.isArray(value) ? (value as string[]) : [];
                    setField(
                      field.key,
                      selected ? cur.filter((x) => x !== o) : [...cur, o],
                    );
                  }}
                  className={cn(
                    "text-[12px] font-semibold border px-3 py-1.5 rounded-lg transition-all",
                    selected
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 ring-2 ring-offset-1 ring-emerald-400"
                      : "text-[#6B7194] bg-white border-[#E8EBF0] hover:border-gray-300",
                  )}
                >
                  {o}
                </button>
              );
            })}
            {(!field.options || field.options.length === 0) && (
              <p className="text-[11px] text-[#A0A3BD]">Aucune option configurée.</p>
            )}
          </div>
        );
        break;
    }

    return (
      <div key={field.key} className="space-y-1">
        {labelEl}
        {input}
        {fieldError && (
          <p className="mt-1 text-[11px] text-red-600 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {fieldError}
          </p>
        )}
      </div>
    );
  };

  const inner = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {activeFields.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-8 h-8 text-[#A0A3BD] mx-auto mb-2" />
          <p className="text-sm text-[#6B7194]">Aucun champ actif dans le template.</p>
        </div>
      ) : (
        activeFields.map(renderField)
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {submitLabel ?? "Enregistrer la fiche"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="text-sm font-medium text-[#6B7194] hover:text-[#12122A] hover:bg-[#F4F5FA] px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
        )}
        <span className="text-[11px] text-[#A0A3BD] ml-auto">
          Modèle : <span className="font-medium text-[#6B7194]">{template.name}</span>{" "}
          <span className="text-[10px]">({template.scope})</span>
        </span>
      </div>
    </form>
  );

  if (bare) return inner;

  return (
    <div className="bg-white border border-[#E8EBF0] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-emerald-600" />
        <h3 className="text-[14px] font-bold text-[#12122A]">Fiche RDV</h3>
      </div>
      {inner}
    </div>
  );
}
