import { NextRequest } from "next/server";
import {
    successResponse,
    errorResponse,
    requireRole,
    withErrorHandler,
} from "@/lib/api-utils";
import { pappersService, PappersService } from "@/lib/billing/pappers-service";

// ============================================
// GET /api/billing/clients/search - Search companies via Pappers
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
    await requireRole(["MANAGER"]);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
        return errorResponse("Requête de recherche requise (min 2 caractères)", 400);
    }

    try {
        const results = await pappersService.searchCompany(query);

        // Convert to BillingClient format
        const clients = results.map((company) => PappersService.toBillingClient(company));

        return successResponse(clients);
    } catch (error: any) {
        console.error("Pappers search error:", error);
        
        if (error instanceof Error) {
            // Check for API key configuration error
            if (error.message.includes("PAPPERS_API_KEY")) {
                return errorResponse("Service Pappers non configuré", 503);
            }
            
            // Check for quota/credit errors (401)
            if (error.isQuotaError || error.statusCode === 401) {
                return errorResponse(
                    "Quota Pappers épuisé. Veuillez recharger vos crédits ou utiliser la saisie manuelle.",
                    402
                );
            }
            
            // Return the error message if available
            if (error.message) {
                return errorResponse(error.message, error.statusCode || 500);
            }
        }
        
        return errorResponse("Erreur lors de la recherche", 500);
    }
});
