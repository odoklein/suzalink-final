import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    successResponse,
    errorResponse,
    requireRole,
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
    await requireRole(['MANAGER']);
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);

    const roleFilter = searchParams.get('role');
    const search = searchParams.get('search');

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

    const user = await prisma.user.create({
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

    return successResponse({
        ...user,
        generatedPassword: !data.password ? password : undefined,
    }, 201);
});
