import { NextResponse } from "next/server";
import { ingestKnowledgeBase } from "@/lib/knowledge-base";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const index = await ingestKnowledgeBase();
    return NextResponse.json({ ok: true, documents: index.documents, chunks: index.chunks.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to index knowledge base" },
      { status: 500 }
    );
  }
}
