// ============================================
// GET /api/sdr/emails/sent
// List emails sent by current SDR in mission context (with open/click stats)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Non autorisé" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const missionId = searchParams.get("missionId");

        const where = {
            direction: "OUTBOUND" as const,
            sentById: session.user.id,
            missionId: missionId?.trim() ? missionId.trim() : { not: null },
        };

        const emails = await prisma.email.findMany({
            where,
            orderBy: { sentAt: "desc" },
            take: 100,
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        company: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                mission: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                template: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: emails,
        });
    } catch (error) {
        console.error("GET /api/sdr/emails/sent error:", error);
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
