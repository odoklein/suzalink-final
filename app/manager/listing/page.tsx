"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui";
import { Search, List } from "lucide-react";
import { ListingSearchTab } from "@/components/listing/ListingSearchTab";
import type { ListingResult } from "@/components/listing/ListingSearchTab";
import { ListingListsTab } from "@/components/listing/ListingListsTab";
import { ImportToListModal } from "@/components/listing/ImportToListModal";

// ============================================
// LISTING PAGE — Unified Search + Lists
// ============================================

export default function ListingPage() {
    const [activeTab, setActiveTab] = useState("search");
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [resultsToImport, setResultsToImport] = useState<ListingResult[]>([]);

    const tabs = [
        { id: "search", label: "Recherche", icon: <Search className="w-4 h-4" /> },
        { id: "lists", label: "Mes listes", icon: <List className="w-4 h-4" /> },
    ];

    const handleImportRequest = (results: ListingResult[]) => {
        setResultsToImport(results);
        setImportModalOpen(true);
    };

    const handleImportComplete = () => {
        setImportModalOpen(false);
        setResultsToImport([]);
        // Switch to lists tab after import
        setActiveTab("lists");
    };

    return (
        <div className="flex flex-col gap-4 min-h-0 flex-1">
            {/* Page header + tabs */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Listing</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Recherche de leads et gestion des listes</p>
                </div>
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    variant="pills"
                />
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 flex flex-col">
                {activeTab === "search" ? (
                    <ListingSearchTab onImport={handleImportRequest} />
                ) : (
                    <ListingListsTab />
                )}
            </div>

            {/* Import Modal */}
            <ImportToListModal
                isOpen={importModalOpen}
                onClose={() => {
                    setImportModalOpen(false);
                    setResultsToImport([]);
                }}
                results={resultsToImport}
                onImportComplete={handleImportComplete}
            />
        </div>
    );
}
