import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { importHistory, platforms } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  parseCSV,
  validateDatasetDryRun,
  processDatasetImport,
  rollbackImport,
  CustomMappingAdapter,
  ADAPTERS,
} from "@/lib/imports/csv-parser";

export async function GET() {
  try {
    const list = await db
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
      .orderBy(desc(importHistory.importedAt));

    return NextResponse.json({ success: true, imports: list });
  } catch (error: any) {
    console.error("Failed to fetch import history:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch import history" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      csvText,
      filename = "data_upload.csv",
      platformName = "YouTube",
      capturedAt = new Date().toISOString(),
      dryRun = false,
      customMappings,
    } = body;

    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'csvText' payload" },
        { status: 400 }
      );
    }

    const { rows, headers } = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "CSV file is empty or has no data rows" },
        { status: 400 }
      );
    }

    let adapter = ADAPTERS.find(
      (a) => a.platformName.toLowerCase() === platformName.toLowerCase()
    );

    if (customMappings && Object.keys(customMappings).length > 0) {
      adapter = new CustomMappingAdapter({
        platformName,
        idCol: customMappings.external_id || "id",
        titleCol: customMappings.title || "title",
        typeCol: customMappings.content_type,
        langCol: customMappings.language,
        dateCol: customMappings.published_at,
        metricMap: {
          views: customMappings.views,
          likes: customMappings.likes,
          comments: customMappings.comments,
          shares: customMappings.shares,
          streams: customMappings.streams,
        },
      });
    }

    if (!adapter) {
      adapter = ADAPTERS[0]; // Fallback to YouTube
    }

    const targetDate = new Date(capturedAt);

    if (dryRun) {
      const dryRunResult = validateDatasetDryRun(rows, adapter, targetDate);
      return NextResponse.json({
        success: true,
        dryRun: true,
        headers,
        totalRows: dryRunResult.totalCount,
        validRows: dryRunResult.validCount,
        rejectedRows: dryRunResult.rejectedCount,
        rejectedDetails: dryRunResult.rejectedRows,
        sampleMapped: dryRunResult.sampleMapped,
      });
    }

    const importResult = await processDatasetImport(
      rows,
      filename,
      platformName,
      targetDate,
      adapter
    );

    return NextResponse.json(importResult);
  } catch (error: any) {
    console.error("Failed to process CSV import:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process import" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing import id parameter" },
        { status: 400 }
      );
    }

    const result = await rollbackImport(Number(id));
    return NextResponse.json({
      success: true,
      message: `Import batch #${id} and associated metric snapshots safely rolled back.`,
      result,
    });
  } catch (error: any) {
    console.error("Failed to rollback import:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to rollback import" },
      { status: 500 }
    );
  }
}

