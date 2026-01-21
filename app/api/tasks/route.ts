import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTaskAssignmentNotification } from "@/lib/notifications";

// GET /api/tasks - List tasks
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const userId = session.user.id;
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");
        const status = searchParams.get("status");
        const assigneeId = searchParams.get("assigneeId");

        // Build where clause
        let whereClause: any = {};

        if (projectId) {
            whereClause.projectId = projectId;
        }

        if (status) {
            whereClause.status = status;
        }

        if (assigneeId) {
            whereClause.assigneeId = assigneeId;
        } else {
            // By default, show tasks assigned to user or created by user
            whereClause.OR = [
                { assigneeId: userId },
                { createdById: userId },
            ];
        }

        const tasks = await prisma.task.findMany({
            where: whereClause,
            include: {
                project: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true } },
                _count: { select: { comments: true } },
            },
            orderBy: [
                { priority: "desc" },
                { dueDate: "asc" },
                { createdAt: "desc" },
            ],
        });

        return NextResponse.json({ success: true, data: tasks });
    } catch (error) {
        console.error("GET /api/tasks error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}

// POST /api/tasks - Create task
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const body = await req.json();
        const { projectId, title, description, priority, dueDate, assigneeId } = body;

        if (!projectId) {
            return NextResponse.json({ success: false, error: "Projet requis" }, { status: 400 });
        }

        if (!title?.trim()) {
            return NextResponse.json({ success: false, error: "Titre requis" }, { status: 400 });
        }

        // Check project access
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: true },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: "Projet non trouvé" }, { status: 404 });
        }

        const isMember = project.members.some((m) => m.userId === session.user.id);
        const isOwner = project.ownerId === session.user.id;
        const isManager = session.user.role === "MANAGER";

        if (!isMember && !isOwner && !isManager) {
            return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title: title.trim(),
                description: description?.trim() || null,
                priority: priority || "MEDIUM",
                dueDate: dueDate ? new Date(dueDate) : null,
                assigneeId: assigneeId || null,
                createdById: session.user.id,
            },
            include: {
                project: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true } },
            },
        });

        // Create notification for assignee (if different from creator)
        if (assigneeId && assigneeId !== session.user.id) {
            await createTaskAssignmentNotification({
                assigneeId,
                taskTitle: task.title,
                projectName: task.project.name,
                assignedByName: session.user.name || "Un utilisateur",
            });
        }

        return NextResponse.json({ success: true, data: task });
    } catch (error) {
        console.error("POST /api/tasks error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}
