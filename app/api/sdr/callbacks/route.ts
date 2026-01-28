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

        // Fetch callbacks with callbackDate filtering
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const callbacks = await prisma.action.findMany({
            where: {
                sdrId: session.user.id,
                result: "CALLBACK_REQUESTED",
                // Show callbacks for today and past (overdue), or NULL dates (legacy)
                OR: [
                    { callbackDate: null },
                    { callbackDate: { lte: new Date() } },
                ],
            },
            include: {
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
