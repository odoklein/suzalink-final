"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  PenLine,
  RotateCcw,
  X,
  FileText,
} from "lucide-react";
import { SignatureCanvas, SignatureCanvasRef } from "./SignatureCanvas";
import { isFicheHygieneAlimentaireContent } from "@/lib/constants/ficheHygieneAlimentaire";
import FicheHygieneAlimentaireForm from "@/components/fiche/FicheHygieneAlimentaireForm";

interface Props {
  formulaireId: string;
  title: string;
  content: string;
  onClose: () => void;
  onSigned: (signerName: string) => void;
}

export function InPersonSignModal({
  formulaireId,
  title,
  content,
  onClose,
  onSigned,
}: Props) {
  const sigCanvasRef = useRef<SignatureCanvasRef>(null);
  const [signerName, setSignerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"review" | "sign">("review");

  const fiche = isFicheHygieneAlimentaireContent(content);

  const handleSign = async () => {
    if (!signerName.trim()) {
      setError("Veuillez saisir votre nom et prénom.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const signatureData = sigCanvasRef.current?.isEmpty()
        ? undefined
        : sigCanvasRef.current?.toDataURL();

      const res = await fetch(`/api/formulaires/${formulaireId}/sign-direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signerName.trim(), signatureData }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Signature impossible");
      setDone(true);
      onSigned(signerName.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 truncate max-w-[260px] sm:max-w-md">
              {title}
            </p>
            <p className="text-xs text-slate-500">Signature en présentiel</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {done ? (
        /* ── Success screen ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Formulaire signé</h2>
          <p className="text-sm text-slate-600 text-center">
            Merci {signerName}. Votre signature a bien été enregistrée.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl"
          >
            Fermer
          </button>
        </div>
      ) : step === "review" ? (
        /* ── Step 1: Review content ── */
        <>
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">
              Veuillez lire attentivement le formulaire avant de signer.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              {fiche ? (
                <FicheHygieneAlimentaireForm
                  value={fiche}
                  onChange={() => {}}
                  readOnly
                />
              ) : (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {content}
                </pre>
              )}
            </div>
          </div>
          <div className="shrink-0 px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              type="button"
              onClick={() => setStep("sign")}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl"
            >
              <PenLine className="w-4 h-4" />
              Procéder à la signature
            </button>
          </div>
        </>
      ) : (
        /* ── Step 2: Sign ── */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nom et prénom du signataire
              </label>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Signature
                  <span className="ml-1 text-xs font-normal text-slate-500">(facultatif)</span>
                </label>
                <button
                  type="button"
                  onClick={() => sigCanvasRef.current?.clear()}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Effacer
                </button>
              </div>
              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  className="w-full h-40 sm:h-52"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Dessinez votre signature avec votre doigt ou un stylet.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="shrink-0 px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep("review")}
              className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
            >
              ← Relire
            </button>
            <button
              type="button"
              onClick={handleSign}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PenLine className="w-4 h-4" />
              )}
              {submitting ? "Signature…" : "Signer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
