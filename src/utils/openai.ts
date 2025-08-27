import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) {
	throw new Error("OPENAI_API_KEY is not set");
}

export const openai = createOpenAI({ apiKey });

export const openaiClient = new OpenAI({ apiKey });

export const EMBED_MODEL = process.env.EMBED_MODEL ?? "text-embedding-3-small";
