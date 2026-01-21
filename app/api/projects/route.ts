import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/projects - List projects
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const userId = session.user.id;
        const role = session.user.role;

        // Build where clause based on role
        let whereClause: any = {};

        if (role === "MANAGER" || role === "DEVELOPER") {
            // Managers and Developers see all projects they own or are members of
            whereClause = {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            };
        } else if (role === "SDR") {
            // SDRs only see projects they're members of
            whereClause = {
                members: { some: { userId } },
            };
        } else if (role === "CLIENT") {
            // Clients see only their own projects
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { clientId: true },
            });
            if (user?.clientId) {
                whereClause = { clientId: user.clientId };
            } else {
                whereClause = { id: "none" }; // No projects
            }
        }

        const projects = await prisma.project.findMany({
            where: whereClause,
            include: {
                owner: { select: { id: true, name: true, email: true } },
                client: { select: { id: true, name: true } },
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                },
                _count: {
                    select: { tasks: true },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json({ success: true, data: projects });
    } catch (error) {
        console.error("GET /api/projects error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}

// POST /api/projects - Create project
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const role = session.user.role;
        if (!["MANAGER", "DEVELOPER"].includes(role || "")) {
            return NextResponse.json({ success: false, error: "Rôle non autorisé" }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, clientId, members } = body;

        if (!name?.trim()) {
            return NextResponse.json({ success: false, error: "Nom requis" }, { status: 400 });
        }

        const project = await prisma.project.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                ownerId: session.user.id,
                clientId: clientId || null,
                members: {
                    create: [
                        // Add owner as member with owner role
                        { userId: session.user.id, role: "owner" },
                        // Add additional members
                        ...(members || []).map((m: { userId: string; role?: string }) => ({
                            userId: m.userId,
                            role: m.role || "member",
                        })),
                    ],
                },
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                client: { select: { id: true, name: true } },
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                },
                _count: {
                    select: { tasks: true },
                },
            },
        });

        return NextResponse.json({ success: true, data: project });
    } catch (error) {
        console.error("POST /api/projects error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}
