import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    successResponse,
    errorResponse,
    requireRole,
    withErrorHandler,
    validateRequest,
    NotFoundError,
} from "@/lib/api-utils";

const updateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
});

const includeRelations = {
    mission: { select: { id: true, name: true, clientId: true } },
    client: { select: { id: true, name: true } },
    company: { select: { id: true, name: true } },
    action: { select: { id: true, interlocuteurId: true } },
    contact: {
        select: { id: true, firstName: true, lastName: true, email: true },
    },
    createdBy: { select: { id: true, name: true, email: true } },
} as const;

function canAccess(
    formulaire: {
        createdById: string;
        clientId: string;
        action: { interlocuteurId: string | null } | null;
    },
    session: { user: { id: string; role: string; clientId?: string | null } },
    commercialClientId?: string | null,
    clientId?: string | null
) {
    if (session.user.role === "MANAGER") return true;
    if (session.user.role === "CLIENT") {
        return !!clientId && formulaire.clientId === clientId;
    }
    if (session.user.role === "COMMERCIAL") {
        return !!commercialClientId && formulaire.clientId === commercialClientId;
    }
    return formulaire.createdById === session.user.id;
}

async function resolveCommercialClientId(interlocuteurId: string | null | undefined) {
    if (!interlocuteurId) return null;
    const interlocuteur = await prisma.clientInterlocuteur.findUnique({
        where: { id: interlocuteurId },
        select: { clientId: true },
    });
    return interlocuteur?.clientId ?? null;
}

// ============================================
// GET /api/formulaires/[id]
// ============================================

export const GET = withErrorHandler(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const session = await requireRole(
            ["MANAGER", "SDR", "BUSINESS_DEVELOPER", "BOOKER", "COMMERCIAL", "CLIENT"],
            request
        );
        const { id } = await params;
        const commercialClientId =
            session.user.role === "COMMERCIAL"
                ? await resolveCommercialClientId(session.user.interlocuteurId)
                : null;
        const clientId = session.user.role === "CLIENT" ? session.user.clientId ?? null : null;
        if (session.user.role === "COMMERCIAL" && !commercialClientId) {
            return errorResponse("Profil commercial introuvable", 403);
        }
        if (session.user.role === "CLIENT" && !clientId) {
            return errorResponse("Client introuvable pour cet utilisateur", 403);
        }

        const row = await prisma.formulaire.findUnique({
            where: { id },
            include: includeRelations,
        });
        if (!row) throw new NotFoundError("Formulaire introuvable");
        if (!canAccess(row, session, commercialClientId, clientId)) return errorResponse("Accès non autorisé", 403);

        return successResponse(row);
    }
);

// ============================================
// PATCH /api/formulaires/[id]
// ============================================

export const PATCH = withErrorHandler(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const session = await requireRole(
            ["MANAGER", "SDR", "BUSINESS_DEVELOPER", "BOOKER", "COMMERCIAL", "CLIENT"],
            request
        );
        const { id } = await params;
        const data = await validateRequest(request, updateSchema);
        const commercialClientId =
            session.user.role === "COMMERCIAL"
                ? await resolveCommercialClientId(session.user.interlocuteurId)
                : null;
        const clientId = session.user.role === "CLIENT" ? session.user.clientId ?? null : null;
        if (session.user.role === "COMMERCIAL" && !commercialClientId) {
            return errorResponse("Profil commercial introuvable", 403);
        }
        if (session.user.role === "CLIENT" && !clientId) {
            return errorResponse("Client introuvable pour cet utilisateur", 403);
        }

        const existing = await prisma.formulaire.findUnique({
            where: { id },
            include: { action: { select: { interlocuteurId: true } } },
        });
        if (!existing) throw new NotFoundError("Formulaire introuvable");
        if (!canAccess(existing, session, commercialClientId, clientId)) return errorResponse("Accès non autorisé", 403);

        const updated = await prisma.formulaire.update({
            where: { id },
            data,
            include: includeRelations,
        });
        return successResponse(updated);
    }
);

// ============================================
// DELETE /api/formulaires/[id]
// ============================================

export const DELETE = withErrorHandler(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const session = await requireRole(
            ["MANAGER", "SDR", "BUSINESS_DEVELOPER", "BOOKER"],
            request
        );
        const { id } = await params;

        const existing = await prisma.formulaire.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError("Formulaire introuvable");
        if (!canAccess(existing, session)) return errorResponse("Accès non autorisé", 403);

        await prisma.formulaire.delete({ where: { id } });
        return successResponse({ id, deleted: true });
    }
);
