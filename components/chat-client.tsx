"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, SendHorizontal, Sparkles, UserRound } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";

type Source = {
  fileName: string;
  snippet?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

const noAnswer =
  "I couldn't find that information in the current league documents. Please upload or update the league files in the knowledge base.";

export function ChatClient() {
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get("q") ?? "";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const askedInitial = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialQuestion && !askedInitial.current) {
      askedInitial.current = true;
      void ask(initialQuestion);
    }
  }, [initialQuestion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function ask(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: cleanQuestion
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion })
      });

      const payload = await response.json();
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: payload.answer || noAnswer,
          sources: payload.sources ?? []
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Failed to process the question. Please try again.",
          sources: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  return (
    <main className="min-h-[calc(100vh-137px)] pb-28">
      <div className="sticky top-[65px] z-20 border-b border-white/10 bg-court-black/86 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <LogoMark size="sm" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-white">EABA Assistant</h1>
            <p className="truncate text-xs text-white/50">Answers from official league documents</p>
          </div>
          <button
            type="button"
            onClick={() => setMessages([])}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-white/74 transition hover:border-court-gold/50 hover:text-court-gold"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">New chat</span>
          </button>
        </div>
      </div>

      <section className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-court-panel/80 p-5 text-white/65">
            Start by asking about the next game, latest results, team standings,
            or league policies.
          </div>
        ) : null}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-court-gold px-4 py-3 text-sm font-semibold leading-6 text-black sm:max-w-[72%]">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase text-black/55">
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  You
                </div>
                {message.content}
              </div>
            </div>
          ) : (
            <article
              key={message.id}
              className="rounded-lg border border-court-gold/20 bg-court-panel/92 p-4 shadow-gold"
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-court-gold">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                EABA AI
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-white/82">
                {message.content}
              </p>
              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-white/45">
                  Sources
                </p>
                {message.sources?.length ? (
                  <div className="mt-2 grid gap-2">
                    {message.sources.map((source, index) => (
                      <details
                        key={`${source.fileName}-${index}`}
                        className="rounded-md border border-white/10 bg-black/24 p-3 text-sm text-white/68"
                      >
                        <summary className="cursor-pointer font-semibold text-white">
                          {source.fileName}
                        </summary>
                        {source.snippet ? (
                          <p className="mt-2 line-clamp-4 text-xs leading-5 text-white/52">
                            {source.snippet}
                          </p>
                        ) : null}
                      </details>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-white/45">No matching document sources found.</p>
                )}
              </div>
            </article>
          )
        )}

        {loading ? (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-4 py-2 text-sm text-white/65">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Processing document context...
          </div>
        ) : null}
        <div ref={bottomRef} />
      </section>

      <form
        onSubmit={onSubmit}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-court-black/92 px-4 py-3 backdrop-blur"
      >
        <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-court-gold/25 bg-court-panel p-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about the league..."
            rows={1}
            className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/36"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-court-gold text-black transition hover:bg-[#ffd36a] disabled:opacity-40"
            aria-label="Send question"
          >
            <SendHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </main>
  );
}
