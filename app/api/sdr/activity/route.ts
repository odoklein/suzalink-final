import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================
// GET /api/sdr/activity - Get activity status
// For SDR: returns own status
// For Manager: ?userId=XXX returns that user's status
// ============================================

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Non autorisé" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const targetUserId = searchParams.get("userId");

        // If userId is provided, require MANAGER role
        if (targetUserId && session.user.role !== "MANAGER") {
            return NextResponse.json(
                { success: false, error: "Non autorisé" },
                { status: 403 }
            );
        }

        const userId = targetUserId || session.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
                    currentSessionStartedAt: null,
                    lastActivityAt: null,
                },
            });
        }

        // Auto-pause check: if session is active but lastActivityAt is > 5 min ago, pause it
        const now = new Date();
        const FIVE_MINUTES_MS = 5 * 60 * 1000;

        if (activity.currentSessionStartedAt && activity.lastActivityAt) {
            const timeSinceLastActivity = now.getTime() - activity.lastActivityAt.getTime();
            
            if (timeSinceLastActivity >= FIVE_MINUTES_MS) {
                // Auto-pause: add elapsed time to total
                const sessionDuration = activity.lastActivityAt.getTime() - activity.currentSessionStartedAt.getTime();
                const sessionSeconds = Math.floor(sessionDuration / 1000);

                activity = await prisma.crmActivityDay.update({
                    where: { id: activity.id },
                    data: {
                        totalActiveSeconds: activity.totalActiveSeconds + sessionSeconds,
                        currentSessionStartedAt: null,
                    },
                });
            }
        }

        const isActive = activity.currentSessionStartedAt !== null && 
                       activity.lastActivityAt !== null &&
                       (now.getTime() - activity.lastActivityAt.getTime()) < FIVE_MINUTES_MS;

        return NextResponse.json({
            success: true,
            data: {
                isActive,
                totalActiveSecondsToday: activity.totalActiveSeconds,
                currentSessionStartedAt: activity.currentSessionStartedAt?.toISOString() || null,
                lastActivityAt: activity.lastActivityAt?.toISOString() || null,
            },
        });

    } catch (error) {
        console.error("[GET /api/sdr/activity] Error:", error);
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
