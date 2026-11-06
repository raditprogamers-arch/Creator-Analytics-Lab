import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { syncConnectedAccount } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accounts = await db.select().from(connectedAccounts);
    const results = [];

    for (const acc of accounts) {
      try {
        const res = await syncConnectedAccount(acc.id);
        results.push(res);
      } catch (err: any) {
        results.push({ accountId: acc.id, success: false, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      syncedAccounts: results,
    });
  } catch (err: any) {
    console.error("Cron sync error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Cron sync failed" },
      { status: 500 }
    );
  }
}

