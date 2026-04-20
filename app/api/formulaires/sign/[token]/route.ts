import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  withErrorHandler,
  validateRequest,
  NotFoundError,
} from "@/lib/api-utils";
import { createClientPortalNotification, createNotification } from "@/lib/notifications";

const signSchema = z.object({
  signerName: z.string().min(2, "Nom du signataire requis"),
  signatureData: z.string().optional(),
});

function linkForRole(role: string): string {
  if (role === "MANAGER") return "/manager/formulaires";
  if (role === "COMMERCIAL") return "/commercial/portal/formulaires";
  return "/sdr/formulaires";
}

export const GET = withErrorHandler(
  async (_request: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    const formulaire = await prisma.formulaire.findUnique({
      where: { signToken: token },
      include: {
        mission: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        contact: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!formulaire) throw new NotFoundError("Lien de signature invalide");

    return successResponse({
      id: formulaire.id,
      title: formulaire.title,
      content: formulaire.content,
      status: formulaire.status,
      signedAt: formulaire.signedAt,
      signedBy: formulaire.signedBy,
      mission: formulaire.mission,
      client: formulaire.client,
      contact: formulaire.contact,
    });
  }
);

export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    const body = await validateRequest(request, signSchema);

    const formulaire = await prisma.formulaire.findUnique({
      where: { signToken: token },
      include: {
        createdBy: { select: { id: true, role: true } },
        contact: { select: { email: true } },
      },
    });

    if (!formulaire) throw new NotFoundError("Lien de signature invalide");
    if (formulaire.status === "SIGNED") {
      return errorResponse("Ce formulaire est deja signe", 400);
    }

    const signed = await prisma.formulaire.update({
      where: { id: formulaire.id },
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

    await Promise.allSettled(
      managers.map((manager) =>
        createNotification({
          userId: manager.id,
          title: "Formulaire signe",
          message: `Le formulaire "${formulaire.title}" a ete signe par ${body.signerName}.`,
          type: "success",
          link: "/manager/formulaires",
        })
      )
    );

    // Notify creator with their role-appropriate link (skip if already notified as MANAGER)
    if (formulaire.createdById && formulaire.createdBy?.role !== "MANAGER") {
      await createNotification({
        userId: formulaire.createdById,
        title: "Formulaire signe",
        message: `Votre formulaire "${formulaire.title}" a ete signe par ${body.signerName}.`,
        type: "success",
        link: linkForRole(formulaire.createdBy?.role ?? "SDR"),
      });
    }

    await createClientPortalNotification(formulaire.clientId, {
      title: "Formulaire signe",
      message: `Le prospect a signe le formulaire "${formulaire.title}".`,
      type: "success",
      link: "/client/portal/formulaires",
    });

    return successResponse(signed);
  }
);
