import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export function getGeminiClient() {
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
}
