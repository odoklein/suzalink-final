import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTaskReassignmentNotification } from "@/lib/notifications";

// GET /api/tasks/[id] - Get task details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const { id } = await params;

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                project: {
                    include: {
                        members: true,
                    },
                },
                assignee: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true } },
                comments: {
                    include: {
                        user: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!task) {
            return NextResponse.json({ success: false, error: "Tâche non trouvée" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: task });
    } catch (error) {
        console.error("GET /api/tasks/[id] error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}

// PATCH /api/tasks/[id] - Update task
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { title, description, status, priority, dueDate, assigneeId } = body;

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                project: { include: { members: true } },
            },
        });

        if (!task) {
            return NextResponse.json({ success: false, error: "Tâche non trouvée" }, { status: 404 });
        }

        // Store previous assignee to detect reassignment
        const previousAssigneeId = task.assigneeId;

        const updated = await prisma.task.update({
            where: { id },
            data: {
                ...(title && { title: title.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(status && { status }),
                ...(priority && { priority }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
            },
            include: {
                project: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true } },
            },
        });

        // Create notification for new assignee (if changed and not self-assignment)
        if (
            assigneeId !== undefined &&
            assigneeId !== previousAssigneeId &&
            assigneeId !== session.user.id &&
            assigneeId // not null
        ) {
            await createTaskReassignmentNotification({
                assigneeId,
                taskTitle: updated.title,
                projectName: updated.project.name,
                assignedByName: session.user.name || "Un utilisateur",
            });
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error("PATCH /api/tasks/[id] error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const { id } = await params;

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                project: { include: { members: true } },
            },
        });

        if (!task) {
            return NextResponse.json({ success: false, error: "Tâche non trouvée" }, { status: 404 });
        }

        // Check if user can delete (creator, assignee, project admin/owner, or manager)
        const isCreator = task.createdById === session.user.id;
        const isAssignee = task.assigneeId === session.user.id;
        const isProjectOwner = task.project.ownerId === session.user.id;
        const isProjectAdmin = task.project.members.some(
            (m) => m.userId === session.user.id && ["owner", "admin"].includes(m.role)
        );
        const isManager = session.user.role === "MANAGER";

        if (!isCreator && !isAssignee && !isProjectOwner && !isProjectAdmin && !isManager) {
            return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 });
        }

        await prisma.task.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/tasks/[id] error:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}
