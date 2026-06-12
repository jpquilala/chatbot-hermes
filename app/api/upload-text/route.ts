import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOADS_DIR, ensureKnowledgeBase, ingestKnowledgeBase } from "@/lib/knowledge-base";

export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 3_500_000;

function sanitizeBaseName(fileName: string) {
  const originalExt = path.extname(fileName).toLowerCase();
  return (
    path
      .basename(fileName, originalExt)
      .replace(/[^a-z0-9-_ ]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "league-document"
  );
}

export async function POST(request: Request) {
  try {
    await ensureKnowledgeBase();
    const body = await request.json();
    const originalName = typeof body.fileName === "string" ? body.fileName : "document.pdf";
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json({ ok: false, error: "No extractable PDF text found" }, { status: 400 });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { ok: false, error: "Extracted PDF text is too large. Please split the PDF into smaller files." },
        { status: 413 }
      );
    }

    const safeBase = sanitizeBaseName(originalName);
    const safeName = `${safeBase}-${Date.now()}-pdf-text.md`;
    const destination = path.join(UPLOADS_DIR, safeName);
    const content = [`# Extracted PDF text: ${originalName}`, "", text].join("\n");

    await fs.writeFile(destination, content, "utf8");
    const index = await ingestKnowledgeBase();
    const uploadedDocument = index.documents.find((document) => document.fileName === safeName);

    if (!uploadedDocument || uploadedDocument.status === "failed") {
      await fs.rm(destination, { force: true });
      await ingestKnowledgeBase();
      return NextResponse.json(
        { ok: false, error: "The extracted PDF text could not be indexed." },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true, fileName: safeName, documents: index.documents });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to upload extracted PDF text" },
      { status: 500 }
    );
  }
}
