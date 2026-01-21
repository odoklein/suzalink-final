import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    successResponse,
    errorResponse,
    requireRole,
    withErrorHandler,
    validateRequest,
} from "@/lib/api-utils";
import { z } from "zod";

// ============================================
// GET /api/billing/company-issuer - Get company issuer
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
    await requireRole(["MANAGER"]);

    // Get the first (and only) company issuer
    const issuer = await prisma.companyIssuer.findFirst();

    if (!issuer) {
        return errorResponse("Émetteur non configuré", 404);
    }

    return successResponse(issuer);
});

// ============================================
// PUT /api/billing/company-issuer - Update company issuer
// ============================================

const updateIssuerSchema = z.object({
    legalName: z.string().min(1, "Nom légal requis"),
    address: z.string().min(1, "Adresse requise"),
    city: z.string().min(1, "Ville requise"),
    postalCode: z.string().min(1, "Code postal requis"),
    country: z.string().default("France"),
    siret: z.string().min(1, "SIRET requis"),
    vatNumber: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    logo: z.string().optional(),
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
    await requireRole(["MANAGER"]);
    const data = await validateRequest(request, updateIssuerSchema);

    // Get existing issuer or create if doesn't exist
    const existing = await prisma.companyIssuer.findFirst();

    const issuer = existing
        ? await prisma.companyIssuer.update({
              where: { id: existing.id },
              data: {
                  legalName: data.legalName,
                  address: data.address,
                  city: data.city,
                  postalCode: data.postalCode,
                  country: data.country,
                  siret: data.siret,
                  vatNumber: data.vatNumber || null,
                  email: data.email || null,
                  phone: data.phone || null,
                  logo: data.logo || null,
              },
          })
        : await prisma.companyIssuer.create({
              data: {
                  legalName: data.legalName,
                  address: data.address,
                  city: data.city,
                  postalCode: data.postalCode,
                  country: data.country,
                  siret: data.siret,
                  vatNumber: data.vatNumber || null,
                  email: data.email || null,
                  phone: data.phone || null,
                  logo: data.logo || null,
              },
          });

    return successResponse(issuer);
});
