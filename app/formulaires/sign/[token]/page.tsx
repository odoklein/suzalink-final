"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  PenLine,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { SignatureCanvas, SignatureCanvasRef } from "@/components/formulaires/SignatureCanvas";
import {
  isFicheHygieneAlimentaireContent,
} from "@/lib/constants/ficheHygieneAlimentaire";
import FicheHygieneAlimentaireForm from "@/components/fiche/FicheHygieneAlimentaireForm";

interface PublicFormulaire {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "SENT" | "SIGNED";
  signedAt: string | null;
  signedBy: string | null;
  mission: { name: string } | null;
  client: { name: string } | null;
}

async function fetchFormulaire(token: string): Promise<PublicFormulaire> {
  const res = await fetch(`/api/formulaires/sign/${token}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Lien invalide");
  return json.data;
}

export default function PublicFormulaireSignPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [signerName, setSignerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"review" | "sign">("review");
  const sigCanvasRef = useRef<SignatureCanvasRef>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-formulaire-sign", token],
    queryFn: () => fetchFormulaire(token),
    enabled: !!token,
    retry: false,
  });

  const onSign = async () => {
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

      const res = await fetch(`/api/formulaires/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signerName.trim(), signatureData }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Signature impossible");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-sm">Chargement du formulaire…</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (isError || !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-base font-bold text-red-700">Lien invalide</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ce lien de signature est introuvable ou a expiré.
          </p>
        </div>
      </div>
    );
  }

  const alreadySigned = data.status === "SIGNED" || done;
  const fiche = isFicheHygieneAlimentaireContent(data.content);

  /* ── Already signed ── */
  if (alreadySigned) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Formulaire signé</h1>
          <p className="text-sm text-slate-600 mt-2">
            {done
              ? `Merci ${signerName}. Votre signature a bien été enregistrée.`
              : data.signedBy
              ? `Ce formulaire a déjà été signé par ${data.signedBy}.`
              : "Ce formulaire a déjà été signé."}
          </p>
          {data.signedAt && !done && (
            <p className="text-xs text-slate-400 mt-1">
              {new Date(data.signedAt).toLocaleString("fr-FR")}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── Step 1: Review ── */
  if (step === "review") {
    return (
      <main className="min-h-dvh bg-slate-50 flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm px-4 py-3">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">
            {data.client?.name ?? data.mission?.name ?? "Formulaire"}
          </p>
          <h1 className="text-base font-bold text-slate-900 leading-tight">{data.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lisez attentivement le formulaire, puis faites défiler vers le bas pour signer.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {fiche ? (
              <FicheHygieneAlimentaireForm
                value={fiche}
                onChange={() => {}}
                readOnly
              />
            ) : (
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {data.content}
              </pre>
            )}
          </div>
        </div>

        {/* Sticky bottom CTA */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,.06)]">
          <button
            type="button"
            onClick={() => setStep("sign")}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[.98] rounded-2xl transition"
          >
            <PenLine className="w-5 h-5" />
            Signer le formulaire
          </button>
        </div>
      </main>
    );
  }

  /* ── Step 2: Sign ── */
  return (
    <main className="min-h-dvh bg-slate-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm px-4 py-3">
        <h1 className="text-base font-bold text-slate-900">{data.title}</h1>
        <button
          type="button"
          onClick={() => setStep("review")}
          className="text-xs text-indigo-600 hover:underline mt-0.5"
        >
          ← Relire le formulaire
        </button>
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Nom et prénom
          </label>
          <input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Ex: Jean Dupont"
            className="w-full px-4 py-3 text-base border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400"
          />
        </div>

        {/* Canvas */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Votre signature
              <span className="ml-1 text-xs font-normal text-slate-400">(facultatif)</span>
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
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden shadow-inner">
            <SignatureCanvas ref={sigCanvasRef} className="w-full h-44" />
          </div>
          <p className="text-xs text-slate-400 mt-1.5 text-center">
            Dessinez avec votre doigt ou un stylet
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Legal note */}
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            En signant ce formulaire, vous certifiez que les informations fournies sont exactes
            et acceptez les conditions qui y sont décrites.
          </p>
        </div>
      </div>

      {/* Sticky bottom submit */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,.06)]">
        <button
          type="button"
          onClick={onSign}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[.98] rounded-2xl transition disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <PenLine className="w-5 h-5" />
          )}
          {submitting ? "Signature en cours…" : "Confirmer la signature"}
        </button>
      </div>
    </main>
  );
}
