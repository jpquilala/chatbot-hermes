"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal } from "lucide-react";
import { SuggestedChip } from "@/components/suggested-chip";

const suggestions = [
  "When is the next game?",
  "Show latest game results",
  "What are the league rules?",
  "Show team standings",
  "Who are the registered teams?",
  "What is the player eligibility policy?"
];

export function AssistantSearch() {
  const router = useRouter();
  const [question, setQuestion] = useState("");

  function submit(value?: string) {
    const nextQuestion = (value ?? question).trim();
    if (!nextQuestion) return;
    router.push(`/chat?q=${encodeURIComponent(nextQuestion)}`);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  return (
    <div className="w-full">
      <form
        onSubmit={onSubmit}
        className="rounded-[28px] border border-court-gold/35 bg-court-panel/90 p-2 shadow-gold backdrop-blur"
      >
        <div className="flex min-h-16 items-end gap-2">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about game schedules, results, policies, rules, or standings..."
            rows={2}
            className="max-h-36 min-h-14 flex-1 resize-none rounded-3xl border-0 bg-transparent px-4 py-3 text-base text-white outline-none placeholder:text-white/38"
          />
          <button
            type="submit"
            aria-label="Ask EABA AI"
            className="mb-1 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-court-gold text-black transition hover:bg-[#ffd36a] disabled:opacity-50"
            disabled={!question.trim()}
          >
            <SendHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {suggestions.map((suggestion) => (
          <SuggestedChip key={suggestion} onClick={submit}>
            {suggestion}
          </SuggestedChip>
        ))}
      </div>
    </div>
  );
}
