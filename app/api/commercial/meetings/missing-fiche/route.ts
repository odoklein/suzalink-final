import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  requireRole,
  withErrorHandler,
  AuthError,
} from "@/lib/api-utils";
import { isFicheEmpty } from "@/lib/fiche/types";

/**
 * GET /api/commercial/meetings/missing-fiche
 * Returns confirmed meetings (assigned to this commercial via interlocuteurId)
 * whose RDV fiche is empty/missing.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await requireRole(["COMMERCIAL"], request);
  const interlocuteurId = session.user.interlocuteurId;
  if (!interlocuteurId) throw new AuthError("Profil commercial introuvable", 403);

  const interlocuteur = await prisma.clientInterlocuteur.findUnique({
    where: { id: interlocuteurId },
    select: { clientId: true },
  });
  if (!interlocuteur) throw new AuthError("Interlocuteur introuvable", 403);

  const missions = await prisma.mission.findMany({
    where: { clientId: interlocuteur.clientId },
    select: { id: true },
  });
  const missionIds = missions.map((m) => m.id);
  if (missionIds.length === 0) return successResponse({ meetings: [], total: 0 });

  const rows = await prisma.action.findMany({
    where: {
      result: "MEETING_BOOKED",
      confirmationStatus: "CONFIRMED",
      interlocuteurId,
      campaign: { missionId: { in: missionIds } },
    },
    select: {
      id: true,
      callbackDate: true,
      rdvFiche: true,
      rdvFicheUpdatedAt: true,
      contact: {
        select: {
          firstName: true,
          lastName: true,
          company: { select: { id: true, name: true } },
        },
      },
      campaign: { select: { mission: { select: { id: true, name: true } } } },
    },
    orderBy: { callbackDate: "asc" },
  });

  const missing = rows.filter((r) => isFicheEmpty(r.rdvFiche));
  return successResponse({ meetings: missing, total: missing.length });
});
