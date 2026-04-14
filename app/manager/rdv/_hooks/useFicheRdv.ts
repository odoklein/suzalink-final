"use client";

import { useState, useCallback } from "react";
import type { Meeting } from "../_types";
import type { FicheTemplateDTO, FicheValues, FicheValidationError } from "@/lib/fiche/types";

export interface UseFicheRdvReturn {
  ficheTemplate: FicheTemplateDTO | null;
  ficheValues: FicheValues;
  ficheLoading: boolean;
  ficheError: string | null;
  ficheSaving: boolean;
  ficheValidationErrors: FicheValidationError[];
  loadFiche: (meetingId: string) => Promise<void>;
  saveFiche: (meeting: Meeting, onUpdate: (m: Meeting) => void) => Promise<void>;
  submitFicheValues: (
    meeting: Meeting,
    values: FicheValues,
    onUpdate: (m: Meeting) => void
  ) => Promise<void>;
}

export function useFicheRdv(
  updateMeeting: (id: string, data: Record<string, unknown>) => Promise<void>
): UseFicheRdvReturn {
  const [ficheTemplate, setFicheTemplate] = useState<FicheTemplateDTO | null>(null);
  const [ficheValues, setFicheValues] = useState<FicheValues>({});
  const [ficheLoading, setFicheLoading] = useState(false);
  const [ficheError, setFicheError] = useState<string | null>(null);
  const [ficheSaving, setFicheSaving] = useState(false);
  const [ficheValidationErrors, setFicheValidationErrors] = useState<FicheValidationError[]>([]);

  const loadFiche = useCallback(async (meetingId: string) => {
    setFicheLoading(true);
    setFicheError(null);
    setFicheValidationErrors([]);
    try {
      const res = await fetch(`/api/sdr/meetings/${meetingId}/fiche`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setFicheError(json?.error || "Impossible de charger la fiche.");
        return;
      }
      setFicheTemplate((json.data?.template as FicheTemplateDTO) ?? null);
      setFicheValues((json.data?.fiche as FicheValues) ?? {});
    } catch {
      setFicheError("Erreur réseau lors du chargement de la fiche.");
    } finally {
      setFicheLoading(false);
    }
  }, []);

  const submitFicheValues = useCallback(
    async (meeting: Meeting, values: FicheValues, onUpdate: (m: Meeting) => void) => {
      setFicheSaving(true);
      setFicheError(null);
      setFicheValidationErrors([]);
      try {
        const res = await fetch(`/api/sdr/meetings/${meeting.id}/fiche`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fiche: values }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          setFicheError(json?.error || "Erreur lors de la sauvegarde.");
          return;
        }
        if (json.data?.ok === false) {
          setFicheValidationErrors((json.data.errors as FicheValidationError[]) ?? []);
          return;
        }
        setFicheValues((json.data?.fiche as FicheValues) ?? values);
        onUpdate({
          ...meeting,
          rdvFiche: (json.data?.fiche as Record<string, unknown>) ?? values,
          rdvFicheUpdatedAt: (json.data?.rdvFicheUpdatedAt as string) ?? new Date().toISOString(),
        });
      } catch {
        setFicheError("Erreur réseau lors de la sauvegarde.");
      } finally {
        setFicheSaving(false);
      }
    },
    []
  );

  const saveFiche = useCallback(
    async (meeting: Meeting, onUpdate: (m: Meeting) => void) =>
      submitFicheValues(meeting, ficheValues, onUpdate),
    [submitFicheValues, ficheValues]
  );

  return {
    ficheTemplate,
    ficheValues,
    ficheLoading,
    ficheError,
    ficheSaving,
    ficheValidationErrors,
    loadFiche,
    saveFiche,
    submitFicheValues,
  };
}
