import path from "node:path";

export const knowledgeBaseDir = path.join(process.cwd(), "public", "knowledge-base");
export const dataDir = path.join(process.cwd(), "data");
export const vectorStorePath = path.join(dataDir, "vector-store.json");
export const documentStatusPath = path.join(dataDir, "document-status.json");
