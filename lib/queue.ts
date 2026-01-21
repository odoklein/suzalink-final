import { prisma } from './prisma';

// ============================================
// ACTION QUEUE LOGIC
// ============================================

export type QueuePriority = 'CALLBACK' | 'FOLLOW_UP' | 'NEW' | 'RETRY';

export interface QueueConfig {
    cooldownHours: {
        CALL: number;
        EMAIL: number;
        LINKEDIN: number;
    };
    maxRetries: number;
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
    cooldownHours: {
        CALL: 24,
        EMAIL: 72,
        LINKEDIN: 168, // 7 days
    },
    maxRetries: 3,
};

// ============================================
// GET NEXT ACTION FROM QUEUE
// ============================================

export interface QueueResult {
    hasNext: boolean;
    priority?: QueuePriority;
    contactId?: string;
    companyId?: string;
    campaignId?: string;
    channel?: string;
    script?: string | null;
    lastActionNote?: string | null;
    message?: string;
}

export async function getNextFromQueue(
    sdrId: string,
    missionId?: string,
    config: QueueConfig = DEFAULT_QUEUE_CONFIG
): Promise<QueueResult> {
    // Get SDR's assigned contacts
    const assignments = await prisma.sDRAssignment.findMany({
        where: { sdrId },
        include: {
            mission: {
                where: { isActive: true, ...(missionId && { id: missionId }) },
                include: {
                    campaigns: { where: { isActive: true } },
                    lists: {
                        include: {
                            companies: {
                                include: {
                                    contacts: {
                                        where: { status: { not: 'INCOMPLETE' } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    // Collect all contact IDs and mission data
    const contactInfo: Map<string, {
        campaignId: string;
        channel: 'CALL' | 'EMAIL' | 'LINKEDIN';
        script: string | null;
    }> = new Map();

    for (const assignment of assignments) {
        const mission = assignment.mission;
        if (!mission) continue;

        const campaign = mission.campaigns[0];
        if (!campaign) continue;

        for (const list of mission.lists) {
            for (const company of list.companies) {
                for (const contact of company.contacts) {
                    contactInfo.set(contact.id, {
                        campaignId: campaign.id,
                        channel: mission.channel,
                        script: campaign.script,
                    });
                }
            }
        }
    }

    if (contactInfo.size === 0) {
        return { hasNext: false, message: 'Aucun contact disponible' };
    }

    const contactIds = Array.from(contactInfo.keys());

    // Get action history for these contacts
    const allActions = await prisma.action.findMany({
        where: { contactId: { in: contactIds } },
        orderBy: { createdAt: 'desc' },
    });

    // Group actions by contact
    const actionsByContact: Map<string, typeof allActions> = new Map();
    for (const action of allActions) {
        const existing = actionsByContact.get(action.contactId) || [];
        existing.push(action);
        actionsByContact.set(action.contactId, existing);
    }

    // Calculate cooldown threshold based on average channel
    const now = new Date();

    // PRIORITY 1: Callbacks requested (past cooldown)
    for (const contactId of contactIds) {
        const actions = actionsByContact.get(contactId) || [];
        const lastAction = actions[0];

        if (lastAction?.result === 'CALLBACK_REQUESTED') {
            const info = contactInfo.get(contactId)!;
            const cooldownMs = config.cooldownHours[info.channel] * 60 * 60 * 1000;
            const cooldownEnd = new Date(lastAction.createdAt.getTime() + cooldownMs);

            if (now >= cooldownEnd) {
                return {
                    hasNext: true,
                    priority: 'CALLBACK',
                    contactId,
                    ...info,
                    lastActionNote: lastAction.note,
                };
            }
        }
    }

    // PRIORITY 2: Interested (follow-up)
    for (const contactId of contactIds) {
        const actions = actionsByContact.get(contactId) || [];
        const lastAction = actions[0];

        if (lastAction?.result === 'INTERESTED') {
            const info = contactInfo.get(contactId)!;
            const cooldownMs = config.cooldownHours[info.channel] * 60 * 60 * 1000;
            const cooldownEnd = new Date(lastAction.createdAt.getTime() + cooldownMs);

            if (now >= cooldownEnd) {
                return {
                    hasNext: true,
                    priority: 'FOLLOW_UP',
                    contactId,
                    ...info,
                    lastActionNote: lastAction.note,
                };
            }
        }
    }

    // PRIORITY 3: New contacts (never touched)
    for (const contactId of contactIds) {
        const actions = actionsByContact.get(contactId) || [];

        if (actions.length === 0) {
            const info = contactInfo.get(contactId)!;
            return {
                hasNext: true,
                priority: 'NEW',
                contactId,
                ...info,
            };
        }
    }

    // PRIORITY 4: No response (retry after cooldown, max retries)
    for (const contactId of contactIds) {
        const actions = actionsByContact.get(contactId) || [];
        const lastAction = actions[0];
        const noResponseCount = actions.filter(a => a.result === 'NO_RESPONSE').length;

        if (lastAction?.result === 'NO_RESPONSE' && noResponseCount < config.maxRetries) {
            const info = contactInfo.get(contactId)!;
            const cooldownMs = config.cooldownHours[info.channel] * 60 * 60 * 1000;
            const cooldownEnd = new Date(lastAction.createdAt.getTime() + cooldownMs);

            if (now >= cooldownEnd) {
                return {
                    hasNext: true,
                    priority: 'RETRY',
                    contactId,
                    ...info,
                    lastActionNote: lastAction.note,
                };
            }
        }
    }

    return { hasNext: false, message: 'Queue vide - tous les contacts sont traités ou en cooldown' };
}

// ============================================
// QUEUE STATISTICS
// ============================================

export async function getQueueStats(sdrId: string, missionId?: string): Promise<{
    total: number;
    callbacks: number;
    followUps: number;
    newContacts: number;
    retries: number;
    completed: number;
}> {
    // Simplified stats - could be optimized with raw SQL for large datasets
    const assignments = await prisma.sDRAssignment.findMany({
        where: { sdrId, ...(missionId && { missionId }) },
        include: {
            mission: {
                where: { isActive: true },
                include: {
                    lists: {
                        include: {
                            companies: {
                                include: {
                                    contacts: { select: { id: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    const contactIds: string[] = [];
    for (const a of assignments) {
        if (!a.mission) continue;
        for (const list of a.mission.lists) {
            for (const company of list.companies) {
                for (const contact of company.contacts) {
                    contactIds.push(contact.id);
                }
            }
        }
    }

    if (contactIds.length === 0) {
        return { total: 0, callbacks: 0, followUps: 0, newContacts: 0, retries: 0, completed: 0 };
    }

    const actions = await prisma.action.findMany({
        where: { contactId: { in: contactIds } },
        select: { contactId: true, result: true },
    });

    const lastResultByContact: Map<string, string> = new Map();
    for (const action of actions) {
        if (!lastResultByContact.has(action.contactId)) {
            lastResultByContact.set(action.contactId, action.result);
        }
    }

    const stats = {
        total: contactIds.length,
        callbacks: 0,
        followUps: 0,
        newContacts: 0,
        retries: 0,
        completed: 0,
    };

    for (const contactId of contactIds) {
        const lastResult = lastResultByContact.get(contactId);

        if (!lastResult) {
            stats.newContacts++;
        } else if (lastResult === 'CALLBACK_REQUESTED') {
            stats.callbacks++;
        } else if (lastResult === 'INTERESTED') {
            stats.followUps++;
        } else if (lastResult === 'NO_RESPONSE') {
            stats.retries++;
        } else {
            stats.completed++;
        }
    }

    return stats;
}
