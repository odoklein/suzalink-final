import crypto from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email/transactional";
import { buildFormulaireSignatureEmail } from "@/lib/email/templates/formulaire-signature";
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
  recipientEmail: z.string().email("Email invalide"),
});

export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireRole(["MANAGER", "SDR", "BUSINESS_DEVELOPER", "BOOKER"], request);
    const { id } = await params;
    const data = await validateRequest(request, bodySchema);

    const formulaire = await prisma.formulaire.findUnique({
      where: { id },
      include: {
        mission: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!formulaire) throw new NotFoundError("Formulaire introuvable");
    if (session.user.role !== "MANAGER" && formulaire.createdById !== session.user.id) {
      return errorResponse("Acces non autorise", 403);
    }

    const token = formulaire.signToken ?? crypto.randomUUID();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
    const signUrl = `${appUrl.replace(/\/$/, "")}/formulaires/sign/${token}`;
    const prospectName =
      [formulaire.contact?.firstName, formulaire.contact?.lastName].filter(Boolean).join(" ") ||
      "Madame, Monsieur";

    const { subject, html } = buildFormulaireSignatureEmail({
      title: formulaire.title,
      prospectName,
      missionName: formulaire.mission?.name,
      signUrl,
    });

    const sent = await sendTransactionalEmail({
      to: data.recipientEmail,
      subject,
      html,
    });

    if (!sent) {
      return errorResponse("Envoi email impossible: verifiez la configuration SMTP SYSTEM_SMTP_*", 500);
    }

    const updated = await prisma.formulaire.update({
      where: { id },
      data: {
        status: "SENT",
        signToken: token,
        sentToEmail: data.recipientEmail,
        sentAt: new Date(),
      },
    });

    const managerUsers = await prisma.user.findMany({
      where: { role: "MANAGER", isActive: true },
      select: { id: true },
    });
    await Promise.allSettled(
      managerUsers.map((manager) =>
        createNotification({
          userId: manager.id,
          title: "Formulaire envoye",
          message: `Le formulaire "${formulaire.title}" a ete envoye a ${data.recipientEmail}.`,
          type: "info",
          link: "/manager/formulaires",
        })
      )
    );
    await createClientPortalNotification(formulaire.clientId, {
      title: "Formulaire envoye",
      message: `Un formulaire vient d'etre envoye au prospect (${data.recipientEmail}).`,
      type: "info",
      link: "/client/portal/formulaires",
    });

    return successResponse(updated);
  }
);
