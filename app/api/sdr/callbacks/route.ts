import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================
// GET /api/sdr/callbacks
// Fetch pending callbacks for the current SDR or BD.
// BD sees callbacks by mission (campaign.missionId), not by SDR assignment:
// if an SDR is reassigned/removed, their past callbacks remain visible to BD
// because they are tied to the mission.
// ============================================

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Non autorisé" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "100", 10)), 200);
        const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));

        const userRole = (session.user as { role?: string }).role;
        const isBusinessDeveloper = userRole === "BUSINESS_DEVELOPER";

        // BD: scope by missions they are assigned to (callbacks are mission-scoped)
        let missionIds: string[] = [];
        if (isBusinessDeveloper) {
            const assignments = await prisma.sDRAssignment.findMany({
                where: { sdrId: session.user.id },
                select: { missionId: true },
            });
            missionIds = assignments.map((a) => a.missionId);
        }

        const whereClause: {
            sdrId?: string;
            result: "CALLBACK_REQUESTED";
            OR: Array<{ callbackDate: null } | { callbackDate: { lte: Date } }>;
            campaign?: { missionId: { in: string[] } };
        } = {
            result: "CALLBACK_REQUESTED",
            OR: [
                { callbackDate: null },
                { callbackDate: { lte: new Date() } },
            ],
        };

        if (isBusinessDeveloper) {
            if (missionIds.length === 0) {
                return NextResponse.json({ success: true, data: [] });
            }
            whereClause.campaign = { missionId: { in: missionIds } };
        } else {
            whereClause.sdrId = session.user.id;
        }

        const callbacks = await prisma.action.findMany({
            where: whereClause,
            skip,
            take: limit,
            include: {
                sdr: isBusinessDeveloper
                    ? { select: { id: true, name: true } }
                    : false,
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        title: true,
                        phone: true,
                        email: true,
                        company: {
                            select: {
                                name: true,
                            }
                        }
                    }
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    }
                },
                campaign: {
                    select: {
                        id: true,
                        name: true,
                        mission: {
                            select: {
                                id: true,
                                name: true,
                                client: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [
                { callbackDate: 'asc' },
                { createdAt: 'desc' },
            ]
        });

        // Pending = CALLBACK_REQUESTED and (callbackDate null or <= now) and no newer action
        // for same contact/company. Any newer action supersedes (INTERESTED, MEETING_BOOKED,
        // DISQUALIFIED, or another CALLBACK_REQUESTED) to avoid stale callbacks.
        type CallbackItem = {
            id: string;
            createdAt: Date;
            callbackDate: Date | null;
            note: string | null;
            contact: typeof callbacks[0]["contact"];
            company: typeof callbacks[0]["company"];
            mission: { id: string; name: string; client: { name: string } } | null;
            sdr?: { id: string; name: string | null };
        };
        const activeCallbacks: CallbackItem[] = [];

        for (const action of callbacks) {
            let newerAction: { id: string } | null = null;
            if (action.contactId) {
                newerAction = await prisma.action.findFirst({
                    where: {
                        contactId: action.contactId,
                        createdAt: { gt: action.createdAt },
                    },
                    select: { id: true },
                });
            } else if (action.companyId) {
                newerAction = await prisma.action.findFirst({
                    where: {
                        companyId: action.companyId,
                        createdAt: { gt: action.createdAt },
                    },
                    select: { id: true },
                });
            }
            if (newerAction) continue;

            const item: CallbackItem = {
                id: action.id,
                createdAt: action.createdAt,
                callbackDate: action.callbackDate,
                note: action.note,
                contact: action.contact,
                company: action.company,
                mission: action.campaign?.mission ? {
                    id: action.campaign.mission.id || action.campaignId,
                    name: action.campaign.mission.name,
                    client: action.campaign.mission.client,
                } : null,
            };
            if (isBusinessDeveloper && action.sdr) {
                item.sdr = { id: action.sdr.id, name: action.sdr.name };
            }
            activeCallbacks.push(item);
        }

        return NextResponse.json({
            success: true,
            data: activeCallbacks,
            pagination: { limit, skip, hasMore: callbacks.length === limit },
        });

    } catch (error) {
        console.error("Error fetching SDR callbacks:", error);
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
