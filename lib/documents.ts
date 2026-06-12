import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseCsv } from "csv-parse/sync";
import { dataDir, documentStatusPath, knowledgeBaseDir, vectorStorePath } from "@/lib/paths";
import { cosineSimilarity, localEmbedding, SearchResult, VectorChunk } from "@/lib/vector";

export type DocumentRecord = {
  fileName: string;
  fileType: string;
  uploadedAt: string;
  indexedAt?: string;
  status: "pending" | "indexed" | "failed";
};

type VectorStore = {
  generatedAt: string;
  chunks: VectorChunk[];
};

const supportedExtensions = new Set([".pdf", ".docx", ".txt", ".md", ".markdown", ".csv", ".json"]);

export async function ensureStorage() {
  await fs.mkdir(knowledgeBaseDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });
}

export async function listKnowledgeFiles() {
  await ensureStorage();
  const entries = await fs.readdir(knowledgeBaseDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => supportedExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

export async function readDocumentStatuses(): Promise<Record<string, DocumentRecord>> {
  await ensureStorage();
  try {
    return JSON.parse(await fs.readFile(documentStatusPath, "utf8"));
  } catch {
    return {};
  }
}

export async function writeDocumentStatuses(statuses: Record<string, DocumentRecord>) {
  await ensureStorage();
  await fs.writeFile(documentStatusPath, JSON.stringify(statuses, null, 2));
}

export async function getDocuments(): Promise<DocumentRecord[]> {
  const files = await listKnowledgeFiles();
  const statuses = await readDocumentStatuses();

  return Promise.all(
    files.map(async (fileName) => {
      const filePath = path.join(knowledgeBaseDir, fileName);
      const stats = await fs.stat(filePath);
      return (
        statuses[fileName] ?? {
          fileName,
          fileType: path.extname(fileName).slice(1).toUpperCase(),
          uploadedAt: stats.mtime.toISOString(),
          status: "pending"
        }
      );
    })
  );
}

export async function ingestKnowledgeBase() {
  await ensureStorage();
  const files = await listKnowledgeFiles();
  const statuses = await readDocumentStatuses();
  const chunks: VectorChunk[] = [];
  const indexedAt = new Date().toISOString();

  for (const fileName of files) {
    const filePath = path.join(knowledgeBaseDir, fileName);
    const stats = await fs.stat(filePath);
    const fileType = path.extname(fileName).slice(1).toUpperCase();

    try {
      const text = await extractText(filePath);
      const textChunks = splitIntoChunks(text);
      textChunks.forEach((chunkText, chunkIndex) => {
        chunks.push({
          id: `${fileName}-${chunkIndex}`,
          documentId: fileName,
          fileName,
          fileType,
          chunkText,
          embedding: localEmbedding(chunkText),
          metadata: {
            chunkIndex,
            uploadedAt: stats.mtime.toISOString(),
            indexedAt
          }
        });
      });
      statuses[fileName] = {
        fileName,
        fileType,
        uploadedAt: stats.mtime.toISOString(),
        indexedAt,
        status: "indexed"
      };
    } catch {
      statuses[fileName] = {
        fileName,
        fileType,
        uploadedAt: stats.mtime.toISOString(),
        indexedAt,
        status: "failed"
      };
    }
  }

  const store: VectorStore = { generatedAt: indexedAt, chunks };
  await fs.writeFile(vectorStorePath, JSON.stringify(store, null, 2));
  await writeDocumentStatuses(statuses);
  return store;
}

export async function searchKnowledgeBase(question: string, limit = 5): Promise<SearchResult[]> {
  const store = await readOrCreateVectorStore();
  const questionEmbedding = localEmbedding(question);

  return store.chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(questionEmbedding, chunk.embedding)
    }))
    .filter((chunk) => chunk.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function readOrCreateVectorStore(): Promise<VectorStore> {
  await ensureStorage();
  try {
    const store = JSON.parse(await fs.readFile(vectorStorePath, "utf8")) as VectorStore;
    const files = await listKnowledgeFiles();
    const storeFiles = new Set(store.chunks.map((chunk) => chunk.fileName));
    const missingFile = files.some((fileName) => !storeFiles.has(fileName));
    if (!missingFile) return store;
  } catch {
    // Rebuild below when no index exists or the existing file is invalid.
  }
  return ingestKnowledgeBase();
}

async function extractText(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  if (extension === ".pdf") {
    const pdfModule = (await import("pdf-parse")) as unknown as {
      default?: (data: Buffer) => Promise<{ text: string }>;
    } & ((data: Buffer) => Promise<{ text: string }>);
    const pdf = pdfModule.default ?? pdfModule;
    const parsed = await pdf(buffer);
    return parsed.text;
  }

  if (extension === ".docx") {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value;
  }

  if (extension === ".csv") {
    const records = parseCsv(buffer.toString("utf8"), { relaxColumnCount: true });
    return records.map((row: unknown[]) => row.join(" | ")).join("\n");
  }

  if (extension === ".json") {
    return JSON.stringify(JSON.parse(buffer.toString("utf8")), null, 2);
  }

  return buffer.toString("utf8");
}

function splitIntoChunks(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const words = clean.split(" ");
  const chunks: string[] = [];
  const chunkSize = 180;
  const overlap = 35;

  for (let start = 0; start < words.length; start += chunkSize - overlap) {
    chunks.push(words.slice(start, start + chunkSize).join(" "));
  }

  return chunks;
}
