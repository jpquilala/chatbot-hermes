import { NextResponse } from "next/server";
import { answerCasualQuestion, answerWithAi, retrieveContext } from "@/lib/knowledge-base";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const casualAnswer = answerCasualQuestion(question);
    if (casualAnswer) {
      return NextResponse.json(casualAnswer);
    }

    const sources = await retrieveContext(question);
    const payload = await answerWithAi(question, sources);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        answer: "Failed to process the question. Please check the server logs and AI provider configuration.",
        sources: [],
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
