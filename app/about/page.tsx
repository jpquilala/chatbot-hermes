import { BadgeCheck, BookOpen, MessageSquareText } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";

const cards = [
  {
    title: "Official document answers",
    body: "The assistant answers using only files stored in the league knowledge base.",
    icon: BadgeCheck
  },
  {
    title: "League topics",
    body: "Ask about schedules, results, policies, rules, standings, announcements, and venue information.",
    icon: BookOpen
  },
  {
    title: "Player-friendly chat",
    body: "Questions can be asked in English, Tagalog, or Taglish, with sources shown below each answer.",
    icon: MessageSquareText
  }
];

export default function AboutPage() {
  return (
    <main className="px-4 py-10 sm:px-5 sm:py-14">
      <section className="mx-auto max-w-4xl">
        <div className="text-center">
          <LogoMark size="lg" centered />
          <h1 className="mt-6 text-balance text-3xl font-black text-white sm:text-5xl">
            Elder Amateur Basketball Association
          </h1>
          <p className="mt-3 text-lg font-semibold text-court-gold">
            40+ 4th Conference AI Assistant
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/65">
            This AI assistant helps players, coaches, admins, and fans ask
            questions about the EABA 40+ 4th Conference. It answers using only
            official league documents.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {cards.map(({ title, body, icon: Icon }) => (
            <article
              key={title}
              className="rounded-lg border border-white/10 bg-court-panel/85 p-4"
            >
              <div className="mb-3 inline-flex rounded-md bg-court-gold/12 p-2 text-court-gold">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/58">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
