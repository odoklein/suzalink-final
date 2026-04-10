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

async function loadActionForCommercial(actionId: string, interlocuteurId: string) {
  const interlocuteur = await prisma.clientInterlocuteur.findUnique({
    where: { id: interlocuteurId },
    select: { clientId: true },
  });
  if (!interlocuteur) throw new AuthError("Interlocuteur introuvable", 403);

  const action = await prisma.action.findUnique({
    where: { id: actionId },
    include: {
      campaign: { include: { mission: { select: { id: true, clientId: true } } } },
    },
  });
  if (!action) throw new NotFoundError("Rendez-vous introuvable");
  if (action.campaign.mission.clientId !== interlocuteur.clientId) {
    throw new AuthError("Accès non autorisé", 403);
  }
  return action;
}

/**
 * GET /api/commercial/meetings/[id]/fiche
 * Returns: { fiche, template }
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await requireRole(["COMMERCIAL"], request);
  const { id } = await params;
  const interlocuteurId = session.user.interlocuteurId;
  if (!interlocuteurId) throw new AuthError("Profil commercial introuvable", 403);

  const action = await loadActionForCommercial(id, interlocuteurId);
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
 * PUT /api/commercial/meetings/[id]/fiche
 * Body: { fiche: Record<string, unknown> }
 * Validates against the resolved template; drops unknown keys (safe).
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await requireRole(["COMMERCIAL"], request);
  const { id } = await params;
  const interlocuteurId = session.user.interlocuteurId;
  if (!interlocuteurId) throw new AuthError("Profil commercial introuvable", 403);

  const action = await loadActionForCommercial(id, interlocuteurId);

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

  return successResponse({ ok: true, fiche: updated.rdvFiche, rdvFicheUpdatedAt: updated.rdvFicheUpdatedAt });
});
