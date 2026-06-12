import { Database } from "lucide-react";
import { KnowledgeAdmin } from "@/components/knowledge-admin";

export default function KnowledgeBasePage() {
  return (
    <main className="px-4 py-6 sm:px-5 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-md border border-court-gold/30 bg-court-gold/12 p-3 text-court-gold">
            <Database className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              Knowledge Base
            </h1>
            <p className="mt-1 text-sm text-white/55">
              Manage official documents used by the EABA AI assistant.
            </p>
          </div>
        </div>
        <KnowledgeAdmin />
      </div>
    </main>
  );
}
