import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================
// GET /api/sdr/callbacks
// Fetch pending callbacks for the current SDR
// ============================================

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Non autorisé" },
                { status: 401 }
            );
        }

        const userRole = (session.user as { role?: string }).role;
        const isBusinessDeveloper = userRole === "BUSINESS_DEVELOPER";

        // BUSINESS_DEVELOPER: scope by assigned missions (all SDRs' callbacks on those missions)
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

        // Filter out callbacks that have been handled
        const activeCallbacks = [];

        for (const action of callbacks) {
            // Only check if contact exists
            if (action.contactId) {
                const newerAction = await prisma.action.findFirst({
                    where: {
                        contactId: action.contactId,
                        createdAt: {
                            gt: action.createdAt
                        }
                    }
                });

                if (newerAction) continue;
            } else if (action.companyId) {
                // Check for newer company actions
                const newerAction = await prisma.action.findFirst({
                    where: {
                        companyId: action.companyId,
                        createdAt: {
                            gt: action.createdAt
                        }
                    }
                });

                if (newerAction) continue;
            }

            activeCallbacks.push({
                id: action.id,
                createdAt: action.createdAt,
                callbackDate: action.callbackDate,
                note: action.note || undefined,
                contact: action.contact,
                company: action.company,
                mission: action.campaign?.mission ? {
                    id: action.campaign.mission.id || action.campaignId,
                    name: action.campaign.mission.name,
                    client: action.campaign.mission.client,
                } : null,
                ...(isBusinessDeveloper && "sdr" in action && action.sdr
                    ? { sdr: { id: action.sdr.id, name: action.sdr.name } }
                    : {}),
            });
        }

        return NextResponse.json({
            success: true,
            data: activeCallbacks,
        });

    } catch (error) {
        console.error("Error fetching SDR callbacks:", error);
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
