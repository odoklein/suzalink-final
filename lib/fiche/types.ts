// Shared types for the dynamic RDV fiche template system.
// Used by API routes, server-side validators, and client UI.

export type FicheFieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "number"
  | "date"
  | "boolean";

export interface FicheField {
  /** Stable identifier persisted in Action.rdvFiche; e.g. "contexte". */
  key: string;
  /** Human label rendered to the user (French). */
  label: string;
  type: FicheFieldType;
  required: boolean;
  /** For select / multiselect. */
  options?: string[];
  /** Sort order (ascending). */
  order: number;
  /** When false, field is hidden from the form but kept in template history. */
  active: boolean;
  /** Optional placeholder shown to the user. */
  placeholder?: string;
}

export interface FicheTemplateDTO {
  id: string;
  clientId: string | null;
  missionId: string | null;
  name: string;
  fields: FicheField[];
  isActive: boolean;
  /** Where the template was resolved from. */
  scope: "mission" | "client" | "default";
}

export type FicheValue = string | number | boolean | string[] | null;
export type FicheValues = Record<string, FicheValue>;

export interface FicheValidationError {
  key: string;
  message: string;
}

/**
 * Validate fiche values against a template.
 * - Drops unknown keys (safe policy).
 * - Coerces values to the expected runtime type when possible.
 * - Enforces `required` on active fields.
 */
export function validateFicheAgainstTemplate(
  template: Pick<FicheTemplateDTO, "fields">,
  raw: unknown,
): { ok: true; clean: FicheValues } | { ok: false; errors: FicheValidationError[] } {
  if (raw === null || raw === undefined) {
    raw = {};
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: [{ key: "_root", message: "Format de fiche invalide." }] };
  }
  const input = raw as Record<string, unknown>;
  const errors: FicheValidationError[] = [];
  const clean: FicheValues = {};
  const activeFields = template.fields.filter((f) => f.active);

  for (const field of activeFields) {
    const value = input[field.key];
    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      if (field.required) {
        errors.push({ key: field.key, message: `Le champ « ${field.label} » est requis.` });
      }
      clean[field.key] = field.type === "multiselect" ? [] : null;
      continue;
    }

    switch (field.type) {
      case "text":
      case "textarea": {
        if (typeof value !== "string") {
          errors.push({ key: field.key, message: `« ${field.label} » doit être du texte.` });
          break;
        }
        clean[field.key] = value;
        break;
      }
      case "number": {
        const num = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(num)) {
          errors.push({ key: field.key, message: `« ${field.label} » doit être un nombre.` });
          break;
        }
        clean[field.key] = num;
        break;
      }
      case "boolean": {
        if (typeof value === "boolean") {
          clean[field.key] = value;
        } else if (value === "true" || value === "false") {
          clean[field.key] = value === "true";
        } else {
          errors.push({ key: field.key, message: `« ${field.label} » doit être vrai ou faux.` });
        }
        break;
      }
      case "date": {
        if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
          errors.push({ key: field.key, message: `« ${field.label} » doit être une date valide.` });
          break;
        }
        clean[field.key] = value;
        break;
      }
      case "select": {
        if (typeof value !== "string") {
          errors.push({ key: field.key, message: `« ${field.label} » : valeur invalide.` });
          break;
        }
        if (field.options && field.options.length > 0 && !field.options.includes(value)) {
          errors.push({
            key: field.key,
            message: `« ${field.label} » : choix non autorisé.`,
          });
          break;
        }
        clean[field.key] = value;
        break;
      }
      case "multiselect": {
        if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
          errors.push({ key: field.key, message: `« ${field.label} » : liste invalide.` });
          break;
        }
        const arr = value as string[];
        if (field.options && field.options.length > 0) {
          const bad = arr.find((v) => !field.options!.includes(v));
          if (bad) {
            errors.push({
              key: field.key,
              message: `« ${field.label} » : "${bad}" non autorisé.`,
            });
            break;
          }
        }
        clean[field.key] = arr;
        break;
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, clean };
}

/**
 * Returns true if a stored fiche value object is "empty enough" to be considered missing.
 * Used by the commercial flow to flag meetings needing a fiche.
 */
export function isFicheEmpty(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return true;
  const obj = raw as Record<string, unknown>;
  const values = Object.values(obj);
  if (values.length === 0) return true;
  return values.every((v) => {
    if (v === null || v === undefined) return true;
    if (typeof v === "string") return v.trim() === "";
    if (Array.isArray(v)) return v.length === 0;
    return false;
  });
}

/** Default fields used to seed any template the user creates from scratch. */
export const DEFAULT_FICHE_FIELDS: FicheField[] = [
  { key: "contexte", label: "Contexte", type: "textarea", required: false, order: 1, active: true },
  { key: "besoinsProblemes", label: "Besoins / Problèmes identifiés", type: "textarea", required: false, order: 2, active: true },
  { key: "solutionsEnPlace", label: "Solutions en place", type: "textarea", required: false, order: 3, active: true },
  { key: "objectionsFreins", label: "Objections / Freins", type: "textarea", required: false, order: 4, active: true },
  { key: "notesImportantes", label: "Notes importantes", type: "textarea", required: false, order: 5, active: true },
];

/**
 * Preset built from: "fiche renseignement hygiene alimentaire.docx".
 * Used to quickly bootstrap a full hygiene-alimentaire form for teams.
 */
export const HYGIENE_ALIMENTAIRE_FICHE_FIELDS: FicheField[] = [
  { key: "cnfCollaborateurNomPrenom", label: "Nom prénom du collaborateur CNF", type: "text", required: false, order: 1, active: true },
  { key: "dateDemande", label: "Date", type: "date", required: false, order: 2, active: true },
  { key: "restaurateurNomPrenom", label: "Nom et prénom (restaurateur)", type: "text", required: true, order: 3, active: true },
  { key: "restaurateurDateNaissance", label: "Date de naissance", type: "date", required: false, order: 4, active: true },
  { key: "restaurateurAdresse", label: "Adresse personnelle", type: "textarea", required: false, order: 5, active: true },
  { key: "restaurateurTelephone", label: "Téléphone", type: "text", required: false, order: 6, active: true },
  { key: "restaurateurEmail", label: "E-mail", type: "text", required: false, order: 7, active: true },
  { key: "etablissementNom", label: "Nom du restaurant / établissement", type: "text", required: true, order: 8, active: true },
  { key: "etablissementAdresse", label: "Adresse complète", type: "textarea", required: false, order: 9, active: true },
  { key: "siret", label: "SIRET", type: "text", required: false, order: 10, active: true },
  { key: "codeApe", label: "Code APE", type: "text", required: false, order: 11, active: true },
  { key: "typeActivite", label: "Type d’activité", type: "textarea", required: false, order: 12, active: true },
  { key: "apprenants", label: "Apprenant(s) (max 7)", type: "textarea", required: false, order: 13, active: true, placeholder: "Nom, prénom, date de naissance, n° sécurité sociale, email, téléphone, ancienneté, type de contrat..." },
  { key: "nomDirigeant", label: "Nom du dirigeant (si différent du bénéficiaire)", type: "text", required: false, order: 14, active: true },
  { key: "contactAdministratif", label: "E-mail de contact administratif & téléphone", type: "text", required: false, order: 15, active: true },
  { key: "dureeFormation", label: "Durée de la formation", type: "text", required: false, order: 16, active: true, placeholder: "Ex: 14 heures / 2 jours" },
  { key: "datesSouhaitees", label: "Dates souhaitées", type: "textarea", required: false, order: 17, active: true },
  { key: "lieuFormation", label: "Lieu de la formation", type: "text", required: false, order: 18, active: true },
  { key: "coutPedagogique", label: "Coût pédagogique", type: "text", required: false, order: 19, active: true },
  { key: "opcoRattachement", label: "OPCO de rattachement (nom et adresse)", type: "textarea", required: false, order: 20, active: true },
  { key: "idccConventionCollective", label: "Numéro IDCC / Convention collective", type: "text", required: false, order: 21, active: true },
  { key: "typeFinancementDemande", label: "Type de financement demandé", type: "textarea", required: false, order: 22, active: true },
  { key: "piecesJointes", label: "Pièces jointes prévues", type: "textarea", required: false, order: 23, active: true, placeholder: "Devis, convention, programme détaillé..." },
  { key: "signataireNomFonction", label: "Nom et fonction du signataire", type: "text", required: false, order: 24, active: true },
  { key: "signatureDate", label: "Date de signature", type: "date", required: false, order: 25, active: true },
  { key: "observations", label: "Observations", type: "textarea", required: false, order: 26, active: true },
];
