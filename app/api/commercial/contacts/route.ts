import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    successResponse,
    requireRole,
    withErrorHandler,
    AuthError,
} from '@/lib/api-utils';

// ============================================
// GET /api/commercial/contacts
// Fetch contacts and companies from the commercial's client campaigns
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(['COMMERCIAL'], request);

    const interlocuteurId = session.user.interlocuteurId;
    if (!interlocuteurId) {
        throw new AuthError('Profil commercial introuvable', 403);
    }

    const interlocuteur = await prisma.clientInterlocuteur.findUnique({
        where: { id: interlocuteurId },
        select: { clientId: true },
    });

    if (!interlocuteur) {
        throw new AuthError('Interlocuteur introuvable', 403);
    }

    const { clientId } = interlocuteur;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
    const skip = (page - 1) * limit;

    // Build contact where clause scoped to the commercial's client.
    // We intentionally do not require existing actions so the full prospect base is visible.
    const contactWhere: Record<string, unknown> = {
        company: {
            list: {
                mission: { clientId },
            },
        },
    };

    if (search) {
        contactWhere.OR = [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { company: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
            where: contactWhere,
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        industry: true,
                        country: true,
                        website: true,
                        size: true,
                    },
                },
            },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            skip,
            take: limit,
        }),
        prisma.contact.count({ where: contactWhere }),
    ]);

    return successResponse({
        contacts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    });
});
