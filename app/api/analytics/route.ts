import { NextResponse } from "next/server";
import {
  compareContentTypes,
  compareLanguages,
  compareOriginalVsCovers,
} from "@/lib/analytics/comparisons";

export async function GET() {
  try {
    const [contentTypes, languages, originalVsCovers] = await Promise.all([
      compareContentTypes(),
      compareLanguages(),
      compareOriginalVsCovers(),
    ]);

    return NextResponse.json({
      success: true,
      contentTypes,
      languages,
      originalVsCovers,
    });
  } catch (error: any) {
    console.error("Failed to fetch analytics comparisons:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch analytics comparisons" },
      { status: 500 }
    );
  }
}

