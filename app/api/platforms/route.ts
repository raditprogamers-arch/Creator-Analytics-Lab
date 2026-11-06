import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platforms } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db.select().from(platforms).orderBy(asc(platforms.name));
    return NextResponse.json({ success: true, platforms: list });
  } catch (error: any) {
    console.error("Failed to fetch platforms:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch platforms" },
      { status: 500 }
    );
  }
}

