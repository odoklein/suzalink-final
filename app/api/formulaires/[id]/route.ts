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
    contact: {
        select: { id: true, firstName: true, lastName: true, email: true },
    },
    createdBy: { select: { id: true, name: true, email: true } },
} as const;

function canAccess(
    formulaire: { createdById: string },
    session: { user: { id: string; role: string } }
) {
    if (session.user.role === "MANAGER") return true;
    return formulaire.createdById === session.user.id;
}

// ============================================
// GET /api/formulaires/[id]
// ============================================

export const GET = withErrorHandler(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const session = await requireRole(
            ["MANAGER", "SDR", "BUSINESS_DEVELOPER", "BOOKER"],
            request
        );
        const { id } = await params;

        const row = await prisma.formulaire.findUnique({
            where: { id },
            include: includeRelations,
        });
        if (!row) throw new NotFoundError("Formulaire introuvable");
        if (!canAccess(row, session)) return errorResponse("Accès non autorisé", 403);

        return successResponse(row);
    }
);

// ============================================
// PATCH /api/formulaires/[id]
// ============================================

export const PATCH = withErrorHandler(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const session = await requireRole(
            ["MANAGER", "SDR", "BUSINESS_DEVELOPER", "BOOKER"],
            request
        );
        const { id } = await params;
        const data = await validateRequest(request, updateSchema);

        const existing = await prisma.formulaire.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError("Formulaire introuvable");
        if (!canAccess(existing, session)) return errorResponse("Accès non autorisé", 403);

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
