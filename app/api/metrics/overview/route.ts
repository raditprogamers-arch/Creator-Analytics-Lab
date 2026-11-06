import { NextRequest, NextResponse } from "next/server";
import {
  getOverviewKpis,
  getPlatformSummaries,
  getTimelineMetrics,
} from "@/lib/analytics/metrics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId")
      ? Number(searchParams.get("platformId"))
      : undefined;
    const metric = searchParams.get("metric") || "views";

    const [kpis, platformSummaries, timeline] = await Promise.all([
      getOverviewKpis(),
      getPlatformSummaries(),
      getTimelineMetrics(platformId, metric),
    ]);

    return NextResponse.json({
      success: true,
      kpis,
      platformSummaries,
      timeline,
    });
  } catch (error: any) {
    console.error("Failed to fetch overview metrics:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch overview metrics" },
      { status: 500 }
    );
  }
}

