"use client";

import type { Meeting } from "../../_types";
import type { UseFicheRdvReturn } from "../../_hooks/useFicheRdv";
import { FileText, AlertCircle, Loader2 } from "lucide-react";
import { DynamicFicheForm } from "@/components/fiche/DynamicFicheForm";

interface FicheTabProps {
  meeting: Meeting;
  setSelectedMeeting: React.Dispatch<React.SetStateAction<Meeting | null>>;
  ficheState: UseFicheRdvReturn;
}

export function FicheTab({ meeting, setSelectedMeeting, ficheState }: FicheTabProps) {
  const {
    ficheTemplate,
    ficheValues,
    ficheLoading,
    ficheError,
    ficheSaving,
    ficheValidationErrors,
    submitFicheValues,
  } = ficheState;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FileText size={15} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Fiche RDV</div>
      </div>

      {meeting.rdvFicheUpdatedAt && (
        <div style={{ fontSize: 12, color: "var(--ink3)" }}>
          Dernière mise à jour : {new Date(meeting.rdvFicheUpdatedAt).toLocaleString("fr-FR")}
        </div>
      )}

      {ficheError && (
        <div style={{ background: "var(--redLight)", border: "1px solid rgba(220,38,38,0.18)", color: "var(--red)", padding: "10px 12px", borderRadius: 12, fontSize: 12 }}>
          {ficheError}
        </div>
      )}

      {ficheLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink3)" }}>
          <Loader2 size={14} className="animate-spin" /> Chargement de la fiche...
        </div>
      ) : !ficheTemplate ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--red)" }}>
          <AlertCircle size={14} /> Template de fiche introuvable.
        </div>
      ) : (
        <DynamicFicheForm
          template={ficheTemplate}
          initialValues={ficheValues}
          saving={ficheSaving}
          errors={ficheValidationErrors}
          bare
          submitLabel="Enregistrer la fiche"
          onSubmit={(values) =>
            submitFicheValues(meeting, values, (updated) => setSelectedMeeting(updated))
          }
        />
      )}
    </div>
  );
}
