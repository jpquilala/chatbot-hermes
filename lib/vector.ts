export type VectorChunk = {
  id: string;
  documentId: string;
  fileName: string;
  fileType: string;
  chunkText: string;
  embedding: number[];
  metadata: {
    chunkIndex: number;
    uploadedAt: string;
    indexedAt: string;
  };
};

export type SearchResult = VectorChunk & {
  score: number;
};

const VECTOR_SIZE = 256;

export function localEmbedding(text: string) {
  const vector = new Array<number>(VECTOR_SIZE).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    vector[Math.abs(hash) % VECTOR_SIZE] += 1;
  }

  return normalize(vector);
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    magnitudeA += a[index] * a[index];
    magnitudeB += b[index] * b[index];
  }
  if (!magnitudeA || !magnitudeB) return 0;
  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

function normalize(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return vector;
  return vector.map((value) => value / magnitude);
}
