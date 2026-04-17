"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PenLine, CheckCircle2 } from "lucide-react";

interface PublicFormulaire {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "SENT" | "SIGNED";
  signedAt: string | null;
  signedBy: string | null;
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-formulaire-sign", token],
    queryFn: () => fetchFormulaire(token),
    enabled: !!token,
    retry: false,
  });

  const onSign = async () => {
    if (!signerName.trim()) {
      setError("Veuillez saisir votre nom.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/formulaires/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signerName.trim() }),
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        Chargement du formulaire...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-bold text-red-700">Lien de signature invalide</h1>
          <p className="text-sm text-red-600 mt-2">
            Ce lien est introuvable ou a ete retire.
          </p>
        </div>
      </div>
    );
  }

  const alreadySigned = data.status === "SIGNED" || done;

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h1 className="text-2xl font-bold text-slate-900">{data.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Merci de verifier les informations puis signer ce formulaire.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{data.content}</pre>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {alreadySigned ? (
            <div className="text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">
                Formulaire signe
                {data.signedBy ? ` par ${data.signedBy}` : ""}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Votre nom et prenom
              </label>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400"
                placeholder="Ex: Jean Dupont"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={onSign}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                Signer le formulaire
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
