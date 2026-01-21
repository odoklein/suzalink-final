// ============================================
// INTERNAL COMMUNICATION SERVICE
// Business logic for the comms module
// ============================================

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import type { UserRole, Prisma } from "@prisma/client";
import type {
    CommsChannelType,
    CommsThreadStatus,
    CreateThreadRequest,
    CreateMessageRequest,
    CreateGroupRequest,
    UpdateGroupRequest,
    CommsThreadListItem,
    CommsThreadView,
    CommsMessageView,
    CommsGroupView,
    CommsInboxStats,
    CommsInboxFilters,
    BroadcastAudience,
} from "./types";

// ============================================
// CHANNEL MANAGEMENT
// ============================================

/**
 * Get or create a channel for a CRM object.
 * Channels are lazily created when the first thread is started.
 */
export async function getOrCreateChannel(
    type: CommsChannelType,
    anchorId?: string
): Promise<string> {
    // For DIRECT and GROUP types, anchorId handling is different
    if (type === "DIRECT") {
        throw new Error("Use getOrCreateDirectChannel for DIRECT channels");
    }

    const whereClause: Prisma.CommsChannelWhereUniqueInput = {
        ...(type === "MISSION" && anchorId && { missionId: anchorId }),
        ...(type === "CLIENT" && anchorId && { clientId: anchorId }),
        ...(type === "CAMPAIGN" && anchorId && { campaignId: anchorId }),
        ...(type === "GROUP" && anchorId && { groupId: anchorId }),
        ...(type === "BROADCAST" && { type_missionId: { type: "BROADCAST", missionId: null } }),
    };

    // Try to find existing channel
    let channel = await prisma.commsChannel.findFirst({
        where: {
            type,
            ...(type === "MISSION" && { missionId: anchorId }),
            ...(type === "CLIENT" && { clientId: anchorId }),
            ...(type === "CAMPAIGN" && { campaignId: anchorId }),
            ...(type === "GROUP" && { groupId: anchorId }),
            ...(type === "BROADCAST" && { type: "BROADCAST" }),
        },
    });

    if (channel) return channel.id;

    // Create new channel
    channel = await prisma.commsChannel.create({
        data: {
            type,
            ...(type === "MISSION" && { missionId: anchorId }),
            ...(type === "CLIENT" && { clientId: anchorId }),
            ...(type === "CAMPAIGN" && { campaignId: anchorId }),
            ...(type === "GROUP" && { groupId: anchorId }),
        },
    });

    return channel.id;
}

/**
 * Get or create a direct channel between two users.
 * Uses sorted user IDs to ensure consistency.
 */
export async function getOrCreateDirectChannel(
    userId1: string,
    userId2: string
): Promise<string> {
    const sortedIds = [userId1, userId2].sort();

    // Try to find existing channel
    let channel = await prisma.commsChannel.findFirst({
        where: {
            type: "DIRECT",
            directUserIds: { equals: sortedIds },
        },
    });

    if (channel) return channel.id;

    // Create new channel
    channel = await prisma.commsChannel.create({
        data: {
            type: "DIRECT",
            directUserIds: sortedIds,
        },
    });

    return channel.id;
}

// ============================================
// THREAD MANAGEMENT
// ============================================

/**
 * Create a new thread with an initial message.
 */
export async function createThread(
    request: CreateThreadRequest,
    creatorId: string
): Promise<string> {
    let channelId: string;

    // Get or create the appropriate channel
    if (request.channelType === "DIRECT") {
        if (!request.participantIds || request.participantIds.length !== 1) {
            throw new Error("Direct threads require exactly one other participant");
        }
        channelId = await getOrCreateDirectChannel(creatorId, request.participantIds[0]);
    } else if (request.channelType === "BROADCAST") {
        // Broadcasts get their own channel or use a shared broadcast channel
        channelId = await getOrCreateChannel("BROADCAST");
    } else {
        if (!request.anchorId) {
            throw new Error(`${request.channelType} threads require an anchorId`);
        }
        channelId = await getOrCreateChannel(request.channelType, request.anchorId);
    }

    // Determine participants
    let participantIds: string[] = [creatorId];
    if (request.channelType === "DIRECT" && request.participantIds) {
        participantIds = [...participantIds, ...request.participantIds];
    }

    // Create thread with initial message in a transaction
    const thread = await prisma.$transaction(async (tx) => {
        // Create thread
        const newThread = await tx.commsThread.create({
            data: {
                channelId,
                subject: request.subject,
                createdById: creatorId,
                isBroadcast: request.isBroadcast || false,
                broadcastAudience: request.broadcastAudience as Prisma.InputJsonValue,
                messageCount: 1,
                lastMessageAt: new Date(),
                lastMessageById: creatorId,
            },
        });

        // Add participants
        await tx.commsParticipant.createMany({
            data: participantIds.map((userId) => ({
                threadId: newThread.id,
                userId,
                unreadCount: userId === creatorId ? 0 : 1,
            })),
        });

        // Create initial message
        await tx.commsMessage.create({
            data: {
                threadId: newThread.id,
                authorId: creatorId,
                type: request.isBroadcast ? "BROADCAST" : "TEXT",
                content: request.initialMessage,
            },
        });

        return newThread;
    });

    // Send notifications to participants (except creator)
    const otherParticipants = participantIds.filter((id) => id !== creatorId);
    for (const userId of otherParticipants) {
        await createNotification(userId, {
            title: request.isBroadcast ? "Nouvelle annonce" : "Nouvelle discussion",
            message: `${request.subject}`,
            type: "info",
            link: `/comms/threads/${thread.id}`,
        });
    }

    return thread.id;
}

/**
 * Get threads for the current user's inbox.
 */
export async function getInboxThreads(
    userId: string,
    filters: CommsInboxFilters = {},
    page = 1,
    pageSize = 20
): Promise<{ threads: CommsThreadListItem[]; total: number }> {
    const skip = (page - 1) * pageSize;

    // Base where clause - user must be a participant
    const baseWhere: Prisma.CommsThreadWhereInput = {
        participants: {
            some: { userId },
        },
        status: filters.status || { not: "ARCHIVED" },
        ...(filters.type && {
            channel: { type: filters.type },
        }),
        ...(filters.unreadOnly && {
            participants: {
                some: {
                    userId,
                    unreadCount: { gt: 0 },
                },
            },
        }),
        ...(filters.search && {
            OR: [
                { subject: { contains: filters.search, mode: "insensitive" } },
                {
                    messages: {
                        some: {
                            content: { contains: filters.search, mode: "insensitive" },
                        },
                    },
                },
            ],
        }),
    };

    const [threads, total] = await Promise.all([
        prisma.commsThread.findMany({
            where: baseWhere,
            include: {
                channel: true,
                createdBy: { select: { id: true, name: true } },
                participants: {
                    where: { userId },
                    select: { unreadCount: true },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: {
                        author: { select: { name: true } },
                    },
                },
                _count: { select: { participants: true } },
            },
            orderBy: { lastMessageAt: "desc" },
            skip,
            take: pageSize,
        }),
        prisma.commsThread.count({ where: baseWhere }),
    ]);

    return {
        threads: threads.map((thread) => ({
            id: thread.id,
            channelId: thread.channelId,
            channelType: thread.channel.type as CommsChannelType,
            channelName: getChannelName(thread.channel),
            subject: thread.subject,
            status: thread.status as CommsThreadStatus,
            isBroadcast: thread.isBroadcast,
            createdBy: {
                id: thread.createdBy.id,
                name: thread.createdBy.name,
            },
            participantCount: thread._count.participants,
            messageCount: thread.messageCount,
            unreadCount: thread.participants[0]?.unreadCount || 0,
            lastMessage: thread.messages[0]
                ? {
                      content: truncateContent(thread.messages[0].content, 100),
                      authorName: thread.messages[0].author.name,
                      createdAt: thread.messages[0].createdAt.toISOString(),
                  }
                : undefined,
            createdAt: thread.createdAt.toISOString(),
            updatedAt: thread.updatedAt.toISOString(),
        })),
        total,
    };
}

/**
 * Get a single thread with all messages.
 */
export async function getThread(
    threadId: string,
    userId: string
): Promise<CommsThreadView | null> {
    const thread = await prisma.commsThread.findFirst({
        where: {
            id: threadId,
            participants: { some: { userId } },
        },
        include: {
            channel: true,
            createdBy: { select: { id: true, name: true } },
            participants: {
                include: {
                    user: { select: { id: true, name: true, role: true } },
                },
            },
            messages: {
                where: { isDeleted: false },
                orderBy: { createdAt: "asc" },
                include: {
                    author: { select: { id: true, name: true, role: true } },
                    mentions: {
                        include: {
                            user: { select: { id: true, name: true } },
                        },
                    },
                    attachments: true,
                },
            },
        },
    });

    if (!thread) return null;

    // Mark as read
    await prisma.commsParticipant.update({
        where: {
            threadId_userId: { threadId, userId },
        },
        data: {
            lastReadAt: new Date(),
            unreadCount: 0,
        },
    });

    return {
        id: thread.id,
        channelId: thread.channelId,
        channelType: thread.channel.type as CommsChannelType,
        channelName: getChannelName(thread.channel),
        subject: thread.subject,
        status: thread.status as CommsThreadStatus,
        isBroadcast: thread.isBroadcast,
        createdBy: {
            id: thread.createdBy.id,
            name: thread.createdBy.name,
        },
        participantCount: thread.participants.length,
        messageCount: thread.messageCount,
        unreadCount: 0, // Just marked as read
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        participants: thread.participants.map((p) => ({
            id: p.id,
            userId: p.user.id,
            userName: p.user.name,
            userRole: p.user.role,
            lastReadAt: p.lastReadAt?.toISOString(),
            unreadCount: p.unreadCount,
            isMuted: p.isMuted,
            joinedAt: p.joinedAt.toISOString(),
        })),
        messages: thread.messages.map((m) => ({
            id: m.id,
            threadId: m.threadId,
            type: m.type as "TEXT" | "SYSTEM" | "BROADCAST",
            content: m.content,
            author: {
                id: m.author.id,
                name: m.author.name,
                role: m.author.role,
                initials: getInitials(m.author.name),
            },
            mentions: m.mentions.map((mention) => ({
                userId: mention.user.id,
                userName: mention.user.name,
            })),
            attachments: m.attachments.map((a) => ({
                id: a.id,
                filename: a.filename,
                mimeType: a.mimeType,
                size: a.size,
                url: a.url || undefined,
            })),
            isEdited: m.isEdited,
            isDeleted: m.isDeleted,
            isOwnMessage: m.authorId === userId,
            createdAt: m.createdAt.toISOString(),
        })),
    };
}

/**
 * Update thread status.
 */
export async function updateThreadStatus(
    threadId: string,
    status: CommsThreadStatus,
    userId: string
): Promise<void> {
    // Verify user is participant or manager
    const thread = await prisma.commsThread.findFirst({
        where: {
            id: threadId,
            participants: { some: { userId } },
        },
    });

    if (!thread) {
        throw new Error("Thread not found or access denied");
    }

    await prisma.commsThread.update({
        where: { id: threadId },
        data: { status },
    });

    // Add system message
    await prisma.commsMessage.create({
        data: {
            threadId,
            authorId: userId,
            type: "SYSTEM",
            content: `Discussion marquée comme ${status === "RESOLVED" ? "résolue" : "archivée"}`,
        },
    });
}

// ============================================
// MESSAGE MANAGEMENT
// ============================================

/**
 * Add a message to a thread.
 */
export async function addMessage(
    request: CreateMessageRequest,
    authorId: string
): Promise<string> {
    // Verify user is participant
    const participant = await prisma.commsParticipant.findUnique({
        where: {
            threadId_userId: { threadId: request.threadId, userId: authorId },
        },
    });

    if (!participant) {
        throw new Error("You are not a participant in this thread");
    }

    const message = await prisma.$transaction(async (tx) => {
        // Create message
        const newMessage = await tx.commsMessage.create({
            data: {
                threadId: request.threadId,
                authorId,
                content: request.content,
                type: "TEXT",
            },
        });

        // Add mentions if any
        if (request.mentionIds && request.mentionIds.length > 0) {
            await tx.commsMention.createMany({
                data: request.mentionIds.map((userId) => ({
                    messageId: newMessage.id,
                    userId,
                })),
            });
        }

        // Update thread metadata
        await tx.commsThread.update({
            where: { id: request.threadId },
            data: {
                messageCount: { increment: 1 },
                lastMessageAt: new Date(),
                lastMessageById: authorId,
            },
        });

        // Increment unread count for other participants
        await tx.commsParticipant.updateMany({
            where: {
                threadId: request.threadId,
                userId: { not: authorId },
            },
            data: {
                unreadCount: { increment: 1 },
            },
        });

        return newMessage;
    });

    // Send notifications
    const thread = await prisma.commsThread.findUnique({
        where: { id: request.threadId },
        include: {
            participants: {
                where: { userId: { not: authorId }, isMuted: false },
                include: { user: true },
            },
        },
    });

    if (thread) {
        for (const p of thread.participants) {
            await createNotification(p.userId, {
                title: "Nouveau message",
                message: `${thread.subject}: ${truncateContent(request.content, 50)}`,
                type: "info",
                link: `/comms/threads/${request.threadId}`,
            });
        }
    }

    // Notify mentioned users
    if (request.mentionIds) {
        for (const mentionedUserId of request.mentionIds) {
            await createNotification(mentionedUserId, {
                title: "Vous avez été mentionné",
                message: `Dans: ${thread?.subject}`,
                type: "info",
                link: `/comms/threads/${request.threadId}`,
            });
        }
    }

    return message.id;
}

/**
 * Edit a message (only within 5 minutes of creation).
 */
export async function editMessage(
    messageId: string,
    content: string,
    userId: string
): Promise<void> {
    const message = await prisma.commsMessage.findUnique({
        where: { id: messageId },
    });

    if (!message) {
        throw new Error("Message not found");
    }

    if (message.authorId !== userId) {
        throw new Error("You can only edit your own messages");
    }

    // Check if within 5-minute edit window
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.createdAt < fiveMinutesAgo) {
        throw new Error("Messages can only be edited within 5 minutes of posting");
    }

    await prisma.commsMessage.update({
        where: { id: messageId },
        data: {
            content,
            isEdited: true,
            editedAt: new Date(),
        },
    });
}

/**
 * Soft delete a message.
 */
export async function deleteMessage(
    messageId: string,
    userId: string,
    isManager = false
): Promise<void> {
    const message = await prisma.commsMessage.findUnique({
        where: { id: messageId },
    });

    if (!message) {
        throw new Error("Message not found");
    }

    // Only author (within 5 min) or managers can delete
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const canDelete =
        isManager || (message.authorId === userId && message.createdAt >= fiveMinutesAgo);

    if (!canDelete) {
        throw new Error("You cannot delete this message");
    }

    await prisma.commsMessage.update({
        where: { id: messageId },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
            content: "[Message supprimé]",
        },
    });
}

// ============================================
// GROUP MANAGEMENT
// ============================================

/**
 * Create a new communication group.
 */
export async function createGroup(
    request: CreateGroupRequest,
    creatorId: string
): Promise<string> {
    const group = await prisma.$transaction(async (tx) => {
        // Create group
        const newGroup = await tx.commsGroup.create({
            data: {
                name: request.name,
                description: request.description,
                createdById: creatorId,
            },
        });

        // Add creator as admin
        const allMemberIds = [...new Set([creatorId, ...request.memberIds])];
        await tx.commsGroupMember.createMany({
            data: allMemberIds.map((userId) => ({
                groupId: newGroup.id,
                userId,
                role: userId === creatorId ? "admin" : "member",
            })),
        });

        // Create channel for the group
        await tx.commsChannel.create({
            data: {
                type: "GROUP",
                groupId: newGroup.id,
                name: request.name,
            },
        });

        return newGroup;
    });

    return group.id;
}

/**
 * Get groups for a user.
 */
export async function getUserGroups(userId: string): Promise<CommsGroupView[]> {
    const groups = await prisma.commsGroup.findMany({
        where: {
            members: { some: { userId } },
            isActive: true,
        },
        include: {
            createdBy: { select: { id: true, name: true } },
            members: {
                include: {
                    user: { select: { id: true, name: true } },
                },
            },
            _count: { select: { members: true } },
        },
        orderBy: { name: "asc" },
    });

    return groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description || undefined,
        memberCount: g._count.members,
        members: g.members.map((m) => ({
            id: m.id,
            userId: m.user.id,
            userName: m.user.name,
            role: m.role,
        })),
        createdBy: {
            id: g.createdBy.id,
            name: g.createdBy.name,
        },
        createdAt: g.createdAt.toISOString(),
    }));
}

/**
 * Add members to a group.
 */
export async function addGroupMembers(
    groupId: string,
    memberIds: string[],
    requesterId: string
): Promise<void> {
    // Verify requester is admin
    const requesterMembership = await prisma.commsGroupMember.findUnique({
        where: { groupId_userId: { groupId, userId: requesterId } },
    });

    if (!requesterMembership || requesterMembership.role !== "admin") {
        throw new Error("Only group admins can add members");
    }

    await prisma.commsGroupMember.createMany({
        data: memberIds.map((userId) => ({
            groupId,
            userId,
            role: "member",
        })),
        skipDuplicates: true,
    });
}

/**
 * Remove a member from a group.
 */
export async function removeGroupMember(
    groupId: string,
    memberId: string,
    requesterId: string
): Promise<void> {
    // Verify requester is admin
    const requesterMembership = await prisma.commsGroupMember.findUnique({
        where: { groupId_userId: { groupId, userId: requesterId } },
    });

    if (!requesterMembership || requesterMembership.role !== "admin") {
        throw new Error("Only group admins can remove members");
    }

    await prisma.commsGroupMember.delete({
        where: { groupId_userId: { groupId, userId: memberId } },
    });
}

// ============================================
// INBOX STATS
// ============================================

/**
 * Get inbox statistics for a user.
 */
export async function getInboxStats(userId: string): Promise<CommsInboxStats> {
    const [unreadByType, mentionCount] = await Promise.all([
        // Unread counts by channel type
        prisma.$queryRaw<{ type: string; count: bigint }[]>`
            SELECT cc.type, COUNT(DISTINCT ct.id)::bigint as count
            FROM "CommsThread" ct
            JOIN "CommsChannel" cc ON ct."channelId" = cc.id
            JOIN "CommsParticipant" cp ON ct.id = cp."threadId"
            WHERE cp."userId" = ${userId}
              AND cp."unreadCount" > 0
              AND ct.status != 'ARCHIVED'
            GROUP BY cc.type
        `,
        // Unread mention count
        prisma.commsMention.count({
            where: {
                userId,
                notified: false,
            },
        }),
    ]);

    const unreadMap: Record<CommsChannelType, number> = {
        MISSION: 0,
        CLIENT: 0,
        CAMPAIGN: 0,
        GROUP: 0,
        DIRECT: 0,
        BROADCAST: 0,
    };

    let totalUnread = 0;
    for (const row of unreadByType) {
        const count = Number(row.count);
        unreadMap[row.type as CommsChannelType] = count;
        totalUnread += count;
    }

    return {
        totalUnread,
        unreadByType: unreadMap,
        mentionCount,
    };
}

// ============================================
// VISIBILITY HELPERS
// ============================================

/**
 * Check if a user can access threads for a given CRM object.
 */
export async function canAccessChannel(
    userId: string,
    userRole: UserRole,
    channelType: CommsChannelType,
    anchorId?: string
): Promise<boolean> {
    // Managers can access everything
    if (userRole === "MANAGER") return true;

    switch (channelType) {
        case "MISSION":
            // SDRs can access if assigned to mission
            if (userRole === "SDR") {
                const assignment = await prisma.sDRAssignment.findFirst({
                    where: { missionId: anchorId, sdrId: userId },
                });
                return !!assignment;
            }
            // BDs can access if client is in portfolio
            if (userRole === "BUSINESS_DEVELOPER") {
                const mission = await prisma.mission.findUnique({
                    where: { id: anchorId },
                    include: {
                        client: {
                            include: {
                                bdAssignments: { where: { bdUserId: userId } },
                            },
                        },
                    },
                });
                return (mission?.client?.bdAssignments?.length ?? 0) > 0;
            }
            return false;

        case "CLIENT":
            // Only BDs with client in portfolio or Managers
            if (userRole === "BUSINESS_DEVELOPER") {
                const bdClient = await prisma.businessDeveloperClient.findFirst({
                    where: { bdUserId: userId, clientId: anchorId },
                });
                return !!bdClient;
            }
            return false;

        case "CAMPAIGN":
            // SDRs if assigned to parent mission
            if (userRole === "SDR") {
                const campaign = await prisma.campaign.findUnique({
                    where: { id: anchorId },
                    include: {
                        mission: {
                            include: {
                                sdrAssignments: { where: { sdrId: userId } },
                            },
                        },
                    },
                });
                return (campaign?.mission?.sdrAssignments?.length ?? 0) > 0;
            }
            // BDs with client in portfolio
            if (userRole === "BUSINESS_DEVELOPER") {
                const campaign = await prisma.campaign.findUnique({
                    where: { id: anchorId },
                    include: {
                        mission: {
                            include: {
                                client: {
                                    include: {
                                        bdAssignments: { where: { bdUserId: userId } },
                                    },
                                },
                            },
                        },
                    },
                });
                return (campaign?.mission?.client?.bdAssignments?.length ?? 0) > 0;
            }
            return false;

        case "DIRECT":
        case "GROUP":
            // Handled by participant check in thread queries
            return true;

        case "BROADCAST":
            // Everyone can read broadcasts
            return true;

        default:
            return false;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getChannelName(channel: {
    type: string;
    name?: string | null;
    missionId?: string | null;
    clientId?: string | null;
    campaignId?: string | null;
}): string {
    if (channel.name) return channel.name;
    
    // Return a placeholder - in real usage, we'd join to get the actual name
    switch (channel.type) {
        case "MISSION":
            return "Mission";
        case "CLIENT":
            return "Client";
        case "CAMPAIGN":
            return "Campagne";
        case "DIRECT":
            return "Message direct";
        case "BROADCAST":
            return "Annonces";
        case "GROUP":
            return "Groupe";
        default:
            return "Discussion";
    }
}

function truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength - 3) + "...";
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
        .substring(0, 2);
}
