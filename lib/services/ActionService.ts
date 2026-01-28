import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// ============================================
// ACTION SERVICE
// ============================================
// Centralized business logic for actions
// Replaces scattered logic in API routes
// ============================================

export interface CreateActionInput {
    contactId?: string;
    companyId?: string;
    sdrId: string;
    campaignId: string;
    channel: 'CALL' | 'EMAIL' | 'LINKEDIN';
    result: 'NO_RESPONSE' | 'BAD_CONTACT' | 'INTERESTED' | 'CALLBACK_REQUESTED' | 'MEETING_BOOKED' | 'DISQUALIFIED';
    note?: string;
    duration?: number;
}

export interface ActionWithRelations {
    id: string;
    contact: {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        company: {
            id: string;
            name: string;
        };
    };
    result: string;
    createdAt: Date;
}

export class ActionService {
    // ============================================
    // CREATE ACTION WITH TRANSACTION
    // ============================================
    async createAction(input: CreateActionInput): Promise<ActionWithRelations> {
        // Use transaction to ensure atomicity
        return await prisma.$transaction(async (tx) => {
            // Validate that either contactId or companyId is provided
            if (!input.contactId && !input.companyId) {
                throw new Error('Either contactId or companyId must be provided');
            }

            // 1. Create the action
            const action = await tx.action.create({
                data: {
                    contactId: input.contactId || null,
                    companyId: input.companyId || null,
                    sdrId: input.sdrId,
                    campaignId: input.campaignId,
                    channel: input.channel,
                    result: input.result,
                    note: input.note,
                    duration: input.duration,
                },
                include: {
                    contact: input.contactId ? {
                        include: { company: true },
                    } : undefined,
                    company: input.companyId ? true : undefined,
                },
            });

            // 2. Auto-create opportunity for positive outcomes (only for contacts)
            if (input.contactId && this.shouldCreateOpportunity(input.result, input.note)) {
                await this.createOpportunityFromAction(tx, action, input.note!);
            }

            // 3. Update contact completeness if enriched (only for contacts)
            if (input.contactId && input.note && input.result === 'BAD_CONTACT') {
                await this.handleBadContact(tx, input.contactId, input.note);
            }

            return action;
        });
    }

    // ============================================
    // OPPORTUNITY CREATION LOGIC
    // ============================================
    private shouldCreateOpportunity(result: string, note?: string): boolean {
        return (result === 'MEETING_BOOKED' || result === 'INTERESTED') && !!note;
    }

    private async createOpportunityFromAction(
        tx: Prisma.TransactionClient,
        action: any,
        note: string
    ): Promise<void> {
        // Check if opportunity already exists
        const existing = await tx.opportunity.findFirst({
            where: { contactId: action.contactId },
        });

        if (existing) return; // Don't create duplicate

        await tx.opportunity.create({
            data: {
                contactId: action.contactId,
                companyId: action.contact.companyId,
                needSummary: note,
                urgency: action.result === 'MEETING_BOOKED' ? 'SHORT' : 'MEDIUM',
            },
        });
    }

    // ============================================
    // BAD CONTACT HANDLING
    // ============================================
    private async handleBadContact(
        tx: Prisma.TransactionClient,
        contactId: string,
        note: string
    ): Promise<void> {
        // If note indicates contact left company, mark as INCOMPLETE
        const leftCompanyKeywords = ['quitté', 'parti', 'left', 'no longer'];
        const shouldMarkIncomplete = leftCompanyKeywords.some(keyword =>
            note.toLowerCase().includes(keyword)
        );

        if (shouldMarkIncomplete) {
            await tx.contact.update({
                where: { id: contactId },
                data: { status: 'INCOMPLETE' },
            });
        }
    }

    // ============================================
    // GET ACTIONS WITH FILTERS
    // ============================================
    async getActions(filters: {
        sdrId?: string;
        missionId?: string;
        result?: string;
        from?: Date;
        to?: Date;
        page?: number;
        limit?: number;
    }) {
        const { page = 1, limit = 20, ...where } = filters;
        const skip = (page - 1) * limit;

        const whereClause: any = {};

        if (where.sdrId) whereClause.sdrId = where.sdrId;
        if (where.result) whereClause.result = where.result;
        if (where.missionId) {
            whereClause.campaign = { missionId: where.missionId };
        }
        if (where.from || where.to) {
            whereClause.createdAt = {};
            if (where.from) whereClause.createdAt.gte = where.from;
            if (where.to) whereClause.createdAt.lte = where.to;
        }

        const [actions, total] = await Promise.all([
            prisma.action.findMany({
                where: whereClause,
                include: {
                    contact: {
                        include: { company: true },
                    },
                    sdr: {
                        select: { id: true, name: true },
                    },
                    campaign: {
                        select: { id: true, name: true, missionId: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.action.count({ where: whereClause }),
        ]);

        return { actions, total, page, limit };
    }

    // ============================================
    // STATS CALCULATION
    // ============================================
    async getActionStats(filters: {
        sdrId?: string;
        missionId?: string;
        from?: Date;
        to?: Date;
    }) {
        const whereClause: any = {};

        if (filters.sdrId) whereClause.sdrId = filters.sdrId;
        if (filters.missionId) {
            whereClause.campaign = { missionId: filters.missionId };
        }
        if (filters.from || filters.to) {
            whereClause.createdAt = {};
            if (filters.from) whereClause.createdAt.gte = filters.from;
            if (filters.to) whereClause.createdAt.lte = filters.to;
        }

        const [total, byResult, avgDuration] = await Promise.all([
            prisma.action.count({ where: whereClause }),
            prisma.action.groupBy({
                by: ['result'],
                where: whereClause,
                _count: true,
            }),
            prisma.action.aggregate({
                where: { ...whereClause, duration: { not: null } },
                _avg: { duration: true },
            }),
        ]);

        const resultBreakdown: Record<string, number> = {
            NO_RESPONSE: 0,
            BAD_CONTACT: 0,
            INTERESTED: 0,
            CALLBACK_REQUESTED: 0,
            MEETING_BOOKED: 0,
            DISQUALIFIED: 0,
        };

        byResult.forEach(item => {
            resultBreakdown[item.result] = item._count;
        });

        return {
            total,
            resultBreakdown,
            avgDuration: Math.round(avgDuration._avg.duration || 0),
            conversionRate: total > 0
                ? ((resultBreakdown.MEETING_BOOKED / total) * 100).toFixed(2)
                : '0.00',
        };
    }
}

// Export singleton instance
export const actionService = new ActionService();
