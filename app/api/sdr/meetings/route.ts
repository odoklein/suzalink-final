import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================
// GET /api/sdr/meetings
// Fetch meetings booked by the current SDR
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

        const meetings = await prisma.action.findMany({
            where: {
                sdrId: session.user.id,
                result: "MEETING_BOOKED",
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        title: true,
                        email: true,
                        company: {
                            select: {
                                name: true,
                            }
                        }
                    }
                },
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
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json({
            success: true,
            data: meetings,
        });

    } catch (error) {
        console.error("Error fetching SDR meetings:", error);
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
