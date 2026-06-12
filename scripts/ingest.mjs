import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const knowledgeBaseDir = path.join(projectRoot, "public", "knowledge-base");
const dataDir = path.join(projectRoot, "data");
const vectorStorePath = path.join(dataDir, "vector-store.json");

await fs.mkdir(knowledgeBaseDir, { recursive: true });
await fs.mkdir(dataDir, { recursive: true });

const files = (await fs.readdir(knowledgeBaseDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);

await fs.writeFile(
  vectorStorePath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: "Run POST /api/ingest in the app for full parser-based indexing.",
      files
    },
    null,
    2
  )
);

console.log(`Prepared knowledge base folder with ${files.length} file(s).`);
