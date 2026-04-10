import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  requireAuth,
  withErrorHandler,
  NotFoundError,
  ValidationError,
  AuthError,
} from "@/lib/api-utils";
import { resolveActiveTemplate } from "@/lib/fiche/resolver";

/**
 * GET /api/fiche-templates/active?actionId=<id>
 *
 * Returns the active fiche template for a given RDV (Action), resolving the
 * mission -> client -> default fallback chain.
 *
 * Auth: any authenticated user, but the action must be in the user's scope:
 *  - MANAGER: any
 *  - SDR: only RDVs they own
 *  - COMMERCIAL: only RDVs whose mission belongs to their client
 *  - CLIENT: only RDVs whose mission belongs to their client
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await requireAuth(request);
  const sp = new URL(request.url).searchParams;

  const actionId = sp.get("actionId");
  // Or: explicit clientId / missionId for admin previews
  const explicitClientId = sp.get("clientId");
  const explicitMissionId = sp.get("missionId");

  let clientId: string | null = null;
  let missionId: string | null = null;

  if (actionId) {
    const action = await prisma.action.findUnique({
      where: { id: actionId },
      include: {
        campaign: { include: { mission: { select: { id: true, clientId: true } } } },
      },
    });
    if (!action) throw new NotFoundError("RDV introuvable");

    missionId = action.campaign.mission.id;
    clientId = action.campaign.mission.clientId;

    // Auth scope checks
    const role = session.user.role;
    if (role === "SDR" && action.sdrId !== session.user.id) {
      throw new AuthError("Accès non autorisé", 403);
    }
    if (role === "COMMERCIAL") {
      const interlocuteurId = session.user.interlocuteurId;
      if (!interlocuteurId) throw new AuthError("Profil commercial introuvable", 403);
      const interlocuteur = await prisma.clientInterlocuteur.findUnique({
        where: { id: interlocuteurId },
        select: { clientId: true },
      });
      if (!interlocuteur || interlocuteur.clientId !== clientId) {
        throw new AuthError("Accès non autorisé", 403);
      }
    }
    if (role === "CLIENT") {
      const userClientId = session.user.clientId;
      if (!userClientId || userClientId !== clientId) {
        throw new AuthError("Accès non autorisé", 403);
      }
    }
  } else if (explicitClientId || explicitMissionId) {
    // Only managers can preview templates for arbitrary scopes
    if (session.user.role !== "MANAGER") {
      throw new AuthError("Accès non autorisé", 403);
    }
    clientId = explicitClientId;
    missionId = explicitMissionId;
  } else {
    throw new ValidationError("actionId requis (ou clientId/missionId pour preview).");
  }

  const template = await resolveActiveTemplate({ clientId, missionId });
  return successResponse({ template });
});
