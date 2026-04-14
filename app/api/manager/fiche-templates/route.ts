import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  requireRole,
  withErrorHandler,
  validateRequest,
} from "@/lib/api-utils";
import { templateRowToDTO } from "@/lib/fiche/resolver";
import { DEFAULT_FICHE_FIELDS, HYGIENE_ALIMENTAIRE_FICHE_FIELDS } from "@/lib/fiche/types";

const fieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "key doit être alphanumérique"),
  label: z.string().min(1).max(120),
  type: z.enum(["text", "textarea", "select", "multiselect", "number", "date", "boolean"]),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1).max(120)).optional(),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  placeholder: z.string().max(240).optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(120).default("Fiche RDV"),
  clientId: z.string().nullable().optional(),
  missionId: z.string().nullable().optional(),
  fields: z.array(fieldSchema).optional(),
  isActive: z.boolean().optional(),
  preset: z.enum(["HYGIENE_ALIMENTAIRE"]).optional(),
});

/**
 * GET /api/manager/fiche-templates
 * List all templates (manager only).
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRole(["MANAGER"], request);
  const sp = new URL(request.url).searchParams;
  const clientId = sp.get("clientId");
  const missionId = sp.get("missionId");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (missionId) where.missionId = missionId;

  const rows = await prisma.ficheTemplate.findMany({
    where,
    orderBy: [{ clientId: "asc" }, { missionId: "asc" }, { updatedAt: "desc" }],
  });

  // Eagerly enrich with client/mission names for the admin UI
  const clientIds = Array.from(new Set(rows.map((r) => r.clientId).filter(Boolean) as string[]));
  const missionIds = Array.from(new Set(rows.map((r) => r.missionId).filter(Boolean) as string[]));
  const [clients, missions] = await Promise.all([
    clientIds.length
      ? prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    missionIds.length
      ? prisma.mission.findMany({ where: { id: { in: missionIds } }, select: { id: true, name: true, clientId: true } })
      : Promise.resolve([]),
  ]);
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const missionMap = new Map(missions.map((m) => [m.id, m.name]));

  const data = rows.map((r) => ({
    ...templateRowToDTO(r),
    clientName: r.clientId ? clientMap.get(r.clientId) ?? null : null,
    missionName: r.missionId ? missionMap.get(r.missionId) ?? null : null,
  }));

  return successResponse({ templates: data });
});

/**
 * POST /api/manager/fiche-templates
 * Create a new template (manager only).
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireRole(["MANAGER"], request);
  const body = await validateRequest(request, createSchema);

  const created = await prisma.ficheTemplate.create({
    data: {
      name: body.name,
      clientId: body.clientId ?? null,
      missionId: body.missionId ?? null,
      fields: (
        body.fields && body.fields.length > 0
          ? body.fields
          : body.preset === "HYGIENE_ALIMENTAIRE"
            ? HYGIENE_ALIMENTAIRE_FICHE_FIELDS
            : DEFAULT_FICHE_FIELDS
      ) as object,
      isActive: body.isActive ?? true,
    },
  });

  return successResponse({ template: templateRowToDTO(created) });
});
