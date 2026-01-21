"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button, Input } from "@/components/ui";

export interface InvoiceItem {
    id?: string;
    description: string;
    quantity: number;
    unitPriceHt: number;
    vatRate: number;
    totalHt?: number;
    totalVat?: number;
    totalTtc?: number;
}

interface InvoiceItemsTableProps {
    items: InvoiceItem[];
    onChange: (items: InvoiceItem[]) => void;
    readOnly?: boolean;
}

export function InvoiceItemsTable({ items, onChange, readOnly = false }: InvoiceItemsTableProps) {
    const addItem = () => {
        onChange([
            ...items,
            {
                description: "",
                quantity: 1,
                unitPriceHt: 0,
                vatRate: 20,
            },
        ]);
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };

        // Recalculate totals
        const quantity = Number(updated[index].quantity) || 0;
        const unitPriceHt = Number(updated[index].unitPriceHt) || 0;
        const vatRate = Number(updated[index].vatRate) || 0;

        const totalHt = quantity * unitPriceHt;
        const totalVat = totalHt * (vatRate / 100);
        const totalTtc = totalHt + totalVat;

        updated[index] = {
            ...updated[index],
            totalHt: Math.round(totalHt * 100) / 100,
            totalVat: Math.round(totalVat * 100) / 100,
            totalTtc: Math.round(totalTtc * 100) / 100,
        };

        onChange(updated);
    };

    const calculateTotals = () => {
        const totals = items.reduce(
            (acc, item) => {
                const totalHt = item.totalHt || 0;
                const totalVat = item.totalVat || 0;
                const totalTtc = item.totalTtc || 0;
                return {
                    totalHt: acc.totalHt + totalHt,
                    totalVat: acc.totalVat + totalVat,
                    totalTtc: acc.totalTtc + totalTtc,
                };
            },
            { totalHt: 0, totalVat: 0, totalTtc: 0 }
        );

        return {
            totalHt: Math.round(totals.totalHt * 100) / 100,
            totalVat: Math.round(totals.totalVat * 100) / 100,
            totalTtc: Math.round(totals.totalTtc * 100) / 100,
        };
    };

    const totals = calculateTotals();

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="text-left p-2 font-semibold text-slate-700">Description</th>
                            <th className="text-right p-2 font-semibold text-slate-700 w-24">Qté</th>
                            <th className="text-right p-2 font-semibold text-slate-700 w-32">Prix HT</th>
                            <th className="text-right p-2 font-semibold text-slate-700 w-24">TVA %</th>
                            <th className="text-right p-2 font-semibold text-slate-700 w-32">Total TTC</th>
                            {!readOnly && <th className="w-12"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-100">
                                <td className="p-2">
                                    {readOnly ? (
                                        <div className="text-slate-900">{item.description}</div>
                                    ) : (
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateItem(index, "description", e.target.value)}
                                            placeholder="Description"
                                            className="border-0 bg-transparent p-0 focus:ring-0"
                                        />
                                    )}
                                </td>
                                <td className="p-2">
                                    {readOnly ? (
                                        <div className="text-right text-slate-900">{item.quantity.toFixed(2)}</div>
                                    ) : (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                                            className="text-right border-0 bg-transparent p-0 focus:ring-0"
                                        />
                                    )}
                                </td>
                                <td className="p-2">
                                    {readOnly ? (
                                        <div className="text-right text-slate-900">{item.unitPriceHt.toFixed(2)} €</div>
                                    ) : (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unitPriceHt}
                                            onChange={(e) => updateItem(index, "unitPriceHt", parseFloat(e.target.value) || 0)}
                                            className="text-right border-0 bg-transparent p-0 focus:ring-0"
                                        />
                                    )}
                                </td>
                                <td className="p-2">
                                    {readOnly ? (
                                        <div className="text-right text-slate-900">{item.vatRate.toFixed(2)}%</div>
                                    ) : (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={item.vatRate}
                                            onChange={(e) => updateItem(index, "vatRate", parseFloat(e.target.value) || 0)}
                                            className="text-right border-0 bg-transparent p-0 focus:ring-0"
                                        />
                                    )}
                                </td>
                                <td className="p-2">
                                    <div className="text-right font-medium text-slate-900">
                                        {(item.totalTtc || 0).toFixed(2)} €
                                    </div>
                                </td>
                                {!readOnly && (
                                    <td className="p-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeItem(index)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-slate-300 font-semibold">
                            <td colSpan={readOnly ? 4 : 5} className="p-2 text-right text-slate-700">
                                Total HT:
                            </td>
                            <td className="p-2 text-right text-slate-900">{totals.totalHt.toFixed(2)} €</td>
                            {!readOnly && <td></td>}
                        </tr>
                        <tr>
                            <td colSpan={readOnly ? 4 : 5} className="p-2 text-right text-slate-700">
                                TVA:
                            </td>
                            <td className="p-2 text-right text-slate-900">{totals.totalVat.toFixed(2)} €</td>
                            {!readOnly && <td></td>}
                        </tr>
                        <tr className="border-t border-slate-300 font-bold text-lg">
                            <td colSpan={readOnly ? 4 : 5} className="p-2 text-right text-slate-900">
                                Total TTC:
                            </td>
                            <td className="p-2 text-right text-slate-900">{totals.totalTtc.toFixed(2)} €</td>
                            {!readOnly && <td></td>}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {!readOnly && (
                <Button variant="outline" onClick={addItem} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un article
                </Button>
            )}
        </div>
    );
}
