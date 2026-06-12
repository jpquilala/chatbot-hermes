import { Trophy } from "lucide-react";
import { AssistantSearch } from "@/components/assistant-search";
import { LogoMark } from "@/components/logo-mark";

export default function HomePage() {
  return (
    <main className="px-4 py-10 sm:px-5 sm:py-14">
      <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <LogoMark size="lg" centered />
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-court-gold/30 bg-court-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-court-gold">
          <Trophy className="h-4 w-4" aria-hidden="true" />
          40+ 4th Conference AI Assistant
        </div>
        <h1 className="mt-5 text-balance text-4xl font-black leading-tight text-white sm:text-5xl">
          EABA 40+ AI Assistant
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white/66 sm:text-lg">
          Ask anything about the league — schedules, results, rules, teams,
          standings, and announcements.
        </p>
        <div className="mt-8 w-full">
          <AssistantSearch />
        </div>
        <p className="mt-5 text-sm text-white/45">
          Start by asking about the next game, latest results, team standings,
          or league policies.
        </p>
      </section>
    </main>
  );
}
