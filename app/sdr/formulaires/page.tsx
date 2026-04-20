"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Mail, RefreshCw, Search, CheckCircle2, PenLine, QrCode } from "lucide-react";
import { useToast, Badge } from "@/components/ui";
import { InPersonSignModal } from "@/components/formulaires/InPersonSignModal";
import { QrCodeModal } from "@/components/formulaires/QrCodeModal";

interface FormulaireItem {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "SENT" | "SIGNED";
  actionId?: string | null;
  sentToEmail: string | null;
  sentAt: string | null;
  signedAt: string | null;
  signedBy: string | null;
  mission: { id: string; name: string } | null;
  client: { id: string; name: string; email?: string | null } | null;
  contact: { email: string | null; firstName: string | null; lastName: string | null } | null;
  createdAt: string;
}

async function fetchFormulaires(): Promise<FormulaireItem[]> {
  const res = await fetch("/api/formulaires?limit=300");
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Erreur chargement");
  return json.data ?? [];
}

export default function SDRFormulairesPage() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const [search, setSearch] = useState("");
  const [recipientById, setRecipientById] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<"ALL" | "CALLING" | "EMAIL_SENT">("ALL");
  const [inPersonRow, setInPersonRow] = useState<FormulaireItem | null>(null);
  const [qrRow, setQrRow] = useState<FormulaireItem | null>(null);

  const { data = [], isFetching, refetch } = useQuery({
    queryKey: ["sdr-formulaires"],
    queryFn: fetchFormulaires,
    staleTime: 10_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((f) =>
      [
        f.title,
        f.contact?.email,
        f.contact?.firstName,
        f.contact?.lastName,
        f.client?.name,
        f.mission?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [data, search]);

  const visible = useMemo(() => {
    if (viewFilter === "CALLING") return filtered.filter((f) => Boolean(f.actionId));
    if (viewFilter === "EMAIL_SENT") return filtered.filter((f) => Boolean(f.sentAt));
    return filtered;
  }, [filtered, viewFilter]);

  const metrics = useMemo(() => {
    const fromCalling = data.filter((f) => Boolean(f.actionId)).length;
    const sentByEmail = data.filter((f) => Boolean(f.sentAt)).length;
    return {
      total: data.length,
      fromCalling,
      sentByEmail,
    };
  }, [data]);

  const statusLabel = (status: FormulaireItem["status"]) => {
    if (status === "SIGNED") return "Signe";
    if (status === "SENT") return "Envoye";
    return "Brouillon";
  };

  const statusClass = (status: FormulaireItem["status"]) => {
    if (status === "SIGNED") return "bg-emerald-100 text-emerald-700";
    if (status === "SENT") return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
  };

  const sendMail = async (row: FormulaireItem) => {
    const recipient = (recipientById[row.id] ?? row.sentToEmail ?? row.contact?.email ?? "").trim();
    if (!recipient) {
      showError("Email requis", "Renseignez l'email du prospect.");
      return;
    }
    setSendingId(row.id);
    try {
      const res = await fetch(`/api/formulaires/${row.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: recipient }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Envoi impossible");
      success("Email envoye", "Le formulaire a ete envoye au prospect.");
      await queryClient.invalidateQueries({ queryKey: ["sdr-formulaires"] });
    } catch (e) {
      showError("Erreur", e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Mes formulaires
          </h1>
          <p className="text-sm text-slate-500">
            Envoyez vos formulaires par email et suivez la signature prospect en temps reel.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Rafraichir
        </button>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher mission, client, contact..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setViewFilter("ALL")}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                viewFilter === "ALL"
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              Tous ({metrics.total})
            </button>
            <button
              onClick={() => setViewFilter("CALLING")}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                viewFilter === "CALLING"
                  ? "bg-violet-50 border-violet-200 text-violet-700"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              Depuis appels ({metrics.fromCalling})
            </button>
            <button
              onClick={() => setViewFilter("EMAIL_SENT")}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                viewFilter === "EMAIL_SENT"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              Envoyes par email ({metrics.sentByEmail})
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Aucun formulaire.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Formulaire</th>
                  <th className="text-left px-3 py-2 font-semibold">Mission/Client</th>
                  <th className="text-left px-3 py-2 font-semibold">Statut</th>
                  <th className="text-left px-3 py-2 font-semibold">Envoi email</th>
                  <th className="text-left px-3 py-2 font-semibold">Signature</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{row.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant={row.actionId ? "primary" : "default"}>
                          {row.actionId ? "Depuis appel" : "Saisie interne"}
                        </Badge>
                        <Badge variant={row.sentAt ? "success" : "warning"}>
                          {row.sentAt ? "Envoye client" : "A envoyer client"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(row.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-slate-800 font-medium">{row.mission?.name || "Mission"}</p>
                      <p className="text-xs text-slate-500">{row.client?.name || "Client"}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-1 rounded ${statusClass(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {(row.contact?.email || row.client?.email) && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {row.contact?.email && (
                            <button
                              type="button"
                              onClick={() => setRecipientById((prev) => ({ ...prev, [row.id]: row.contact!.email! }))}
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                (recipientById[row.id] ?? row.sentToEmail ?? row.contact?.email) === row.contact.email
                                  ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-indigo-200"
                              }`}
                            >
                              Contact
                            </button>
                          )}
                          {row.client?.email && (
                            <button
                              type="button"
                              onClick={() => setRecipientById((prev) => ({ ...prev, [row.id]: row.client!.email! }))}
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                (recipientById[row.id] ?? row.sentToEmail ?? row.contact?.email) === row.client.email
                                  ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-emerald-200"
                              }`}
                            >
                              Client
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={recipientById[row.id] ?? row.sentToEmail ?? row.contact?.email ?? ""}
                          onChange={(e) =>
                            setRecipientById((prev) => ({ ...prev, [row.id]: e.target.value }))
                          }
                          placeholder="email@prospect.com"
                          className="px-2 py-1.5 text-xs border border-slate-200 rounded w-56"
                        />
                        <button
                          onClick={() => sendMail(row)}
                          disabled={sendingId === row.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 disabled:opacity-50"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {sendingId === row.id ? "Envoi..." : "Envoyer"}
                        </button>
                      </div>
                      {row.status === "SENT" && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          En attente de signature
                        </p>
                      )}
                      {row.sentAt && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Envoi: {new Date(row.sentAt).toLocaleString("fr-FR")}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.status === "SIGNED" ? (
                        <p className="text-xs text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Signe{row.signedBy ? ` par ${row.signedBy}` : ""}
                          {row.signedAt ? ` le ${new Date(row.signedAt).toLocaleDateString("fr-FR")}` : ""}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-500">En attente</p>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInPersonRow(row)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded hover:bg-violet-100"
                            >
                              <PenLine className="w-3 h-3" />
                              Présentiel
                            </button>
                            <button
                              type="button"
                              onClick={() => setQrRow(row)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"
                            >
                              <QrCode className="w-3 h-3" />
                              QR
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {inPersonRow && (
        <InPersonSignModal
          formulaireId={inPersonRow.id}
          title={inPersonRow.title}
          content={inPersonRow.content}
          onClose={() => setInPersonRow(null)}
          onSigned={() => {
            setInPersonRow(null);
            queryClient.invalidateQueries({ queryKey: ["sdr-formulaires"] });
          }}
        />
      )}
      {qrRow && (
        <QrCodeModal
          formulaireId={qrRow.id}
          title={qrRow.title}
          onClose={() => setQrRow(null)}
        />
      )}
    </div>
  );
}
