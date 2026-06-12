import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { KNOWLEDGE_BASE_DIR, ensureKnowledgeBase, ingestKnowledgeBase } from "@/lib/knowledge-base";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md", ".markdown", ".csv", ".json"]);

export async function POST(request: Request) {
  try {
    await ensureKnowledgeBase();
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    const originalName = file.name || "document.txt";
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ ok: false, error: "Unsupported document type" }, { status: 400 });
    }

    const safeBase = path
      .basename(originalName, ext)
      .replace(/[^a-z0-9-_ ]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "league-document";
    const safeName = `${safeBase}-${Date.now()}${ext}`;
    const destination = path.join(KNOWLEDGE_BASE_DIR, safeName);
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(destination, bytes);

    const index = await ingestKnowledgeBase();
    return NextResponse.json({ ok: true, fileName: safeName, documents: index.documents });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to upload document" },
      { status: 500 }
    );
  }
}
