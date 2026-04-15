export interface FormulaireExportItem {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
    mission?: { name: string | null } | null;
    client?: { name: string | null } | null;
    company?: { name: string | null } | null;
    contact?: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
    } | null;
    createdBy?: { name: string | null } | null;
}

function csvEscape(input: string): string {
    return `"${input.replace(/"/g, '""')}"`;
}

function contactLabel(contact: FormulaireExportItem["contact"]): string {
    if (!contact) return "";
    const n = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
    return n || contact.email || "";
}

function stringifyContent(content: string): string {
    try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object" && parsed._type) {
            return flattenStructured(parsed);
        }
    } catch {
        // not JSON — fall through
    }
    return content;
}

function flattenStructured(data: Record<string, unknown>): string {
    const lines: string[] = [];
    const walk = (obj: unknown, prefix = "") => {
        if (obj === null || obj === undefined) return;
        if (Array.isArray(obj)) {
            obj.forEach((v, i) => walk(v, `${prefix}[${i + 1}]`));
            return;
        }
        if (typeof obj === "object") {
            Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
                if (k.startsWith("_")) return;
                walk(v, prefix ? `${prefix}.${k}` : k);
            });
            return;
        }
        const val = String(obj).trim();
        if (val) lines.push(`${prefix}: ${val}`);
    };
    walk(data);
    return lines.join("\n");
}

export function buildFormulairesCsv(items: FormulaireExportItem[]): string {
    const header = [
        "id",
        "date_creation",
        "date_modification",
        "mission",
        "client",
        "societe",
        "contact",
        "auteur",
        "titre",
        "contenu",
    ];
    const rows = [
        header,
        ...items.map((f) => [
            f.id,
            new Date(f.createdAt).toISOString(),
            f.updatedAt ? new Date(f.updatedAt).toISOString() : "",
            f.mission?.name ?? "",
            f.client?.name ?? "",
            f.company?.name ?? "",
            contactLabel(f.contact),
            f.createdBy?.name ?? "",
            f.title,
            stringifyContent(f.content),
        ]),
    ];
    return rows.map((r) => r.map((c) => csvEscape(String(c ?? ""))).join(";")).join("\n");
}

export function downloadFormulairesCsv(
    items: FormulaireExportItem[],
    filenamePrefix = "formulaires"
): void {
    const csv = buildFormulairesCsv(items);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${filenamePrefix}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
