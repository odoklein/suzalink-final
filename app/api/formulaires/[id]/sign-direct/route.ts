import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClientPortalNotification, createNotification } from "@/lib/notifications";
import {
  successResponse,
  errorResponse,
  requireRole,
  withErrorHandler,
  validateRequest,
  NotFoundError,
} from "@/lib/api-utils";

const bodySchema = z.object({
  signerName: z.string().min(2, "Nom du signataire requis"),
  signatureData: z.string().optional(),
});

function linkForRole(role: string): string {
  if (role === "MANAGER") return "/manager/formulaires";
  if (role === "COMMERCIAL") return "/commercial/portal/formulaires";
  return "/sdr/formulaires";
}

async function resolveCommercialClientId(interlocuteurId: string | null | undefined) {
  if (!interlocuteurId) return null;
  const rec = await prisma.clientInterlocuteur.findUnique({
    where: { id: interlocuteurId },
    select: { clientId: true },
  });
  return rec?.clientId ?? null;
}

export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireRole(
      ["MANAGER", "SDR", "BUSINESS_DEVELOPER", "BOOKER", "COMMERCIAL"],
      request
    );
    const { id } = await params;
    const body = await validateRequest(request, bodySchema);

    const formulaire = await prisma.formulaire.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, role: true } },
        contact: { select: { email: true } },
      },
    });
    if (!formulaire) throw new NotFoundError("Formulaire introuvable");

    // Authorization: same rules as send
    if (session.user.role === "COMMERCIAL") {
      const clientId = await resolveCommercialClientId(session.user.interlocuteurId);
      if (!clientId || clientId !== formulaire.clientId) {
        return errorResponse("Acces non autorise", 403);
      }
    } else if (session.user.role !== "MANAGER" && formulaire.createdById !== session.user.id) {
      return errorResponse("Acces non autorise", 403);
    }

    if (formulaire.status === "SIGNED") {
      return errorResponse("Ce formulaire est deja signe", 400);
    }

    const signed = await prisma.formulaire.update({
      where: { id },
      data: {
        status: "SIGNED",
        signedAt: new Date(),
        signedBy: body.signerName,
        signatureData: body.signatureData ?? null,
        sentToEmail: formulaire.sentToEmail ?? formulaire.contact?.email ?? null,
      },
    });

    const managers = await prisma.user.findMany({
      where: { role: "MANAGER", isActive: true },
      select: { id: true },
    });

    await Promise.allSettled([
      ...managers.map((m) =>
        createNotification({
          userId: m.id,
          title: "Formulaire signe (presentiel)",
          message: `Le formulaire "${formulaire.title}" a ete signe en presentiel par ${body.signerName}.`,
          type: "success",
          link: "/manager/formulaires",
        })
      ),
      ...(formulaire.createdById && formulaire.createdBy?.role !== "MANAGER"
        ? [
            createNotification({
              userId: formulaire.createdById,
              title: "Formulaire signe (presentiel)",
              message: `Le formulaire "${formulaire.title}" a ete signe en presentiel par ${body.signerName}.`,
              type: "success",
              link: linkForRole(formulaire.createdBy?.role ?? "SDR"),
            }),
          ]
        : []),
    ]);

    await createClientPortalNotification(formulaire.clientId, {
      title: "Formulaire signe",
      message: `Le formulaire "${formulaire.title}" a ete signe par ${body.signerName}.`,
      type: "success",
      link: "/client/portal/formulaires",
    });

    return successResponse(signed);
  }
);
