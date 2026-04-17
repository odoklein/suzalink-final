import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createNotification, createClientPortalNotification } from "@/lib/notifications";
import {
    successResponse,
    errorResponse,
    paginatedResponse,
    requireRole,
    withErrorHandler,
    validateRequest,
    getPaginationParams,
    NotFoundError,
} from "@/lib/api-utils";

// ============================================
// SCHEMAS
// ============================================

const createSchema = z.object({
    missionId: z.string().min(1, "Mission requise"),
    clientId: z.string().min(1, "Client requis").optional(),
    contactId: z.string().min(1).optional(),
    companyId: z.string().min(1).optional(),
    actionId: z.string().min(1).optional(),
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1, "Contenu requis"),
});

// ============================================
// GET /api/formulaires
// ============================================
// List formulaires. Managers see all; SDR/BD see those they created
// (team-lead behaviour kept simple — managers handle cross-team visibility).

export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(
        ["MANAGER", "SDR", "BUSINESS_DEVELOPER", "BOOKER", "COMMERCIAL", "CLIENT"],
        request
    );
    const { searchParams } = new URL(request.url);
    const { page, limit } = getPaginationParams(searchParams);

    const missionId = searchParams.get("missionId");
    const clientId = searchParams.get("clientId");
    const contactId = searchParams.get("contactId");
    const companyId = searchParams.get("companyId");
    const actionId = searchParams.get("actionId");
    const createdById = searchParams.get("createdById");

    const where: Record<string, unknown> = {};
    if (missionId) where.missionId = missionId;
    if (clientId) where.clientId = clientId;
    if (contactId) where.contactId = contactId;
    if (companyId) where.companyId = companyId;
    if (actionId) where.actionId = actionId;

    if (session.user.role === "COMMERCIAL") {
        const interlocuteurId = session.user.interlocuteurId;
        if (!interlocuteurId) {
            return errorResponse("Profil commercial introuvable", 403);
        }
        const interlocuteur = await prisma.clientInterlocuteur.findUnique({
            where: { id: interlocuteurId },
            select: { clientId: true },
        });
        if (!interlocuteur) {
            return errorResponse("Interlocuteur introuvable", 403);
        }
        where.clientId = interlocuteur.clientId;
    }

    if (session.user.role === "CLIENT") {
        const scopedClientId = session.user.clientId;
        if (!scopedClientId) {
            return errorResponse("Client introuvable pour cet utilisateur", 403);
        }
        // Client users can list formulaires for their own client only.
        where.clientId = scopedClientId;
    }

    // SDR / BD / BOOKER only see their own formulaires unless scoped to an
    // entity (entity view = retrieval from a company/contact/action drawer).
    const isEntityView = !!(contactId || companyId || actionId);
    if (
        (session.user.role === "SDR" ||
            session.user.role === "BUSINESS_DEVELOPER" ||
            session.user.role === "BOOKER") &&
        !isEntityView
    ) {
        where.createdById = session.user.id;
    } else if (createdById && session.user.role === "MANAGER") {
        where.createdById = createdById;
    }

    const [rows, total] = await Promise.all([
        prisma.formulaire.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                mission: { select: { id: true, name: true, clientId: true } },
                client: { select: { id: true, name: true } },
                company: { select: { id: true, name: true } },
                contact: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                createdBy: { select: { id: true, name: true, email: true } },
            },
        }),
        prisma.formulaire.count({ where }),
    ]);

    return paginatedResponse(rows, total, page, limit);
});

// ============================================
// POST /api/formulaires
// ============================================

export const POST = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(
        ["MANAGER", "SDR", "BUSINESS_DEVELOPER", "BOOKER"],
        request
    );
    const data = await validateRequest(request, createSchema);

    // Resolve clientId from mission when not explicitly provided — keeps mission + client context attached.
    const mission = await prisma.mission.findUnique({
        where: { id: data.missionId },
        select: { id: true, clientId: true },
    });
    if (!mission) throw new NotFoundError("Mission introuvable");

    const clientId = data.clientId ?? mission.clientId;
    if (clientId !== mission.clientId) {
        return errorResponse(
            "Le client fourni ne correspond pas à la mission",
            400
        );
    }

    // Derive companyId from contactId if contactId is provided and companyId is not.
    let resolvedCompanyId = data.companyId ?? null;
    if (!resolvedCompanyId && data.contactId) {
        const contact = await prisma.contact.findUnique({
            where: { id: data.contactId },
            select: { companyId: true },
        });
        resolvedCompanyId = contact?.companyId ?? null;
    }

    const created = await prisma.formulaire.create({
        data: {
            missionId: mission.id,
            clientId,
            contactId: data.contactId ?? null,
            companyId: resolvedCompanyId,
            actionId: data.actionId ?? null,
            title: data.title ?? "Fiche de renseignement",
            content: data.content,
            status: "DRAFT",
            createdById: session.user.id,
        },
        include: {
            mission: { select: { id: true, name: true } },
            client: { select: { id: true, name: true } },
            company: { select: { id: true, name: true } },
            contact: {
                select: { id: true, firstName: true, lastName: true, email: true },
            },
            createdBy: { select: { id: true, name: true, email: true } },
        },
    });

    const creatorName = created.createdBy?.name || "Un collaborateur";
    const baseTitle = "Nouveau formulaire";
    const baseMessage = `${creatorName} a soumis un nouveau formulaire${created.mission?.name ? ` (${created.mission.name})` : ""}.`;

    // Notify managers so new forms are visible in Notifications + sidebar badges.
    const managers = await prisma.user.findMany({
        where: { role: "MANAGER", isActive: true },
        select: { id: true },
    });
    await Promise.allSettled(
        managers.map((manager) =>
            createNotification({
                userId: manager.id,
                title: baseTitle,
                message: baseMessage,
                type: "info",
                link: "/manager/formulaires",
            })
        )
    );

    // Notify client portal users attached to the same client.
    await createClientPortalNotification(clientId, {
        title: baseTitle,
        message: baseMessage,
        type: "info",
        link: "/client/portal/formulaires",
    });

    return successResponse(created, 201);
});
