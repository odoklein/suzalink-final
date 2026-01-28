import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================
// POST /api/sdr/activity/heartbeat - Update last activity
// Also handles auto-pause if last activity was > 5 min ago
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

        // Only SDRs and BUSINESS_DEVELOPERs can send heartbeat
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
        const FIVE_MINUTES_MS = 5 * 60 * 1000;

        // Get today's activity record
        let activity = await prisma.crmActivityDay.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: today,
                },
            },
        });

        if (!activity) {
            // No activity record yet, create one and start session
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
            // Check if we need to auto-pause (last activity was > 5 min ago)
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
                            lastActivityAt: now,
                        },
                    });
                } else {
                    // Just update lastActivityAt
                    activity = await prisma.crmActivityDay.update({
                        where: { id: activity.id },
                        data: {
                            lastActivityAt: now,
                        },
                    });
                }
            } else {
                // No active session, just update lastActivityAt
                activity = await prisma.crmActivityDay.update({
                    where: { id: activity.id },
                    data: {
                        lastActivityAt: now,
                    },
                });
            }
        }

        const isActive = activity.currentSessionStartedAt !== null && 
                       activity.lastActivityAt !== null &&
                       (now.getTime() - activity.lastActivityAt.getTime()) < FIVE_MINUTES_MS;

        // Re-fetch to get updated totalActiveSeconds after potential auto-pause
        const updatedActivity = await prisma.crmActivityDay.findUnique({
            where: { id: activity.id },
        });

        return NextResponse.json({
            success: true,
            data: {
                isActive,
                totalActiveSecondsToday: updatedActivity?.totalActiveSeconds || activity.totalActiveSeconds,
                currentSessionStartedAt: updatedActivity?.currentSessionStartedAt?.toISOString() || null,
            },
        });

    } catch (error) {
        console.error("[POST /api/sdr/activity/heartbeat] Error:", error);
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
