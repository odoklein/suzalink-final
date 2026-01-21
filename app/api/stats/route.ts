import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    successResponse,
    requireRole,
    withErrorHandler,
} from '@/lib/api-utils';

// ============================================
// GET /api/stats - Dashboard statistics
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(['MANAGER', 'SDR', 'CLIENT']);
    const { searchParams } = new URL(request.url);

    // Period filter
    const period = searchParams.get('period') || 'week';
    const missionId = searchParams.get('missionId');

    let dateFilter: Date;
    switch (period) {
        case 'today':
            dateFilter = new Date();
            dateFilter.setHours(0, 0, 0, 0);
            break;
        case 'week':
            dateFilter = new Date();
            dateFilter.setDate(dateFilter.getDate() - 7);
            break;
        case 'month':
            dateFilter = new Date();
            dateFilter.setMonth(dateFilter.getMonth() - 1);
            break;
        default:
            dateFilter = new Date();
            dateFilter.setDate(dateFilter.getDate() - 7);
    }

    const actionWhere: Record<string, unknown> = {
        createdAt: { gte: dateFilter },
    };

    // Role-based filtering
    if (session.user.role === 'SDR') {
        actionWhere.sdrId = session.user.id;
    } else if (session.user.role === 'CLIENT') {
        actionWhere.campaign = {
            mission: {
                client: {
                    users: { some: { id: session.user.id } },
                },
            },
        };
    }

    if (missionId) {
        actionWhere.campaign = { missionId };
    }

    // Get stats
    const [
        totalActions,
        actionsByResult,
        meetingsBooked,
        opportunities,
        activeMissions,
        topSDRs,
    ] = await Promise.all([
        // Total actions
        prisma.action.count({ where: actionWhere }),

        // Actions by result
        prisma.action.groupBy({
            by: ['result'],
            where: actionWhere,
            _count: true,
        }),

        // Meetings booked
        prisma.action.count({
            where: { ...actionWhere, result: 'MEETING_BOOKED' },
        }),

        // Opportunities
        prisma.opportunity.count({
            where: {
                createdAt: { gte: dateFilter },
                ...(session.user.role === 'CLIENT' && {
                    contact: {
                        company: {
                            list: {
                                mission: {
                                    client: { users: { some: { id: session.user.id } } },
                                },
                            },
                        },
                    },
                }),
            },
        }),

        // Active missions count
        prisma.mission.count({
            where: {
                isActive: true,
                ...(session.user.role === 'CLIENT' && {
                    client: { users: { some: { id: session.user.id } } },
                }),
                ...(session.user.role === 'SDR' && {
                    sdrAssignments: { some: { sdrId: session.user.id } },
                }),
            },
        }),

        // Top SDRs (only for managers)
        session.user.role === 'MANAGER'
            ? prisma.action.groupBy({
                by: ['sdrId'],
                where: actionWhere,
                _count: true,
                orderBy: { _count: { sdrId: 'desc' } },
                take: 5,
            })
            : [],
    ]);

    // Format results by type
    const resultBreakdown = {
        NO_RESPONSE: 0,
        BAD_CONTACT: 0,
        INTERESTED: 0,
        CALLBACK_REQUESTED: 0,
        MEETING_BOOKED: 0,
        DISQUALIFIED: 0,
    };

    actionsByResult.forEach((item) => {
        resultBreakdown[item.result] = item._count;
    });

    // Calculate conversion rate
    const conversionRate = totalActions > 0
        ? ((meetingsBooked / totalActions) * 100).toFixed(2)
        : '0.00';

    // Get SDR names for leaderboard
    let leaderboard: { id: string; name: string; actions: number }[] = [];
    if (topSDRs.length > 0) {
        const sdrIds = topSDRs.map((s) => s.sdrId);
        const sdrs = await prisma.user.findMany({
            where: { id: { in: sdrIds } },
            select: { id: true, name: true },
        });

        leaderboard = topSDRs.map((s) => ({
            id: s.sdrId,
            name: sdrs.find((u) => u.id === s.sdrId)?.name || 'Unknown',
            actions: s._count,
        }));
    }

    return successResponse({
        period,
        totalActions,
        meetingsBooked,
        opportunities,
        activeMissions,
        conversionRate: parseFloat(conversionRate),
        resultBreakdown,
        leaderboard,
    });
});
