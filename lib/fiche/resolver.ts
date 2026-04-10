import { prisma } from "@/lib/prisma";
import {
  DEFAULT_FICHE_FIELDS,
  type FicheField,
  type FicheTemplateDTO,
} from "./types";

interface RawTemplate {
  id: string;
  clientId: string | null;
  missionId: string | null;
  name: string;
  fields: unknown;
  isActive: boolean;
}

function coerceFields(raw: unknown): FicheField[] {
  if (!Array.isArray(raw)) return [];
  const out: FicheField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    if (typeof f.key !== "string" || typeof f.label !== "string") continue;
    const type = f.type as FicheField["type"];
    if (
      type !== "text" &&
      type !== "textarea" &&
      type !== "select" &&
      type !== "multiselect" &&
      type !== "number" &&
      type !== "date" &&
      type !== "boolean"
    ) {
      continue;
    }
    out.push({
      key: f.key,
      label: f.label,
      type,
      required: Boolean(f.required),
      options: Array.isArray(f.options) ? (f.options as string[]).filter((o) => typeof o === "string") : undefined,
      order: typeof f.order === "number" ? f.order : 0,
      active: f.active === undefined ? true : Boolean(f.active),
      placeholder: typeof f.placeholder === "string" ? f.placeholder : undefined,
    });
  }
  out.sort((a, b) => a.order - b.order);
  return out;
}

function toDTO(t: RawTemplate, scope: FicheTemplateDTO["scope"]): FicheTemplateDTO {
  return {
    id: t.id,
    clientId: t.clientId,
    missionId: t.missionId,
    name: t.name,
    fields: coerceFields(t.fields),
    isActive: t.isActive,
    scope,
  };
}

/** System default used when no row exists in DB (defensive fallback). */
export function buildSystemDefaultTemplate(): FicheTemplateDTO {
  return {
    id: "fichetpl_default",
    clientId: null,
    missionId: null,
    name: "Fiche RDV (par défaut)",
    fields: DEFAULT_FICHE_FIELDS,
    isActive: true,
    scope: "default",
  };
}

/**
 * Resolve the active fiche template using the fallback chain:
 *   mission-specific -> client-default -> system default.
 * Inactive templates are skipped.
 */
export async function resolveActiveTemplate(args: {
  clientId: string | null;
  missionId: string | null;
}): Promise<FicheTemplateDTO> {
  const { clientId, missionId } = args;

  if (missionId) {
    const missionT = await prisma.ficheTemplate.findFirst({
      where: { missionId, isActive: true },
    });
    if (missionT) return toDTO(missionT as RawTemplate, "mission");
  }

  if (clientId) {
    const clientT = await prisma.ficheTemplate.findFirst({
      where: { clientId, missionId: null, isActive: true },
    });
    if (clientT) return toDTO(clientT as RawTemplate, "client");
  }

  const sysT = await prisma.ficheTemplate.findFirst({
    where: { clientId: null, missionId: null, isActive: true },
  });
  if (sysT) return toDTO(sysT as RawTemplate, "default");

  return buildSystemDefaultTemplate();
}

/** Coerce a raw DB row to DTO with explicit scope tag (for admin listings). */
export function templateRowToDTO(row: RawTemplate): FicheTemplateDTO {
  const scope: FicheTemplateDTO["scope"] = row.missionId
    ? "mission"
    : row.clientId
      ? "client"
      : "default";
  return toDTO(row, scope);
}
