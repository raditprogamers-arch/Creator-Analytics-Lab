import { getContentList } from "@/lib/analytics/metrics";
import { db } from "@/lib/db";
import { platforms } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { ContentTable } from "@/components/content/content-table";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
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
        title="Content Catalog & Telemetry"
        description="Comprehensive inventory of published songs, videos, covers, and streams across all creator platforms."
      />
      <div className="p-8 flex-1">
        <ContentTable initialContents={contentList} platforms={platformsList} />
      </div>
    </div>
  );
}

