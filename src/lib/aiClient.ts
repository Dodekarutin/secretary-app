import { GoogleGenAI } from "@google/genai"
import { getSettings } from "@/lib/settings"

export function getRuntimeGeminiApiKey(): string | undefined {
  const fromSettings = getSettings().geminiApiKey
  if (fromSettings && fromSettings.trim()) return fromSettings.trim()
  const fromEnv = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || undefined
  return fromEnv
}

export function getGeminiClient() {
  const key = getRuntimeGeminiApiKey()
  if (!key) throw new Error("VITE_GEMINI_API_KEY is not set")
  return new GoogleGenAI({ apiKey: key })
}

export function getRuntimeGeminiModel(): string {
  const s = getSettings()
  if (s.geminiModel && s.geminiModel.trim()) return s.geminiModel.trim()
  return (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || "gemini-2.5-flash"
}
