import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ============================================
// CSV IMPORT API
// ============================================

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "MANAGER") {
            return NextResponse.json(
                { success: false, error: "Non autorisé" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { missionId, listName, mappings, csvData, importType = "companies-contacts" } = body;

        // Validate required fields
        if (!missionId || !listName || !mappings || !csvData) {
            return NextResponse.json(
                { success: false, error: "Données manquantes" },
                { status: 400 }
            );
        }

        // Verify mission exists
        const mission = await prisma.mission.findUnique({
            where: { id: missionId },
        });

        if (!mission) {
            return NextResponse.json(
                { success: false, error: "Mission non trouvée" },
                { status: 404 }
            );
        }

        // Create the list with import configuration
        const list = await prisma.list.create({
            data: {
                name: listName,
                type: "CLIENT",
                source: "CSV Import",
                missionId,
                importConfig: {
                    importType,
                    mappings,
                    importedAt: new Date().toISOString(),
                },
            },
        });

        let companiesCreated = 0;
        let contactsCreated = 0;
        const errors: string[] = [];

        // Process each row
        for (let rowIndex = 0; rowIndex < csvData.length; rowIndex++) {
            const row = csvData[rowIndex];

            try {
                // Extract company data from mappings
                const companyData: any = {};
                const companyCustomData: any = {};
                let hasCompanyData = false;

                for (const mapping of mappings) {
                    if (mapping.targetField.startsWith("company.")) {
                        const field = mapping.targetField.replace("company.", "");
                        const value = row[mapping.csvColumn];
                        if (value) {
                            // Check if this is a standard field or custom field
                            const standardFields = ["name", "industry", "country", "website", "size", "phone"];
                            if (standardFields.includes(field)) {
                                companyData[field] = value.trim();
                            } else {
                                // Store as custom field
                                companyCustomData[field] = value.trim();
                            }
                            hasCompanyData = true;
                        }
                    }
                }

                if (!hasCompanyData || !companyData.name) {
                    errors.push(`Ligne ${rowIndex + 1}: Nom de société manquant`);
                    continue;
                }

                // Create or find company
                let company = await prisma.company.findFirst({
                    where: {
                        name: companyData.name,
                        listId: list.id,
                    },
                });

                if (!company) {
                    // Build company data object, only including fields that exist
                    const companyCreateData: any = {
                        name: companyData.name,
                        industry: companyData.industry || null,
                        country: companyData.country || null,
                        website: companyData.website || null,
                        size: companyData.size || null,
                        listId: list.id,
                    };

                    // Only add phone if it exists in the data (and schema supports it)
                    if (companyData.phone !== undefined && companyData.phone !== null && companyData.phone !== '') {
                        companyCreateData.phone = companyData.phone.trim();
                    }

                    // Add custom data if any custom fields were found
                    if (Object.keys(companyCustomData).length > 0) {
                        companyCreateData.customData = companyCustomData;
                    }

                    company = await prisma.company.create({
                        data: companyCreateData,
                    });
                    companiesCreated++;
                }

                // Only process contacts if import type allows it
                if (importType === "companies-contacts") {
                    // Extract contact data from mappings
                    const contactData: any = {};
                    const contactCustomData: any = {};
                    let hasContactData = false;

                    for (const mapping of mappings) {
                        if (mapping.targetField.startsWith("contact.")) {
                            const field = mapping.targetField.replace("contact.", "");
                            const value = row[mapping.csvColumn];
                            if (value) {
                                // Check if this is a standard field or custom field
                                const standardFields = ["firstName", "lastName", "email", "phone", "title", "linkedin"];
                                if (standardFields.includes(field)) {
                                    contactData[field] = value.trim();
                                } else {
                                    // Store as custom field
                                    contactCustomData[field] = value.trim();
                                }
                                hasContactData = true;
                            }
                        }
                    }

                    // Create contact if we have contact data
                    if (hasContactData && (contactData.email || contactData.firstName || contactData.lastName)) {
                        // Check if contact already exists
                        const existingContact = await prisma.contact.findFirst({
                            where: {
                                companyId: company.id,
                                OR: [
                                    { email: contactData.email || undefined },
                                    {
                                        AND: [
                                            { firstName: contactData.firstName || undefined },
                                            { lastName: contactData.lastName || undefined },
                                        ],
                                    },
                                ],
                            },
                        });

                        if (!existingContact) {
                            const contactCreateData: any = {
                                firstName: contactData.firstName || null,
                                lastName: contactData.lastName || null,
                                email: contactData.email || null,
                                phone: contactData.phone || null,
                                title: contactData.title || null,
                                linkedin: contactData.linkedin || null,
                                companyId: company.id,
                            };

                            // Add custom data if any custom fields were found
                            if (Object.keys(contactCustomData).length > 0) {
                                contactCreateData.customData = contactCustomData;
                            }

                            await prisma.contact.create({
                                data: contactCreateData,
                            });
                            contactsCreated++;
                        }
                    }
                }
            } catch (err: any) {
                console.error(`Error processing row ${rowIndex + 1}:`, err);
                errors.push(`Ligne ${rowIndex + 1}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                listId: list.id,
                companiesCreated,
                contactsCreated,
                errors: errors.length,
                errorDetails: errors.slice(0, 10), // Return first 10 errors
            },
        });
    } catch (error: any) {
        console.error("CSV import error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Erreur lors de l'import" },
            { status: 500 }
        );
    }
}
