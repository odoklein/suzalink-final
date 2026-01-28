import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================
// POST /api/sdr/activity/pause - Pause current session
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

        // Only SDRs and BUSINESS_DEVELOPERs can pause their own activity
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

        // Get today's activity record
        const activity = await prisma.crmActivityDay.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: today,
                },
            },
        });

        if (!activity || !activity.currentSessionStartedAt) {
            // No active session to pause
            return NextResponse.json({
                success: true,
                data: {
                    isActive: false,
                    totalActiveSecondsToday: activity?.totalActiveSeconds || 0,
                },
            });
        }

        // Calculate session duration and add to total
        const sessionDuration = now.getTime() - activity.currentSessionStartedAt.getTime();
        const sessionSeconds = Math.floor(sessionDuration / 1000);

        const updated = await prisma.crmActivityDay.update({
            where: { id: activity.id },
            data: {
                totalActiveSeconds: activity.totalActiveSeconds + sessionSeconds,
                currentSessionStartedAt: null,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                isActive: false,
                totalActiveSecondsToday: updated.totalActiveSeconds,
            },
        });

    } catch (error) {
        console.error("[POST /api/sdr/activity/pause] Error:", error);
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
