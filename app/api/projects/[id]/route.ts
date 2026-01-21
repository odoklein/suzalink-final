import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/projects/[id] - Get project details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const { id } = await params;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                client: { select: { id: true, name: true } },
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, role: true } },
                    },
                },
                tasks: {
                    include: {
                        assignee: { select: { id: true, name: true } },
                        createdBy: { select: { id: true, name: true } },
                        _count: { select: { comments: true } },
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: "Projet non trouvé" }, { status: 404 });
        }

        // Check access
        const isMember = project.members.some((m) => m.userId === session.user.id);
        const isOwner = project.ownerId === session.user.id;
        const role = session.user.role;

        if (!isMember && !isOwner && role !== "MANAGER") {
            return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 });
        }

        return NextResponse.json({ success: true, data: project });
    } catch (error) {
        console.error("GET /api/projects/[id] error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { name, description, status, clientId } = body;

        const project = await prisma.project.findUnique({
            where: { id },
            include: { members: true },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: "Projet non trouvé" }, { status: 404 });
        }

        // Only owner, admins, or managers can update
        const isOwner = project.ownerId === session.user.id;
        const isAdmin = project.members.some((m) => m.userId === session.user.id && m.role === "admin");
        const isManager = session.user.role === "MANAGER";

        if (!isOwner && !isAdmin && !isManager) {
            return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 });
        }

        const updated = await prisma.project.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(status && { status }),
                ...(clientId !== undefined && { clientId: clientId || null }),
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                client: { select: { id: true, name: true } },
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                },
            },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error("PATCH /api/projects/[id] error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const { id } = await params;

        const project = await prisma.project.findUnique({
            where: { id },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: "Projet non trouvé" }, { status: 404 });
        }

        // Only owner or managers can delete
        if (project.ownerId !== session.user.id && session.user.role !== "MANAGER") {
            return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 });
        }

        await prisma.project.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/projects/[id] error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}
