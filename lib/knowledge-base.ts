import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import OpenAI from "openai";
import { parse as parseCsvSync } from "csv-parse/sync";

export type KnowledgeDocument = {
  fileName: string;
  fileType: string;
  uploadedAt: string;
  indexedAt?: string;
  status: "pending" | "indexed" | "failed";
};

export type SourceChunk = {
  id: string;
  documentId: string;
  fileName: string;
  fileType: string;
  chunkText: string;
  chunkIndex: number;
  metadata?: Record<string, unknown>;
  embedding: number[];
};

type VectorIndex = {
  generatedAt: string;
  documents: KnowledgeDocument[];
  chunks: SourceChunk[];
};

export type ChatSource = {
  fileName: string;
  snippet: string;
  score?: number;
};

const ROOT = process.cwd();
export const KNOWLEDGE_BASE_DIR = path.join(ROOT, "public", "knowledge-base");
const WRITABLE_ROOT = process.env.VERCEL ? "/tmp/eaba-ai-chat" : path.join(ROOT, ".data");
export const DATA_DIR = WRITABLE_ROOT;
export const UPLOADS_DIR = path.join(WRITABLE_ROOT, "knowledge-base");
export const VECTOR_INDEX_PATH = path.join(DATA_DIR, "vector-index.json");
const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md", ".markdown", ".csv", ".json"]);
const VECTOR_SIZE = 256;
const NO_ANSWER = "I couldn't find that information in the current league documents. Please upload or update the league files in the knowledge base.";

export function noAnswerMessage() {
  return NO_ANSWER;
}

export async function ensureKnowledgeBase() {
  await fs.mkdir(KNOWLEDGE_BASE_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function listKnowledgeFiles() {
  await ensureKnowledgeBase();
  const entries = await Promise.all([listFilesInDir(KNOWLEDGE_BASE_DIR), listFilesInDir(UPLOADS_DIR)]);
  const uniqueFiles = new Map<string, string>();

  for (const filePath of entries.flat()) {
    uniqueFiles.set(path.basename(filePath), filePath);
  }

  return [...uniqueFiles.values()]
    .sort((a, b) => a.localeCompare(b));
}

export async function listDocuments(): Promise<KnowledgeDocument[]> {
  const index = await readVectorIndex();
  const indexedByName = new Map(index.documents.map((document) => [document.fileName, document]));
  const files = await listKnowledgeFiles();

  return Promise.all(
    files.map(async (filePath) => {
      const stat = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const indexed = indexedByName.get(fileName);
      return {
        fileName,
        fileType: path.extname(fileName).replace(/^\./, "").toUpperCase(),
        uploadedAt: stat.birthtime.toISOString(),
        indexedAt: indexed?.indexedAt,
        status: indexed?.status ?? "pending"
      } satisfies KnowledgeDocument;
    })
  );
}

export async function ingestKnowledgeBase(): Promise<VectorIndex> {
  await ensureKnowledgeBase();
  const files = await listKnowledgeFiles();
  const documents: KnowledgeDocument[] = [];
  const chunks: SourceChunk[] = [];

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const stat = await fs.stat(filePath);
    const fileType = path.extname(fileName).replace(/^\./, "").toUpperCase();

    try {
      const text = await extractText(filePath);
      const cleanText = normalizeWhitespace(text);
      const documentId = crypto.createHash("sha1").update(fileName).digest("hex");
      const documentChunks = splitIntoChunks(cleanText).map((chunkText, chunkIndex) => ({
        id: crypto.createHash("sha1").update(`${fileName}:${chunkIndex}:${chunkText}`).digest("hex"),
        documentId,
        fileName,
        fileType,
        chunkText,
        chunkIndex,
        metadata: { sourcePath: `/knowledge-base/${fileName}` },
        embedding: embedText(chunkText)
      }));

      documents.push({
        fileName,
        fileType,
        uploadedAt: stat.birthtime.toISOString(),
        indexedAt: new Date().toISOString(),
        status: documentChunks.length ? "indexed" : "failed"
      });
      chunks.push(...documentChunks);
    } catch {
      documents.push({
        fileName,
        fileType,
        uploadedAt: stat.birthtime.toISOString(),
        status: "failed"
      });
    }
  }

  const index: VectorIndex = { generatedAt: new Date().toISOString(), documents, chunks };
  await fs.writeFile(VECTOR_INDEX_PATH, JSON.stringify(index, null, 2));
  return index;
}

export async function retrieveContext(question: string, topK = 5): Promise<ChatSource[]> {
  let index = await readVectorIndex();
  const files = await listKnowledgeFiles();
  if (!index.generatedAt || index.chunks.length === 0 || files.length !== index.documents.length) {
    index = await ingestKnowledgeBase();
  }

  if (!index.chunks.length) return [];

  const questionVector = embedText(expandQuestion(question));
  const ranked = index.chunks
    .map((chunk) => ({ ...chunk, score: cosine(questionVector, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .filter((chunk) => chunk.score > 0.03);

  const fallback = isPlayerQuestion(question)
    ? index.chunks.filter((chunk) => /player|registration|registered/i.test(`${chunk.fileName} ${chunk.chunkText}`))
    : [];
  const selected: Array<SourceChunk & { score?: number }> = ranked.length ? ranked : fallback;

  return selected
    .slice(0, topK)
    .map((chunk) => ({
      fileName: chunk.fileName,
      snippet: chunk.chunkText.slice(0, 700),
      score: chunk.score
    }));
}

export async function answerWithAi(question: string, sources: ChatSource[]) {
  const countAnswer = await answerPlayerCountQuestion(question);
  if (countAnswer) return countAnswer;

  if (!sources.length) {
    return { answer: NO_ANSWER, sources: [] };
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || (process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : undefined);
  const model = process.env.OPENAI_MODEL || process.env.OPENROUTER_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return {
      answer: "AI provider is not configured yet. Add OPENAI_API_KEY or OPENROUTER_API_KEY to .env.local, then ask again. I will not generate a fake AI answer.",
      sources
    };
  }

  const client = new OpenAI({ apiKey, baseURL });
  const context = sources
    .map((source, index) => `SOURCE ${index + 1}: ${source.fileName}\n${source.snippet}`)
    .join("\n\n---\n\n");

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are the official AI assistant for the Elder Amateur Basketball Association 40+ 4th Conference. Answer user questions using only the provided league document context. Do not make up schedules, scores, rules, standings, teams, or policies. If the answer is not found in the context, say that the information is not available in the current league documents. Always provide a clear and helpful answer. Include document sources when available. Support Taglish-friendly answers if the user asks in Tagalog or Taglish. Preserve official wording for rules and policies where possible."
      },
      {
        role: "user",
        content: `Question: ${question}\n\nLeague document context:\n${context}`
      }
    ]
  });

  return {
    answer: completion.choices[0]?.message?.content?.trim() || NO_ANSWER,
    sources
  };
}

async function readVectorIndex(): Promise<VectorIndex> {
  await ensureKnowledgeBase();
  try {
    const raw = await fs.readFile(VECTOR_INDEX_PATH, "utf8");
    return JSON.parse(raw) as VectorIndex;
  } catch {
    return { generatedAt: "", documents: [], chunks: [] };
  }
}

async function listFilesInDir(directory: string) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => path.join(directory, entry.name));
  } catch {
    return [];
  }
}

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  if ([".txt", ".md", ".markdown"].includes(ext)) return buffer.toString("utf8");
  if (ext === ".json") return JSON.stringify(JSON.parse(buffer.toString("utf8")), null, 2);
  if (ext === ".csv") {
    const rows = parseCsvSync(buffer.toString("utf8"), { columns: true, skip_empty_lines: true });
    return rows.map((row: Record<string, unknown>) => JSON.stringify(row)).join("\n");
  }
  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (ext === ".pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text;
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

async function answerPlayerCountQuestion(question: string) {
  if (!isPlayerCountQuestion(question)) return null;

  const files = await listKnowledgeFiles();
  const csvFiles = files.filter((filePath) => path.extname(filePath).toLowerCase() === ".csv");
  const playerDocuments = [];

  for (const filePath of csvFiles) {
    const buffer = await fs.readFile(filePath);
    const rows = parseCsvSync(buffer.toString("utf8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Record<string, string>[];
    const headers = Object.keys(rows[0] ?? {}).join(" ");
    const fileName = path.basename(filePath);

    if (isPlayerDocument(`${fileName} ${headers}`)) {
      playerDocuments.push({ fileName, rows });
    }
  }

  if (!playerDocuments.length) return null;

  const total = playerDocuments.reduce((sum, document) => sum + document.rows.length, 0);
  const sourceText = playerDocuments
    .map((document) => `${document.fileName}: ${document.rows.length} player${document.rows.length === 1 ? "" : "s"}`)
    .join("\n");

  return {
    answer: `There are ${total} registered player${total === 1 ? "" : "s"} in the current league documents.`,
    sources: playerDocuments.map((document) => ({
      fileName: document.fileName,
      snippet: sourceText
    }))
  };
}

function isPlayerQuestion(question: string) {
  return /\b(player|players|registered|registration|roster|team|teams|jersey)\b/i.test(question);
}

function isPlayerCountQuestion(question: string) {
  return (
    /\b(how many|number of|count|total|ilan|ilang)\b/i.test(question) &&
    /\b(player|players|registered|registration|registrants)\b/i.test(question)
  );
}

function isPlayerDocument(value: string) {
  return /\b(player|players|registration|registered|birth|jersey|position|team)\b/i.test(value);
}

function expandQuestion(question: string) {
  if (!isPlayerQuestion(question)) return question;
  return `${question} player players registered registration roster team jersey position name`;
}

function splitIntoChunks(text: string, targetSize = 900, overlap = 140) {
  if (!text.trim()) return [];
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + targetSize, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks.filter(Boolean);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, "\n").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function embedText(text: string) {
  const vector = new Array(VECTOR_SIZE).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9+\s-]/g, " ")
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 1);

  for (const token of tokens) {
    const hash = crypto.createHash("md5").update(token).digest();
    const index = hash.readUInt16BE(0) % VECTOR_SIZE;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

function normalizeToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

function cosine(a: number[], b: number[]) {
  return a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
}
