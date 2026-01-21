/**
 * Invoice Service
 * Handles invoice CRUD operations, validation, and invoice number generation
 */

import { prisma } from "@/lib/prisma";
import { Prisma, InvoiceStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { facturXService } from "./facturx-service";
import { storageService } from "@/lib/storage/storage-service";

export interface CreateInvoiceData {
    billingClientId: string;
    companyIssuerId: string;
    issueDate: Date;
    dueDate: Date;
    items: Array<{
        description: string;
        quantity: number;
        unitPriceHt: number;
        vatRate: number;
    }>;
}

export interface UpdateInvoiceData {
    billingClientId?: string;
    issueDate?: Date;
    dueDate?: Date;
    items?: Array<{
        description: string;
        quantity: number;
        unitPriceHt: number;
        vatRate: number;
    }>;
}

export class InvoiceService {
    /**
     * Calculate totals for invoice items
     */
    private calculateItemTotals(
        quantity: number,
        unitPriceHt: number,
        vatRate: number
    ): { totalHt: number; totalVat: number; totalTtc: number } {
        const totalHt = quantity * unitPriceHt;
        const totalVat = totalHt * (vatRate / 100);
        const totalTtc = totalHt + totalVat;

        return {
            totalHt: Math.round(totalHt * 100) / 100,
            totalVat: Math.round(totalVat * 100) / 100,
            totalTtc: Math.round(totalTtc * 100) / 100,
        };
    }

    /**
     * Calculate invoice totals from items
     */
    private calculateInvoiceTotals(items: Array<{ totalHt: number; totalVat: number; totalTtc: number }>) {
        const totals = items.reduce(
            (acc, item) => ({
                totalHt: acc.totalHt + item.totalHt,
                totalVat: acc.totalVat + item.totalVat,
                totalTtc: acc.totalTtc + item.totalTtc,
            }),
            { totalHt: 0, totalVat: 0, totalTtc: 0 }
        );

        return {
            totalHt: Math.round(totals.totalHt * 100) / 100,
            totalVat: Math.round(totals.totalVat * 100) / 100,
            totalTtc: Math.round(totals.totalTtc * 100) / 100,
        };
    }

    /**
     * Generate next sequential invoice number
     */
    async generateInvoiceNumber(): Promise<string> {
        // Get the highest invoice number
        const lastInvoice = await prisma.invoice.findFirst({
            where: {
                invoiceNumber: { not: null },
            },
            orderBy: {
                invoiceNumber: "desc",
            },
            select: {
                invoiceNumber: true,
            },
        });

        if (!lastInvoice?.invoiceNumber) {
            return "INV-001";
        }

        // Extract number from "INV-001" format
        const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
        if (!match) {
            return "INV-001";
        }

        const nextNumber = parseInt(match[1], 10) + 1;
        return `INV-${nextNumber.toString().padStart(3, "0")}`;
    }

    /**
     * Create a new draft invoice
     */
    async createInvoice(data: CreateInvoiceData, userId: string) {
        // Calculate item totals
        const itemsWithTotals = data.items.map((item, index) => {
            const totals = this.calculateItemTotals(item.quantity, item.unitPriceHt, item.vatRate);
            return {
                ...item,
                ...totals,
                order: index,
            };
        });

        // Calculate invoice totals
        const invoiceTotals = this.calculateInvoiceTotals(itemsWithTotals);

        // Create invoice with items
        const invoice = await prisma.invoice.create({
            data: {
                status: InvoiceStatus.DRAFT,
                billingClientId: data.billingClientId,
                companyIssuerId: data.companyIssuerId,
                issueDate: data.issueDate,
                dueDate: data.dueDate,
                totalHt: new Decimal(invoiceTotals.totalHt),
                totalVat: new Decimal(invoiceTotals.totalVat),
                totalTtc: new Decimal(invoiceTotals.totalTtc),
                createdById: userId,
                items: {
                    create: itemsWithTotals.map((item) => ({
                        description: item.description,
                        quantity: new Decimal(item.quantity),
                        unitPriceHt: new Decimal(item.unitPriceHt),
                        vatRate: new Decimal(item.vatRate),
                        totalHt: new Decimal(item.totalHt),
                        totalVat: new Decimal(item.totalVat),
                        totalTtc: new Decimal(item.totalTtc),
                        order: item.order,
                    })),
                },
            },
            include: {
                billingClient: true,
                companyIssuer: true,
                items: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return invoice;
    }

    /**
     * Update a draft invoice (only if status is DRAFT)
     */
    async updateInvoice(id: string, data: UpdateInvoiceData, userId: string) {
        // Check invoice exists and is draft
        const existing = await prisma.invoice.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!existing) {
            throw new Error("Invoice not found");
        }

        if (existing.status !== InvoiceStatus.DRAFT) {
            throw new Error("Cannot update invoice that is not in DRAFT status");
        }

        // If items are being updated, recalculate totals
        let invoiceTotals = {
            totalHt: Number(existing.totalHt),
            totalVat: Number(existing.totalVat),
            totalTtc: Number(existing.totalTtc),
        };

        if (data.items) {
            const itemsWithTotals = data.items.map((item, index) => {
                const totals = this.calculateItemTotals(item.quantity, item.unitPriceHt, item.vatRate);
                return {
                    ...item,
                    ...totals,
                    order: index,
                };
            });

            invoiceTotals = this.calculateInvoiceTotals(itemsWithTotals);

            // Delete existing items and create new ones
            await prisma.invoiceItem.deleteMany({
                where: { invoiceId: id },
            });
        }

        // Update invoice
        const invoice = await prisma.invoice.update({
            where: { id },
            data: {
                ...(data.billingClientId && { billingClientId: data.billingClientId }),
                ...(data.issueDate && { issueDate: data.issueDate }),
                ...(data.dueDate && { dueDate: data.dueDate }),
                totalHt: new Decimal(invoiceTotals.totalHt),
                totalVat: new Decimal(invoiceTotals.totalVat),
                totalTtc: new Decimal(invoiceTotals.totalTtc),
                ...(data.items && {
                    items: {
                        create: data.items.map((item, index) => {
                            const totals = this.calculateItemTotals(item.quantity, item.unitPriceHt, item.vatRate);
                            return {
                                description: item.description,
                                quantity: new Decimal(item.quantity),
                                unitPriceHt: new Decimal(item.unitPriceHt),
                                vatRate: new Decimal(item.vatRate),
                                totalHt: new Decimal(totals.totalHt),
                                totalVat: new Decimal(totals.totalVat),
                                totalTtc: new Decimal(totals.totalTtc),
                                order: index,
                            };
                        }),
                    },
                }),
            },
            include: {
                billingClient: true,
                companyIssuer: true,
                items: {
                    orderBy: { order: "asc" },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return invoice;
    }

    /**
     * Validate invoice: generate number, create PDF, lock invoice
     */
    async validateInvoice(id: string, userId: string) {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                billingClient: true,
                companyIssuer: true,
                items: {
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!invoice) {
            throw new Error("Invoice not found");
        }

        if (invoice.status !== InvoiceStatus.DRAFT) {
            throw new Error("Invoice is already validated");
        }

        if (!invoice.items || invoice.items.length === 0) {
            throw new Error("Invoice must have at least one item");
        }

        // Generate invoice number
        const invoiceNumber = await this.generateInvoiceNumber();

        // Generate Factur-X PDF
        const pdfBuffer = await facturXService.generateFacturXPDF(invoice);

        // Upload PDF to storage
        const { key, url } = await storageService.upload(
            pdfBuffer,
            {
                filename: `invoice-${invoiceNumber}.pdf`,
                mimeType: "application/pdf",
                size: pdfBuffer.length,
                folder: "invoices",
            },
            userId
        );

        // Update invoice: set number, PDF URL, status, and validated date
        const validatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                invoiceNumber,
                status: InvoiceStatus.VALIDATED,
                facturxPdfUrl: url,
                validatedAt: new Date(),
            },
            include: {
                billingClient: true,
                companyIssuer: true,
                items: {
                    orderBy: { order: "asc" },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return validatedInvoice;
    }

    /**
     * Get invoice by ID with all relations
     */
    async getInvoice(id: string) {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                billingClient: true,
                companyIssuer: true,
                items: {
                    orderBy: { order: "asc" },
                },
                payments: {
                    include: {
                        confirmedBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return invoice;
    }

    /**
     * List invoices with filters and pagination
     */
    async listInvoices(filters: {
        status?: InvoiceStatus;
        billingClientId?: string;
        dateFrom?: Date;
        dateTo?: Date;
        search?: string;
    }, pagination: { page: number; limit: number }) {
        const where: Prisma.InvoiceWhereInput = {};

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.billingClientId) {
            where.billingClientId = filters.billingClientId;
        }

        if (filters.dateFrom || filters.dateTo) {
            where.issueDate = {};
            if (filters.dateFrom) {
                where.issueDate.gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                where.issueDate.lte = filters.dateTo;
            }
        }

        if (filters.search) {
            where.OR = [
                { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
                { billingClient: { legalName: { contains: filters.search, mode: "insensitive" } } },
            ];
        }

        const skip = (pagination.page - 1) * pagination.limit;

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: {
                    billingClient: {
                        select: {
                            id: true,
                            legalName: true,
                        },
                    },
                    _count: {
                        select: {
                            items: true,
                            payments: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: pagination.limit,
            }),
            prisma.invoice.count({ where }),
        ]);

        return {
            invoices,
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit),
        };
    }
}

export const invoiceService = new InvoiceService();
