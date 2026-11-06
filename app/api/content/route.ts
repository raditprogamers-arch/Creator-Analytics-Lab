import { NextRequest, NextResponse } from "next/server";
import { getContentList } from "@/lib/analytics/metrics";
import { db } from "@/lib/db";
import { contents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId")
      ? Number(searchParams.get("platformId"))
      : undefined;
    const contentType = searchParams.get("contentType") || undefined;
    const language = searchParams.get("language") || undefined;
    const search = searchParams.get("search") || undefined;

    const list = await getContentList({
      platformId,
      contentType,
      language,
      search,
    });

    return NextResponse.json({ success: true, contents: list });
  } catch (error: any) {
    console.error("Failed to fetch contents:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch contents" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, contentType, language, contentUrl, description } = body;

    if (!id || !title || !contentType) {
      return NextResponse.json(
        { success: false, error: "id, title, and contentType are required fields." },
        { status: 400 }
      );
    }

    const updated = await db
      .update(contents)
      .set({
        title,
        contentType,
        language: language || null,
        contentUrl: contentUrl || null,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(contents.id, Number(id)))
      .returning();

    if (!updated || updated.length === 0) {
      return NextResponse.json({ success: false, error: "Content not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, content: updated[0] });
  } catch (error: any) {
    console.error("Failed to update content:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update content" },
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
        { success: false, error: "Missing content id parameter" },
        { status: 400 }
      );
    }

    await db.delete(contents).where(eq(contents.id, Number(id)));

    return NextResponse.json({ success: true, message: `Content ${id} deleted successfully.` });
  } catch (error: any) {
    console.error("Failed to delete content:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete content" },
      { status: 500 }
    );
  }
}

