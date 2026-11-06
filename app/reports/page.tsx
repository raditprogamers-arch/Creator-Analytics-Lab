import { getContentList } from "@/lib/analytics/metrics";
import { db } from "@/lib/db";
import { platforms } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { ReportGenerator } from "@/components/reports/report-generator";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [contentList, platformsList] = await Promise.all([
    getContentList().catch(() => []),
    db
      .select({ id: platforms.id, name: platforms.name })
      .from(platforms)
      .orderBy(asc(platforms.name))
      .catch(() => []),
  ]);

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Custom Reports & Statistical Synthesis"
        description="Filterable report builder, non-parametric distribution statistics, and CSV export."
      />
      <div className="p-8 flex-1">
        <ReportGenerator contents={contentList} platforms={platformsList} />
      </div>
    </div>
  );
}

