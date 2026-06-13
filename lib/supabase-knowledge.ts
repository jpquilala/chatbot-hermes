import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { KnowledgeDocument, SourceChunk, VectorIndex } from "@/lib/knowledge-base";

const DOCUMENTS_TABLE = "knowledge_documents";
const CHUNKS_TABLE = "knowledge_chunks";

type KnowledgeDocumentRow = {
  id: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
  indexed_at: string | null;
  status: "pending" | "indexed" | "failed";
  metadata: Record<string, unknown> | null;
};

type KnowledgeChunkRow = {
  id: string;
  document_id: string;
  file_name: string;
  file_type: string;
  chunk_text: string;
  chunk_index: number;
  embedding: number[];
  metadata: Record<string, unknown> | null;
};

export function isSupabaseKnowledgeConfigured() {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function readSupabaseVectorIndex(): Promise<VectorIndex | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const [documentsResult, chunksResult] = await Promise.all([
    supabase.from(DOCUMENTS_TABLE).select("id,file_name,file_type,uploaded_at,indexed_at,status,metadata").order("uploaded_at", { ascending: true }),
    supabase.from(CHUNKS_TABLE).select("id,document_id,file_name,file_type,chunk_text,chunk_index,embedding,metadata").order("chunk_index", { ascending: true })
  ]);

  if (documentsResult.error) throw new Error(`Failed to read Supabase documents: ${documentsResult.error.message}`);
  if (chunksResult.error) throw new Error(`Failed to read Supabase chunks: ${chunksResult.error.message}`);

  const documents = ((documentsResult.data ?? []) as KnowledgeDocumentRow[]).map((row) => ({
    fileName: row.file_name,
    fileType: row.file_type,
    uploadedAt: row.uploaded_at,
    indexedAt: row.indexed_at ?? undefined,
    status: row.status
  } satisfies KnowledgeDocument));

  const chunks = ((chunksResult.data ?? []) as KnowledgeChunkRow[]).map((row) => ({
    id: row.id,
    documentId: row.document_id,
    fileName: row.file_name,
    fileType: row.file_type,
    chunkText: row.chunk_text,
    chunkIndex: row.chunk_index,
    metadata: row.metadata ?? undefined,
    embedding: Array.isArray(row.embedding) ? row.embedding.map(Number) : []
  } satisfies SourceChunk));

  if (!documents.length && !chunks.length) {
    return { generatedAt: "", documents: [], chunks: [] };
  }

  return {
    generatedAt: new Date().toISOString(),
    documents,
    chunks
  };
}

export async function listSupabaseDocuments(): Promise<KnowledgeDocument[] | null> {
  const index = await readSupabaseVectorIndex();
  return index?.documents ?? null;
}

export async function saveVectorIndexToSupabase(index: VectorIndex) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const indexedDocumentIds = new Set(index.documents.map((document) => documentIdForFileName(document.fileName)));

  if (indexedDocumentIds.size) {
    const { error: deleteChunksError } = await supabase
      .from(CHUNKS_TABLE)
      .delete()
      .in("document_id", [...indexedDocumentIds]);

    if (deleteChunksError) throw new Error(`Failed to replace Supabase chunks: ${deleteChunksError.message}`);
  }

  const documentRows = index.documents.map((document) => ({
    id: documentIdForFileName(document.fileName),
    file_name: document.fileName,
    file_type: document.fileType,
    uploaded_at: document.uploadedAt,
    indexed_at: document.indexedAt ?? null,
    status: document.status,
    metadata: {}
  }));

  if (documentRows.length) {
    const { error } = await supabase.from(DOCUMENTS_TABLE).upsert(documentRows, { onConflict: "id" });
    if (error) throw new Error(`Failed to save Supabase documents: ${error.message}`);
  }

  const chunkRows = index.chunks.map((chunk) => ({
    id: chunk.id,
    document_id: chunk.documentId,
    file_name: chunk.fileName,
    file_type: chunk.fileType,
    chunk_text: chunk.chunkText,
    chunk_index: chunk.chunkIndex,
    embedding: chunk.embedding,
    metadata: chunk.metadata ?? {}
  }));

  for (let start = 0; start < chunkRows.length; start += 500) {
    const batch = chunkRows.slice(start, start + 500);
    const { error } = await supabase.from(CHUNKS_TABLE).insert(batch);
    if (error) throw new Error(`Failed to save Supabase chunks: ${error.message}`);
  }
}

function documentIdForFileName(fileName: string) {
  return crypto.createHash("sha1").update(fileName).digest("hex");
}
