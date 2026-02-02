"use client";

import { useState, useMemo, useEffect } from "react";
import {
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// DATA TABLE COMPONENT
// ============================================

export interface Column<T> {
    key: string;
    header: string | React.ReactNode;
    sortable?: boolean;
    width?: string;
    render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyField: keyof T | ((row: T) => string);
    searchable?: boolean;
    searchPlaceholder?: string;
    searchFields?: (keyof T)[];
    pagination?: boolean;
    pageSize?: number;
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    className?: string;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable<T extends Record<string, any>>({
    data,
    columns,
    keyField,
    searchable = false,
    searchPlaceholder = "Rechercher...",
    searchFields,
    pagination = true,
    pageSize = 10,
    loading = false,
    emptyMessage = "Aucune donnée",
    onRowClick,
    className,
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Get row key
    const getRowKey = (row: T): string => {
        if (typeof keyField === "function") {
            return keyField(row);
        }
        return String(row[keyField]);
    };

    // Filter data
    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return data;

        const query = searchQuery.toLowerCase();
        return data.filter((row) => {
            const fieldsToSearch = searchFields || (Object.keys(row) as (keyof T)[]);
            return fieldsToSearch.some((field) => {
                const value = row[field];
                return String(value).toLowerCase().includes(query);
            });
        });
    }, [data, searchQuery, searchFields]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortKey || !sortDirection) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = a[sortKey];
            const bValue = b[sortKey];

            if (aValue === bValue) return 0;
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            const comparison = aValue < bValue ? -1 : 1;
            return sortDirection === "asc" ? comparison : -comparison;
        });
    }, [filteredData, sortKey, sortDirection]);

    // Paginate data
    const paginatedData = useMemo(() => {
        if (!pagination) return sortedData;

        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, pagination, currentPage, pageSize]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    // Reset to first page only when search query changes (not when data changes e.g. after quick action)
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // When data length changes (e.g. row removed), clamp current page so we don't show an empty page
    useEffect(() => {
        if (!pagination || totalPages < 1) return;
        setCurrentPage((p) => Math.min(p, totalPages));
    }, [sortedData.length, pageSize, pagination, totalPages]);

    // Handle sort
    const handleSort = (key: string) => {
        if (sortKey === key) {
            if (sortDirection === "asc") {
                setSortDirection("desc");
            } else if (sortDirection === "desc") {
                setSortKey(null);
                setSortDirection(null);
            }
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Search */}
            {searchable && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={cn(
                                        "px-4 py-3 text-left text-sm font-medium text-slate-500",
                                        column.sortable && "cursor-pointer select-none hover:text-slate-900"
                                    )}
                                    style={{ width: column.width }}
                                    onClick={() => column.sortable && handleSort(column.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {typeof column.header === "string" ? (
                                            <span>{column.header}</span>
                                        ) : (
                                            column.header
                                        )}
                                        {column.sortable && typeof column.header === "string" && (
                                            <span className="flex flex-col">
                                                <ChevronUp
                                                    className={cn(
                                                        "w-3 h-3 -mb-1",
                                                        sortKey === column.key && sortDirection === "asc"
                                                            ? "text-indigo-600"
                                                            : "text-slate-400"
                                                    )}
                                                />
                                                <ChevronDown
                                                    className={cn(
                                                        "w-3 h-3 -mt-1",
                                                        sortKey === column.key && sortDirection === "desc"
                                                            ? "text-indigo-600"
                                                            : "text-slate-400"
                                                    )}
                                                />
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-12 text-center text-slate-500"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                        <span>Chargement...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-12 text-center text-slate-500"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row) => (
                                <tr
                                    key={getRowKey(row)}
                                    onClick={() => onRowClick?.(row)}
                                    className={cn(
                                        "border-b border-slate-100 last:border-0 transition-colors",
                                        onRowClick && "cursor-pointer hover:bg-slate-50"
                                    )}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className="px-4 py-3 text-sm text-slate-700"
                                        >
                                            {column.render
                                                ? column.render(row[column.key], row)
                                                : row[column.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                        {((currentPage - 1) * pageSize) + 1} -{" "}
                        {Math.min(currentPage * pageSize, sortedData.length)} sur{" "}
                        {sortedData.length}
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-2 text-slate-400 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 text-slate-400 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                                            pageNum === currentPage
                                                ? "bg-indigo-500 text-white"
                                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 text-slate-400 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-2 text-slate-400 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataTable;
