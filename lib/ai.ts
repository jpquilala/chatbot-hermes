import OpenAI from "openai";
import { SearchResult } from "@/lib/vector";

const noAnswer =
  "I couldn't find that information in the current league documents. Please upload or update the league files in the knowledge base.";

export async function answerQuestion(question: string, contexts: SearchResult[]) {
  if (!contexts.length) {
    return { answer: noAnswer, sources: [] };
  }

  const sources = dedupeSources(contexts);

  if (!process.env.OPENAI_API_KEY) {
    return {
      answer: buildExtractiveAnswer(question, contexts),
      sources
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const contextText = contexts
    .map(
      (context, index) =>
        `[Source ${index + 1}: ${context.fileName}]\n${context.chunkText}`
    )
    .join("\n\n");

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are the official AI assistant for the Elder Amateur Basketball Association 40+ 4th Conference. Answer user questions using only the provided league document context. Do not make up schedules, scores, rules, standings, teams, or policies. If the answer is not found in the context, say that the information is not available in the current league documents. Always provide a clear and helpful answer. Include document sources when available. Support Taglish-friendly answers if the user asks in Tagalog or Taglish. Preserve official wording for rules and policies where possible."
      },
      {
        role: "user",
        content: `Question: ${question}\n\nLeague document context:\n${contextText}`
      }
    ]
  });

  return {
    answer: completion.choices[0]?.message.content?.trim() || noAnswer,
    sources
  };
}

function buildExtractiveAnswer(question: string, contexts: SearchResult[]) {
  const top = contexts.slice(0, 3);
  const snippets = top.map((context) => `From ${context.fileName}: ${context.chunkText}`);
  return [
    "I found the following relevant information in the current league documents:",
    "",
    ...snippets,
    "",
    "For a more conversational summary, configure OPENAI_API_KEY in the deployment environment."
  ].join("\n");
}

function dedupeSources(contexts: SearchResult[]) {
  const seen = new Set<string>();
  return contexts
    .filter((context) => {
      if (seen.has(context.fileName)) return false;
      seen.add(context.fileName);
      return true;
    })
    .map((context) => ({
      fileName: context.fileName,
      snippet: context.chunkText.slice(0, 360)
    }));
}
