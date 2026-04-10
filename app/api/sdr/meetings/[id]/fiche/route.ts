import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  requireRole,
  withErrorHandler,
  AuthError,
  NotFoundError,
  ValidationError,
} from "@/lib/api-utils";
import { resolveActiveTemplate } from "@/lib/fiche/resolver";
import { validateFicheAgainstTemplate } from "@/lib/fiche/types";

/**
 * GET /api/sdr/meetings/[id]/fiche
 * Returns: { fiche, template } — SDR can read their own RDV's fiche.
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await requireRole(["SDR", "BOOKER", "MANAGER"], request);
  const { id } = await params;

  const action = await prisma.action.findUnique({
    where: { id },
    include: {
      campaign: { include: { mission: { select: { id: true, clientId: true } } } },
    },
  });
  if (!action) throw new NotFoundError("RDV introuvable");

  if (session.user.role === "SDR" && action.sdrId !== session.user.id) {
    throw new AuthError("Accès non autorisé", 403);
  }

  const template = await resolveActiveTemplate({
    clientId: action.campaign.mission.clientId,
    missionId: action.campaign.mission.id,
  });

  return successResponse({
    fiche: action.rdvFiche ?? {},
    rdvFicheUpdatedAt: action.rdvFicheUpdatedAt,
    template,
  });
});

/**
 * PUT /api/sdr/meetings/[id]/fiche
 * Body: { fiche: Record<string, unknown> }
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await requireRole(["SDR", "BOOKER", "MANAGER"], request);
  const { id } = await params;

  const action = await prisma.action.findUnique({
    where: { id },
    include: {
      campaign: { include: { mission: { select: { id: true, clientId: true } } } },
    },
  });
  if (!action) throw new NotFoundError("RDV introuvable");
  if (session.user.role === "SDR" && action.sdrId !== session.user.id) {
    throw new AuthError("Accès non autorisé", 403);
  }

  const body = (await request.json().catch(() => null)) as { fiche?: unknown } | null;
  if (!body || typeof body !== "object") throw new ValidationError("Body invalide.");

  const template = await resolveActiveTemplate({
    clientId: action.campaign.mission.clientId,
    missionId: action.campaign.mission.id,
  });

  const result = validateFicheAgainstTemplate(template, body.fiche);
  if (!result.ok) {
    return successResponse({ ok: false, errors: result.errors });
  }

  const updated = await prisma.action.update({
    where: { id },
    data: {
      rdvFiche: result.clean as object,
      rdvFicheUpdatedAt: new Date(),
    },
    select: { id: true, rdvFiche: true, rdvFicheUpdatedAt: true },
  });

  return successResponse({
    ok: true,
    fiche: updated.rdvFiche,
    rdvFicheUpdatedAt: updated.rdvFicheUpdatedAt,
  });
});
