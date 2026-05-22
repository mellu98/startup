import { NextResponse } from "next/server";
import { getOpenRouter } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const completion = await getOpenRouter().chat.completions.create({
      model: "deepseek/deepseek-v4-pro",
      messages: [{ role: "user", content: "Say hello in Italian." }],
      max_tokens: 10,
    });
    return NextResponse.json({ ok: true, content: completion.choices[0]?.message?.content });
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? { message: err.message, stack: err.stack, name: err.name } : String(err);
    return NextResponse.json({ ok: false, error: errorDetails }, { status: 500 });
  }
}
