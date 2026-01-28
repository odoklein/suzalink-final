import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================
// POST /api/sdr/activity/start - Start activity session
// ============================================

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Non autorisé" },
                { status: 401 }
            );
        }

        // Only SDRs and BUSINESS_DEVELOPERs can start their own activity
        if (!["SDR", "BUSINESS_DEVELOPER"].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: "Non autorisé" },
                { status: 403 }
            );
        }

        const userId = session.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const now = new Date();

        // Get or create today's activity record
        let activity = await prisma.crmActivityDay.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: today,
                },
            },
        });

        if (!activity) {
            activity = await prisma.crmActivityDay.create({
                data: {
                    userId,
                    date: today,
                    totalActiveSeconds: 0,
                    currentSessionStartedAt: now,
                    lastActivityAt: now,
                },
            });
        } else {
            // If already started, just update lastActivityAt (idempotent)
            if (!activity.currentSessionStartedAt) {
                activity = await prisma.crmActivityDay.update({
                    where: { id: activity.id },
                    data: {
                        currentSessionStartedAt: now,
                        lastActivityAt: now,
                    },
                });
            } else {
                // Already started, just update lastActivityAt
                activity = await prisma.crmActivityDay.update({
                    where: { id: activity.id },
                    data: {
                        lastActivityAt: now,
                    },
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                isActive: true,
                totalActiveSecondsToday: activity.totalActiveSeconds,
                currentSessionStartedAt: activity.currentSessionStartedAt?.toISOString(),
            },
        });

    } catch (error) {
        console.error("[POST /api/sdr/activity/start] Error:", error);
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
