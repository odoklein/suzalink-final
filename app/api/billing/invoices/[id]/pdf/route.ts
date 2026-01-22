import { NextRequest, NextResponse } from "next/server";
import {
    errorResponse,
    requireRole,
    withErrorHandler,
} from "@/lib/api-utils";
import { invoiceService } from "@/lib/billing/invoice-service";
import { storageService } from "@/lib/storage/storage-service";

// ============================================
// GET /api/billing/invoices/[id]/pdf - Download PDF
// ============================================

export const GET = withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    await requireRole(["MANAGER"]);
    const { id } = await params;

    const invoice = await invoiceService.getInvoice(id);

    if (!invoice) {
        return errorResponse("Facture non trouvée", 404);
    }

    if (!invoice.facturxPdfUrl) {
        return errorResponse("PDF non disponible. La facture doit être validée.", 400);
    }

    // Extract storage key from URL
    // URL format: /uploads/invoices/{key} or https://bucket.s3.../{key}
    const urlParts = invoice.facturxPdfUrl.split("/");
    const key = urlParts.slice(-2).join("/"); // Get last two parts (folder/filename)

    try {
        // Download PDF from storage
        const pdfBuffer = await storageService.download(key);

        // Return PDF as response (Uint8Array is valid BodyInit; Buffer is not in DOM types)
        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="facture-${invoice.invoiceNumber || id}.pdf"`,
            },
        });
    } catch (error) {
        console.error("Error downloading PDF:", error);
        return errorResponse("Erreur lors du téléchargement du PDF", 500);
    }
});
