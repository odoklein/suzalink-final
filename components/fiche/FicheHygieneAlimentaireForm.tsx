"use client";

import { Plus, Trash2 } from "lucide-react";
import {
    FicheHygieneAlimentaireData,
    MAX_APPRENANTS,
    emptyApprenant,
} from "@/lib/constants/ficheHygieneAlimentaire";

interface Props {
    value: FicheHygieneAlimentaireData;
    onChange: (next: FicheHygieneAlimentaireData) => void;
    readOnly?: boolean;
    compact?: boolean;
}

function inputCls(readOnly?: boolean) {
    return `w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 ${
        readOnly ? "bg-slate-50 text-slate-600 cursor-default" : ""
    }`;
}

function sectionTitleCls() {
    return "text-[11px] font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1.5";
}

export default function FicheHygieneAlimentaireForm({
    value,
    onChange,
    readOnly,
}: Props) {
    const update = <K extends keyof FicheHygieneAlimentaireData>(
        key: K,
        v: FicheHygieneAlimentaireData[K]
    ) => onChange({ ...value, [key]: v });

    const updateRestaurateur = <K extends keyof FicheHygieneAlimentaireData["restaurateur"]>(
        key: K,
        v: FicheHygieneAlimentaireData["restaurateur"][K]
    ) => onChange({ ...value, restaurateur: { ...value.restaurateur, [key]: v } });

    const updateEtablissement = <K extends keyof FicheHygieneAlimentaireData["etablissement"]>(
        key: K,
        v: FicheHygieneAlimentaireData["etablissement"][K]
    ) => onChange({ ...value, etablissement: { ...value.etablissement, [key]: v } });

    const updateObjectif = <K extends keyof FicheHygieneAlimentaireData["objectif"]>(
        key: K,
        v: FicheHygieneAlimentaireData["objectif"][K]
    ) => onChange({ ...value, objectif: { ...value.objectif, [key]: v } });

    const updateSession = <K extends keyof FicheHygieneAlimentaireData["session"]>(
        key: K,
        v: FicheHygieneAlimentaireData["session"][K]
    ) => onChange({ ...value, session: { ...value.session, [key]: v } });

    const updateOpco = <K extends keyof FicheHygieneAlimentaireData["opco"]>(
        key: K,
        v: FicheHygieneAlimentaireData["opco"][K]
    ) => onChange({ ...value, opco: { ...value.opco, [key]: v } });

    const updateSignature = <K extends keyof FicheHygieneAlimentaireData["signature"]>(
        key: K,
        v: FicheHygieneAlimentaireData["signature"][K]
    ) => onChange({ ...value, signature: { ...value.signature, [key]: v } });

    const updateApprenant = (idx: number, field: keyof ReturnType<typeof emptyApprenant>, v: string) => {
        const next = value.apprenants.map((a, i) => (i === idx ? { ...a, [field]: v } : a));
        onChange({ ...value, apprenants: next });
    };

    const addApprenant = () => {
        if (value.apprenants.length >= MAX_APPRENANTS) return;
        onChange({ ...value, apprenants: [...value.apprenants, emptyApprenant()] });
    };

    const removeApprenant = (idx: number) => {
        if (value.apprenants.length <= 1) return;
        onChange({ ...value, apprenants: value.apprenants.filter((_, i) => i !== idx) });
    };

    const label = (txt: string) => (
        <label className="block text-[11px] font-semibold text-slate-600 mb-1">{txt}</label>
    );

    return (
        <div className="space-y-5 text-xs text-slate-800">
            {/* Header */}
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                <p className="text-sm font-bold text-violet-900">
                    🗂️ FICHE DE RENSEIGNEMENT — Demande de Formation Hygiène Alimentaire (OPCO)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        {label("Nom / prénom du collaborateur CNF")}
                        <input
                            readOnly={readOnly}
                            value={value.collaborateurCnf}
                            onChange={(e) => update("collaborateurCnf", e.target.value)}
                            className={inputCls(readOnly)}
                        />
                    </div>
                    <div>
                        {label("Date")}
                        <input
                            readOnly={readOnly}
                            type="date"
                            value={value.date}
                            onChange={(e) => update("date", e.target.value)}
                            className={inputCls(readOnly)}
                        />
                    </div>
                </div>
            </div>

            {/* Restaurateur */}
            <div className="space-y-2">
                <p className={sectionTitleCls()}>📍 Informations sur le restaurateur</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        {label("Nom et prénom")}
                        <input readOnly={readOnly} value={value.restaurateur.nomPrenom} onChange={(e) => updateRestaurateur("nomPrenom", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Date de naissance")}
                        <input readOnly={readOnly} type="date" value={value.restaurateur.dateNaissance} onChange={(e) => updateRestaurateur("dateNaissance", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div className="sm:col-span-2">
                        {label("Adresse personnelle")}
                        <input readOnly={readOnly} value={value.restaurateur.adressePersonnelle} onChange={(e) => updateRestaurateur("adressePersonnelle", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Téléphone")}
                        <input readOnly={readOnly} value={value.restaurateur.telephone} onChange={(e) => updateRestaurateur("telephone", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("E-mail")}
                        <input readOnly={readOnly} type="email" value={value.restaurateur.email} onChange={(e) => updateRestaurateur("email", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                </div>
            </div>

            {/* Établissement */}
            <div className="space-y-2">
                <p className={sectionTitleCls()}>📍 Informations sur l&apos;établissement</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2">
                        {label("Nom du restaurant / établissement")}
                        <input readOnly={readOnly} value={value.etablissement.nom} onChange={(e) => updateEtablissement("nom", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div className="sm:col-span-2">
                        {label("Adresse complète")}
                        <input readOnly={readOnly} value={value.etablissement.adresseComplete} onChange={(e) => updateEtablissement("adresseComplete", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("SIRET")}
                        <input readOnly={readOnly} value={value.etablissement.siret} onChange={(e) => updateEtablissement("siret", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Code APE")}
                        <input readOnly={readOnly} value={value.etablissement.codeApe} onChange={(e) => updateEtablissement("codeApe", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div className="sm:col-span-2">
                        {label("Type d'activité (restaurant traditionnel, restauration rapide, food-truck, traiteur…)")}
                        <input readOnly={readOnly} value={value.etablissement.typeActivite} onChange={(e) => updateEtablissement("typeActivite", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div className="sm:col-span-2">
                        {label("Nom du dirigeant (si différent du bénéficiaire)")}
                        <input readOnly={readOnly} value={value.etablissement.nomDirigeant} onChange={(e) => updateEtablissement("nomDirigeant", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("E-mail de contact administratif")}
                        <input readOnly={readOnly} type="email" value={value.etablissement.emailContactAdmin} onChange={(e) => updateEtablissement("emailContactAdmin", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Téléphone de contact administratif")}
                        <input readOnly={readOnly} value={value.etablissement.telephoneContactAdmin} onChange={(e) => updateEtablissement("telephoneContactAdmin", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                </div>
            </div>

            {/* Apprenants */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className={sectionTitleCls()}>👥 Apprenant(s) — Maximum {MAX_APPRENANTS}</p>
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={addApprenant}
                            disabled={value.apprenants.length >= MAX_APPRENANTS}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:text-violet-900 disabled:opacity-40"
                        >
                            <Plus className="w-3.5 h-3.5" /> Ajouter un apprenant
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-[11px]">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-2 py-1.5 text-left font-semibold">NOM d&apos;usage</th>
                                <th className="px-2 py-1.5 text-left font-semibold">Prénom</th>
                                <th className="px-2 py-1.5 text-left font-semibold">Date naissance</th>
                                <th className="px-2 py-1.5 text-left font-semibold">N° Sécu. soc.</th>
                                <th className="px-2 py-1.5 text-left font-semibold">Email</th>
                                <th className="px-2 py-1.5 text-left font-semibold">Téléphone</th>
                                <th className="px-2 py-1.5 text-left font-semibold">Ancienneté</th>
                                <th className="px-2 py-1.5 text-left font-semibold">Contrat</th>
                                {!readOnly && <th className="w-8" />}
                            </tr>
                        </thead>
                        <tbody>
                            {value.apprenants.map((a, idx) => (
                                <tr key={idx} className="border-t border-slate-100">
                                    <td className="p-1"><input readOnly={readOnly} value={a.nomUsage} onChange={(e) => updateApprenant(idx, "nomUsage", e.target.value)} className={inputCls(readOnly)} /></td>
                                    <td className="p-1"><input readOnly={readOnly} value={a.prenom} onChange={(e) => updateApprenant(idx, "prenom", e.target.value)} className={inputCls(readOnly)} /></td>
                                    <td className="p-1"><input readOnly={readOnly} type="date" value={a.dateNaissance} onChange={(e) => updateApprenant(idx, "dateNaissance", e.target.value)} className={inputCls(readOnly)} /></td>
                                    <td className="p-1"><input readOnly={readOnly} value={a.numeroSecuriteSociale} onChange={(e) => updateApprenant(idx, "numeroSecuriteSociale", e.target.value)} className={inputCls(readOnly)} /></td>
                                    <td className="p-1"><input readOnly={readOnly} type="email" value={a.email} onChange={(e) => updateApprenant(idx, "email", e.target.value)} className={inputCls(readOnly)} /></td>
                                    <td className="p-1"><input readOnly={readOnly} value={a.telephone} onChange={(e) => updateApprenant(idx, "telephone", e.target.value)} className={inputCls(readOnly)} /></td>
                                    <td className="p-1"><input readOnly={readOnly} value={a.ancienneteEntreprise} onChange={(e) => updateApprenant(idx, "ancienneteEntreprise", e.target.value)} className={inputCls(readOnly)} /></td>
                                    <td className="p-1">
                                        {readOnly ? (
                                            <input readOnly value={a.typeContrat} className={inputCls(true)} />
                                        ) : (
                                            <select
                                                value={a.typeContrat}
                                                onChange={(e) => updateApprenant(idx, "typeContrat", e.target.value)}
                                                className={inputCls(false)}
                                            >
                                                <option value="">—</option>
                                                <option value="CDI temps plein">CDI temps plein</option>
                                                <option value="CDI temps partiel">CDI temps partiel</option>
                                                <option value="CDD temps plein">CDD temps plein</option>
                                                <option value="CDD temps partiel">CDD temps partiel</option>
                                            </select>
                                        )}
                                    </td>
                                    {!readOnly && (
                                        <td className="p-1 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeApprenant(idx)}
                                                disabled={value.apprenants.length <= 1}
                                                className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                                                aria-label="Supprimer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Objectif */}
            <div className="space-y-2">
                <p className={sectionTitleCls()}>🎯 Objectif de la formation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        {label("Intitulé souhaité")}
                        <input readOnly={readOnly} value={value.objectif.intitule} onChange={(e) => updateObjectif("intitule", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Public visé")}
                        <input readOnly={readOnly} value={value.objectif.publicVise} onChange={(e) => updateObjectif("publicVise", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div className="sm:col-span-2">
                        {label("Objectif")}
                        <textarea readOnly={readOnly} rows={2} value={value.objectif.objectif} onChange={(e) => updateObjectif("objectif", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                </div>
            </div>

            {/* Session */}
            <div className="space-y-2">
                <p className={sectionTitleCls()}>📅 Informations sur la session de formation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2">
                        {label("Organisme de formation")}
                        <input readOnly={readOnly} value={value.session.organisme} onChange={(e) => updateSession("organisme", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Durée (ex : 14 heures – 2 jours)")}
                        <input readOnly={readOnly} value={value.session.duree} onChange={(e) => updateSession("duree", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Dates souhaitées")}
                        <input readOnly={readOnly} value={value.session.datesSouhaitees} onChange={(e) => updateSession("datesSouhaitees", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Lieu de la formation")}
                        <input readOnly={readOnly} value={value.session.lieu} onChange={(e) => updateSession("lieu", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Coût pédagogique")}
                        <input readOnly={readOnly} value={value.session.coutPedagogique} onChange={(e) => updateSession("coutPedagogique", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                </div>
            </div>

            {/* OPCO */}
            <div className="space-y-2">
                <p className={sectionTitleCls()}>💶 Prise en charge OPCO</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2">
                        {label("OPCO de rattachement (Nom et Adresse) — AKTO, OPCO EP, etc.")}
                        <input readOnly={readOnly} value={value.opco.rattachement} onChange={(e) => updateOpco("rattachement", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Numéro IDCC / Convention collective")}
                        <input readOnly={readOnly} value={value.opco.numeroIdcc} onChange={(e) => updateOpco("numeroIdcc", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Type de financement demandé")}
                        <input readOnly={readOnly} value={value.opco.typeFinancement} onChange={(e) => updateOpco("typeFinancement", e.target.value)} className={inputCls(readOnly)} placeholder="Prise en charge totale / partielle (subrogation)" />
                    </div>
                    <div className="sm:col-span-2">
                        {label("Pièces jointes prévues")}
                        <textarea readOnly={readOnly} rows={2} value={value.opco.piecesJointes} onChange={(e) => updateOpco("piecesJointes", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                </div>
            </div>

            {/* Signature */}
            <div className="space-y-2">
                <p className={sectionTitleCls()}>✍️ Signature</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                        {label("Nom et fonction du signataire")}
                        <input readOnly={readOnly} value={value.signature.nomFonction} onChange={(e) => updateSignature("nomFonction", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Date")}
                        <input readOnly={readOnly} type="date" value={value.signature.date} onChange={(e) => updateSignature("date", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                    <div>
                        {label("Signature")}
                        <input readOnly={readOnly} value={value.signature.signature} onChange={(e) => updateSignature("signature", e.target.value)} className={inputCls(readOnly)} />
                    </div>
                </div>
            </div>

            {/* Observations */}
            <div>
                {label("Observations")}
                <textarea
                    readOnly={readOnly}
                    rows={3}
                    value={value.observations}
                    onChange={(e) => update("observations", e.target.value)}
                    className={inputCls(readOnly)}
                />
            </div>
        </div>
    );
}
