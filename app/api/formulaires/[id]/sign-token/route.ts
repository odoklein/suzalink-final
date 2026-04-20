import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireRole,
  withErrorHandler,
  NotFoundError,
} from "@/lib/api-utils";

async function resolveCommercialClientId(interlocuteurId: string | null | undefined) {
  if (!interlocuteurId) return null;
  const rec = await prisma.clientInterlocuteur.findUnique({
    where: { id: interlocuteurId },
    select: { clientId: true },
  });
  return rec?.clientId ?? null;
}

// GET /api/formulaires/[id]/sign-token
// Returns the sign URL (generating a token if none exists) without sending any email.
// Used to display a QR code in the CRM so a prospect can scan and sign on their own device.
export const GET = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireRole(
      ["MANAGER", "SDR", "BUSINESS_DEVELOPER", "BOOKER", "COMMERCIAL"],
      request
    );
    const { id } = await params;

    const formulaire = await prisma.formulaire.findUnique({ where: { id } });
    if (!formulaire) throw new NotFoundError("Formulaire introuvable");

    if (session.user.role === "COMMERCIAL") {
      const clientId = await resolveCommercialClientId(session.user.interlocuteurId);
      if (!clientId || clientId !== formulaire.clientId) {
        return errorResponse("Acces non autorise", 403);
      }
    } else if (session.user.role !== "MANAGER" && formulaire.createdById !== session.user.id) {
      return errorResponse("Acces non autorise", 403);
    }

    const token = formulaire.signToken ?? crypto.randomUUID();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
    const signUrl = `${appUrl.replace(/\/$/, "")}/formulaires/sign/${token}`;

    if (!formulaire.signToken) {
      await prisma.formulaire.update({
        where: { id },
        data: { signToken: token },
      });
    }

    return successResponse({ signUrl, token });
  }
);
