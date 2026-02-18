import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    successResponse,
    requireRole,
    withErrorHandler,
    NotFoundError,
    AuthError,
} from '@/lib/api-utils';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Parse optional date string (YYYY-MM-DD) to start/end of day UTC for DB comparison
function parseDateBound(value: string | null, endOfDay: boolean): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(value + 'T00:00:00.000Z');
    if (isNaN(d.getTime())) return null;
    if (endOfDay) d.setUTCDate(d.getUTCDate() + 1);
    return d;
}

// ============================================
// GET /api/clients/[id]/recent-calls
// Recent call outcomes for this client's missions only. No SDR/BD data.
// Query: filter=all|companies|contacts, dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD), limit (default 50, max 200), offset (default 0)
// ============================================

export const GET = withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const session = await requireRole(['MANAGER', 'CLIENT'], request);
    const { id: clientId } = await params;

    if (session.user.role === 'CLIENT') {
        if (session.user.clientId !== clientId) {
            throw new AuthError('Accès non autorisé', 403);
        }
    }

    const client = await prisma.client.findUnique({
        where: { id: clientId },
    });
    if (!client) {
        throw new NotFoundError('Client introuvable');
    }

    const missions = await prisma.mission.findMany({
        where: { clientId },
        select: { id: true },
    });
    const missionIds = missions.map((m) => m.id);

    if (missionIds.length === 0) {
        return successResponse({ calls: [], total: 0 });
    }

    const url = new URL(request.url);
    const filter = (url.searchParams.get('filter') ?? 'all') as 'all' | 'companies' | 'contacts';
    const dateFrom = parseDateBound(url.searchParams.get('dateFrom'), false);
    const dateTo = parseDateBound(url.searchParams.get('dateTo'), true);
    const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);

    const where: {
        channel: 'CALL';
        campaign: { missionId: { in: string[] } };
        companyId?: { not: null } | null;
        contactId?: { not: null } | null;
        createdAt?: { gte?: Date; lte?: Date };
    } = {
        channel: 'CALL',
        campaign: { missionId: { in: missionIds } },
    };
    if (filter === 'companies') {
        where.companyId = { not: null };
    } else if (filter === 'contacts') {
        where.contactId = { not: null };
    }
    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
    }

    const [total, actions] = await Promise.all([
        prisma.action.count({ where }),
        prisma.action.findMany({
            where,
            select: {
                id: true,
                createdAt: true,
                result: true,
                note: true,
                contactId: true,
                companyId: true,
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        company: {
                            select: { id: true, name: true },
                        },
                    },
                },
                company: {
                    select: { id: true, name: true },
                },
                campaign: {
                    select: {
                        id: true,
                        name: true,
                        mission: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
    ]);

    // Shape: each call has either contact (with company) or company; plus campaign/mission. No SDR/BD.
    const normalizedCalls = actions.map((a) => {
        const base = {
            id: a.id,
            createdAt: a.createdAt.toISOString(),
            result: a.result,
            note: a.note ?? undefined,
            campaign: a.campaign,
            mission: a.campaign.mission,
        };
        if (a.contactId && a.contact) {
            return { ...base, contact: { id: a.contact.id, firstName: a.contact.firstName, lastName: a.contact.lastName, company: a.contact.company } };
        }
        if (a.company) {
            return { ...base, company: a.company };
        }
        return base;
    });

    return successResponse({ calls: normalizedCalls, total });
});
