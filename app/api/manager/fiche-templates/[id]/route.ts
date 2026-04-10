import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  requireRole,
  withErrorHandler,
  validateRequest,
  NotFoundError,
} from "@/lib/api-utils";
import { templateRowToDTO } from "@/lib/fiche/resolver";

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

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  fields: z.array(fieldSchema).optional(),
  isActive: z.boolean().optional(),
  clientId: z.string().nullable().optional(),
  missionId: z.string().nullable().optional(),
});

export const PUT = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    await requireRole(["MANAGER"], request);
    const { id } = await params;
    const body = await validateRequest(request, updateSchema);

    const existing = await prisma.ficheTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Template introuvable");

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.fields !== undefined) data.fields = body.fields as object;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.clientId !== undefined) data.clientId = body.clientId;
    if (body.missionId !== undefined) data.missionId = body.missionId;

    const updated = await prisma.ficheTemplate.update({ where: { id }, data });
    return successResponse({ template: templateRowToDTO(updated) });
  },
);

export const DELETE = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    await requireRole(["MANAGER"], _request);
    const { id } = await params;

    const existing = await prisma.ficheTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Template introuvable");

    // Don't let users delete the default fallback template (clientId/missionId both null)
    if (!existing.clientId && !existing.missionId) {
      return successResponse({ deleted: false, reason: "default_protected" });
    }

    await prisma.ficheTemplate.delete({ where: { id } });
    return successResponse({ deleted: true });
  },
);
