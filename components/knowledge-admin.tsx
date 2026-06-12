"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { FileText, Loader2, RefreshCw, Upload } from "lucide-react";

type DocumentRecord = {
  fileName: string;
  fileType: string;
  uploadedAt: string;
  indexedAt?: string;
  status: "pending" | "indexed" | "failed";
};

export function KnowledgeAdmin() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadDocuments() {
    const response = await fetch("/api/documents", { cache: "no-store" });
    const payload = await response.json();
    setDocuments(payload.documents ?? []);
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus("Processing document...");
    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: form });
      if (!response.ok) throw new Error("Upload failed");
      setStatus("Document indexed successfully");
      await loadDocuments();
    } catch {
      setStatus("Failed to process document");
    } finally {
      event.target.value = "";
      setBusy(false);
    }
  }

  async function reindex() {
    setBusy(true);
    setStatus("Processing document...");
    try {
      const response = await fetch("/api/ingest", { method: "POST" });
      if (!response.ok) throw new Error("Index failed");
      setStatus("Document indexed successfully");
      await loadDocuments();
    } catch {
      setStatus("Failed to process document");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-court-gold/20 bg-court-panel/90 p-4 shadow-gold sm:p-5">
        <p className="text-sm leading-6 text-white/64">
          Upload official league documents here. The AI assistant will use
          these files as its knowledge base.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-court-gold/38 bg-black/20 px-4 py-5 text-center transition hover:border-court-gold">
            <Upload className="h-7 w-7 text-court-gold" aria-hidden="true" />
            <span className="mt-2 text-sm font-bold text-white">Upload document</span>
            <span className="mt-1 text-xs text-white/45">PDF, DOCX, TXT, MD, CSV, or JSON</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json"
              className="sr-only"
              onChange={uploadFile}
              disabled={busy}
            />
          </label>
          <button
            type="button"
            onClick={reindex}
            disabled={busy}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md border border-court-gold/40 bg-court-gold px-4 text-sm font-bold text-black transition hover:bg-[#ffd36a] disabled:opacity-50 sm:min-w-52"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Re-index Knowledge Base
          </button>
        </div>
        {status ? (
          <p className="mt-3 rounded-md border border-white/10 bg-black/22 px-3 py-2 text-sm text-white/68">
            {status}
          </p>
        ) : null}
      </section>

      <section className="grid gap-3">
        {documents.length ? (
          documents.map((document) => (
            <article
              key={document.fileName}
              className="rounded-lg border border-white/10 bg-court-panel/82 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-court-gold/12 p-2 text-court-gold">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-bold text-white">{document.fileName}</h2>
                  <div className="mt-2 grid gap-1 text-xs text-white/50 sm:grid-cols-3">
                    <span>Type: {document.fileType || "unknown"}</span>
                    <span>Uploaded: {formatDate(document.uploadedAt)}</span>
                    <span>Indexed: {document.indexedAt ? formatDate(document.indexedAt) : "Not yet"}</span>
                  </div>
                </div>
                <span className={statusClass(document.status)}>{document.status}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-white/10 bg-court-panel/75 p-5 text-sm text-white/54">
            No league documents found in the knowledge base yet.
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function statusClass(status: DocumentRecord["status"]) {
  const base = "rounded-full px-3 py-1 text-xs font-bold capitalize";
  if (status === "indexed") return `${base} bg-court-green/16 text-[#62d99a]`;
  if (status === "failed") return `${base} bg-court-red/16 text-[#ff7d73]`;
  return `${base} bg-court-gold/16 text-court-gold`;
}
