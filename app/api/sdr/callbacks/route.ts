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

        const callbacks = await prisma.action.findMany({
            where: {
                sdrId: session.user.id,
                result: "CALLBACK_REQUESTED",
                // We want callbacks that haven't been completed yet.
                // Logic: Action is a historical record. A "Callback requested" action means a callback IS requested.
                // Ideally we should check if a SUBSEQUENT action exists for this contact?
                // Or maybe we treat the "action" as the todo item itself if it's not marked done?
                // The current schema treats actions as logs.
                // Simple logic: return all actions with CALLBACK_REQUESTED from the last 30 days that don't have a newer action on the same contact.
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

        // Filter out callbacks that have been handled (i.e. have a newer action)
        // This is a bit expensive in memory but safer than complex SQL for now
        // A better approach would be to have a "status" on the callback, or a separate "Task" model.
        // For now, let's just return them. The "Action" page handles the "Next Action" logic more robustly.
        // Refinement: check if the contact has any action NEWER than this one.

        // Optimization: We can do this in the query if we really want, but let's do it in JS for speed of impl.
        const activeCallbacks = [];

        for (const action of callbacks) {
            const newerAction = await prisma.action.findFirst({
                where: {
                    contactId: action.contactId,
                    createdAt: {
                        gt: action.createdAt
                    }
                }
            });

            if (!newerAction) {
                activeCallbacks.push(action);
            }
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
