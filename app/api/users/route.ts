import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    successResponse,
    errorResponse,
    requireRole,
    requireAuth,
    withErrorHandler,
    validateRequest,
    getPaginationParams,
} from '@/lib/api-utils';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// ============================================
// GET /api/users - List users
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
    // Allow all authenticated users to search (needed for direct messages)
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);

    const roleFilter = searchParams.get('role');
    const search = searchParams.get('search');
    const excludeSelf = searchParams.get('excludeSelf') !== 'false'; // Default to true for backward compatibility

    const where: any = {};
    const statusFilter = searchParams.get('status'); // 'active', 'inactive', 'all'

    if (roleFilter) {
        if (roleFilter.includes(',')) {
            where.role = { in: roleFilter.split(',') };
        } else {
            where.role = roleFilter;
        }
    }

    if (statusFilter === 'active') {
        where.isActive = true;
    } else if (statusFilter === 'inactive') {
        where.isActive = false;
    }

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
        ];
    }

    // Exclude current user from search results (can't message yourself)
    // But managers always see all users including themselves for management purposes
    if (excludeSelf && session.user.role !== 'MANAGER') {
        where.id = { not: session.user.id };
    }
    // If manager, they see all users regardless of excludeSelf parameter

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                client: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        assignedMissions: true,
                        actions: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
            skip,
            take: limit,
        }),
        prisma.user.count({ where }),
    ]);

    return successResponse({
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    });
});

// ============================================
// POST /api/users - Create user (SDR)
// ============================================

const createUserSchema = z.object({
    name: z.string().min(2, 'Nom requis (min 2 caractères)'),
    email: z.string().email('Email invalide'),
    password: z.string().min(6, 'Mot de passe requis (min 6 caractères)').optional(),
    role: z.enum(['SDR', 'MANAGER', 'CLIENT', 'DEVELOPER', 'BUSINESS_DEVELOPER']).default('SDR'),
    clientId: z.string().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
    await requireRole(['MANAGER']);
    const data = await validateRequest(request, createUserSchema);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (existingUser) {
        return errorResponse('Un utilisateur avec cet email existe déjà', 400);
    }

    // Generate password if not provided
    const password = data.password || Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and assign default permissions in a transaction
    const result = await prisma.$transaction(async (tx) => {
        // Create the user
        const user = await tx.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role,
                isActive: true,
                clientId: data.clientId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        // Get default permissions for the role from RolePermission
        const rolePermissions = await tx.rolePermission.findMany({
            where: {
                role: data.role,
                granted: true,
            },
            include: {
                permission: true,
            },
        });

        // Create UserPermission entries for all default role permissions
        // This ensures the user explicitly has these permissions
        if (rolePermissions.length > 0) {
            await tx.userPermission.createMany({
                data: rolePermissions.map((rp) => ({
                    userId: user.id,
                    permissionId: rp.permissionId,
                    granted: true,
                })),
                skipDuplicates: true,
            });
        }

        return user;
    });

    return successResponse({
        ...result,
        generatedPassword: !data.password ? password : undefined,
    }, 201);
});
