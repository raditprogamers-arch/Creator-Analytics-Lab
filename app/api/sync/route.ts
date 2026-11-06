import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectedAccounts, platforms } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { syncConnectedAccount } from "@/lib/sync";

export async function GET() {
  try {
    const list = await db
      .select({
        id: connectedAccounts.id,
        platformId: connectedAccounts.platformId,
        platformName: connectedAccounts.platformName,
        accountIdentifier: connectedAccounts.accountIdentifier,
        accountName: connectedAccounts.accountName,
        tokenExpiresAt: connectedAccounts.tokenExpiresAt,
        metadata: connectedAccounts.metadata,
        lastSyncedAt: connectedAccounts.lastSyncedAt,
        syncStatus: connectedAccounts.syncStatus,
        syncError: connectedAccounts.syncError,
        createdAt: connectedAccounts.createdAt,
      })
      .from(connectedAccounts)
      .leftJoin(platforms, eq(connectedAccounts.platformId, platforms.id))
      .orderBy(desc(connectedAccounts.createdAt));

    return NextResponse.json({ success: true, accounts: list });
  } catch (err: any) {
    console.error("Failed to fetch connected accounts:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch connected accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "Missing required 'accountId'" },
        { status: 400 }
      );
    }

    const result = await syncConnectedAccount(Number(accountId));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Failed to execute sync job:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Sync execution failed" },
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
        { success: false, error: "Missing required 'id' parameter" },
        { status: 400 }
      );
    }

    await db.delete(connectedAccounts).where(eq(connectedAccounts.id, Number(id)));

    return NextResponse.json({
      success: true,
      message: `Account #${id} disconnected successfully.`,
    });
  } catch (err: any) {
    console.error("Failed to disconnect account:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to disconnect account" },
      { status: 500 }
    );
  }
}

