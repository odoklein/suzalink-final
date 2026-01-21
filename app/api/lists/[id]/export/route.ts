import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ============================================
// GET /api/lists/[id]/export
// Export list to CSV
// ============================================

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        // Allow MANAGER and ADMIN to export
        // If SDRs need to export, add "SDR" to this list or use checking permission logic
        if (!session || !["MANAGER", "ADMIN"].includes(session.user?.role as string)) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;

        const list = await prisma.list.findUnique({
            where: { id },
            select: { name: true }
        });

        if (!list) {
            return new NextResponse("List not found", { status: 404 });
        }

        const companies = await prisma.company.findMany({
            where: { listId: id },
            include: {
                contacts: true,
            },
        });

        // Generate CSV
        const headers = ["Company", "Industry", "Country", "Website", "Contact Name", "Email", "Phone", "Title", "Status"];
        const rows: string[] = [headers.join(",")];

        for (const company of companies) {
            const companyData = [
                `"${(company.name || "").replace(/"/g, '""')}"`,
                `"${(company.industry || "").replace(/"/g, '""')}"`,
                `"${(company.country || "").replace(/"/g, '""')}"`,
                `"${(company.website || "").replace(/"/g, '""')}"`,
            ];

            if (company.contacts.length === 0) {
                rows.push([
                    ...companyData,
                    "", "", "", "",
                    `"${company.status}"`
                ].join(","));
            } else {
                for (const contact of company.contacts) {
                    rows.push([
                        ...companyData,
                        `"${((contact.firstName || "") + " " + (contact.lastName || "")).trim().replace(/"/g, '""')}"`,
                        `"${(contact.email || "").replace(/"/g, '""')}"`,
                        `"${(contact.phone || "").replace(/"/g, '""')}"`,
                        `"${(contact.title || "").replace(/"/g, '""')}"`,
                        `"${contact.status}"`
                    ].join(","));
                }
            }
        }

        const csv = rows.join("\n");
        const filename = `${list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.csv`;

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error("Export error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
