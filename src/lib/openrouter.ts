import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY;

export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: apiKey ?? "",
  defaultHeaders: {
    "HTTP-Referer": process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000",
    "X-Title": "Startup Validation OS",
  },
});

export function assertApiKey() {
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY mancante. Configura .env.local");
  }
}
