import { NextResponse } from "next/server";
import { listDocuments } from "@/lib/knowledge-base";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const documents = await listDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json(
      { documents: [], error: error instanceof Error ? error.message : "Failed to list documents" },
      { status: 500 }
    );
  }
}
