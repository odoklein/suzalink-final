"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Clock3, Search, PhoneCall, ClipboardList } from "lucide-react";

type FormStatus = "DRAFT" | "SENT" | "SIGNED";

interface ProspectRow {
  id: string;
  mission: { id: string; name: string };
  client: { id: string; name: string };
  list: { id: string; name: string };
  company: { id: string; name: string; industry: string | null };
  contact: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    title: string | null;
  };
  call: {
    called: boolean;
    actionId: string | null;
    result: string | null;
    calledAt: string | null;
    callbackDate: string | null;
  };
  formulaire: {
    id: string;
    title: string;
    status: FormStatus;
    sentToEmail: string | null;
    sentAt: string | null;
    signedAt: string | null;
  } | null;
}

interface Payload {
  missions: { id: string; name: string; client: { id: string; name: string } }[];
  rows: ProspectRow[];
}

async function fetchProspects(missionId?: string): Promise<Payload> {
  const qs = new URLSearchParams();
  if (missionId) qs.set("missionId", missionId);
  const res = await fetch(`/api/sdr/prospects?${qs.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Erreur de chargement");
  return json.data;
}

export default function SDRProspectsPage() {
  const [missionFilter, setMissionFilter] = useState("");
  const [query, setQuery] = useState("");
  const [callFilter, setCallFilter] = useState<"all" | "called" | "not_called">("all");
  const [formFilter, setFormFilter] = useState<"all" | FormStatus | "NONE">("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sdr-prospects", missionFilter],
    queryFn: () => fetchProspects(missionFilter || undefined),
    staleTime: 15_000,
  });

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    const q = query.trim().toLowerCase();
    return all
      .filter((r) =>
        callFilter === "all" ? true : callFilter === "called" ? r.call.called : !r.call.called
      )
      .filter((r) => {
        if (formFilter === "all") return true;
        if (formFilter === "NONE") return !r.formulaire;
        return r.formulaire?.status === formFilter;
      })
      .filter((r) => {
        if (!q) return true;
        const haystack = [
          r.contact.fullName,
          r.contact.email,
          r.contact.phone,
          r.company.name,
          r.company.industry,
          r.mission.name,
          r.client.name,
          r.list.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
  }, [data?.rows, query, callFilter, formFilter]);

  const stats = useMemo(() => {
    const src = data?.rows ?? [];
    return {
      total: src.length,
      called: src.filter((r) => r.call.called).length,
      notCalled: src.filter((r) => !r.call.called).length,
      signed: src.filter((r) => r.formulaire?.status === "SIGNED").length,
    };
  }, [data?.rows]);

  const statusPill = (status: FormStatus | null | undefined) => {
    if (!status) return <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">Aucun</span>;
    if (status === "SIGNED") return <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">Signe</span>;
    if (status === "SENT") return <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">Envoye</span>;
    return <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">Brouillon</span>;
  };

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prospects mission</h1>
          <p className="text-sm text-slate-500">
            Vue avancee: tous les contacts de vos missions (appeles + non appeles) avec statut formulaire.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          Rafraichir
        </button>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total lignes</p>
          <p className="text-xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Deja appeles</p>
          <p className="text-xl font-bold text-indigo-700">{stats.called}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">A appeler</p>
          <p className="text-xl font-bold text-amber-700">{stats.notCalled}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Formulaires signes</p>
          <p className="text-xl font-bold text-emerald-700">{stats.signed}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Mission</label>
          <select
            value={missionFilter}
            onChange={(e) => setMissionFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
          >
            <option value="">Toutes les missions</option>
            {(data?.missions ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Appels</label>
          <select
            value={callFilter}
            onChange={(e) => setCallFilter(e.target.value as typeof callFilter)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
          >
            <option value="all">Tous</option>
            <option value="called">Appeles</option>
            <option value="not_called">Non appeles</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Formulaire</label>
          <select
            value={formFilter}
            onChange={(e) => setFormFilter(e.target.value as typeof formFilter)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
          >
            <option value="all">Tous</option>
            <option value="SIGNED">Signe</option>
            <option value="SENT">Envoye</option>
            <option value="DRAFT">Brouillon</option>
            <option value="NONE">Aucun formulaire</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Recherche</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Contact, societe, mission..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">Chargement...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Aucune ligne pour ces filtres.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Prospect</th>
                  <th className="text-left px-3 py-2 font-semibold">Societe</th>
                  <th className="text-left px-3 py-2 font-semibold">Mission</th>
                  <th className="text-left px-3 py-2 font-semibold">Appel</th>
                  <th className="text-left px-3 py-2 font-semibold">Formulaire</th>
                  <th className="text-left px-3 py-2 font-semibold">Envoi/Signature</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{row.contact.fullName}</p>
                      <p className="text-xs text-slate-500">{row.contact.title || "Fonction non renseignee"}</p>
                      {row.contact.email && <p className="text-xs text-indigo-600">{row.contact.email}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-800 inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {row.company.name}
                      </p>
                      <p className="text-xs text-slate-500">{row.company.industry || "Secteur non renseigne"}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-800">{row.mission.name}</p>
                      <p className="text-xs text-slate-500">{row.client.name} - {row.list.name}</p>
                    </td>
                    <td className="px-3 py-2">
                      {row.call.called ? (
                        <div className="text-xs text-emerald-700">
                          <p className="font-semibold inline-flex items-center gap-1">
                            <PhoneCall className="w-3.5 h-3.5" />
                            Deja appele
                          </p>
                          <p>{row.call.result || "Resultat non renseigne"}</p>
                        </div>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">
                          Non appele
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                        {statusPill(row.formulaire?.status)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {row.formulaire ? (
                        <div className="space-y-0.5">
                          {row.formulaire.sentAt && (
                            <p className="inline-flex items-center gap-1">
                              <Clock3 className="w-3.5 h-3.5" />
                              Envoye le {new Date(row.formulaire.sentAt).toLocaleDateString("fr-FR")}
                            </p>
                          )}
                          {row.formulaire.signedAt && (
                            <p className="inline-flex items-center gap-1 text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Signe le {new Date(row.formulaire.signedAt).toLocaleDateString("fr-FR")}
                            </p>
                          )}
                          {!row.formulaire.sentAt && !row.formulaire.signedAt && <p>-</p>}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
