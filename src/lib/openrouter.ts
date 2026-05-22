import OpenAI from "openai";

let client: OpenAI | null = null;

function createClient(): OpenAI {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    defaultHeaders: {
      "HTTP-Referer": process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000",
      "X-Title": "Startup Validation OS",
    },
  });
}

export function getOpenRouter(): OpenAI {
  if (!client) {
    client = createClient();
  }
  return client;
}

export function assertApiKey() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY mancante. Configura .env.local");
  }
}
