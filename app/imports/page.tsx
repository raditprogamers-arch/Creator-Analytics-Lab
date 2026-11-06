import { db } from "@/lib/db";
import { importHistory, platforms } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { UploadZone } from "@/components/imports/upload-zone";
import { HistoryTable } from "@/components/imports/history-table";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const [platformsList, importsList] = await Promise.all([
    db
      .select({ id: platforms.id, name: platforms.name })
      .from(platforms)
      .orderBy(asc(platforms.name))
      .catch(() => []),
    db
      .select({
        id: importHistory.id,
        filename: importHistory.filename,
        platformId: importHistory.platformId,
        platformName: platforms.name,
        importedAt: importHistory.importedAt,
        totalRows: importHistory.totalRows,
        successfulRows: importHistory.successfulRows,
        rejectedRows: importHistory.rejectedRows,
        importStatus: importHistory.importStatus,
        errorSummary: importHistory.errorSummary,
      })
      .from(importHistory)
      .leftJoin(platforms, eq(importHistory.platformId, platforms.id))
      .orderBy(desc(importHistory.importedAt))
      .catch(() => []),
  ]);

  const formattedImports = importsList.map((i) => ({
    ...i,
    importedAt: new Date(i.importedAt).toISOString(),
  }));

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Data Ingestion & Ingestion Audit"
        description="Dry-run validation, atomic transaction ingestion, and audit trail rollback for multi-platform CSVs."
      />
      <div className="p-8 space-y-8 flex-1">
        <UploadZone platforms={platformsList} />
        <HistoryTable initialImports={formattedImports} />
      </div>
    </div>
  );
}

