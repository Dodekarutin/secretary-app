import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { getSettings } from "@/lib/settings";

export function getRuntimeGeminiApiKey(): string | undefined {
  const fromSettings = getSettings().geminiApiKey;
  if (fromSettings && fromSettings.trim()) return fromSettings.trim();
  const fromEnv =
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || undefined;
  return fromEnv;
}

export function getGeminiClient() {
  const key = getRuntimeGeminiApiKey();
  if (!key) throw new Error("VITE_GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey: key });
}

export function getRuntimeGeminiModel(): string {
  const s = getSettings();
  if (s.geminiModel && s.geminiModel.trim()) return s.geminiModel.trim();
  return (
    (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ||
    "gemini-2.5-flash"
  );
}

export function getRuntimeOpenAIApiKey(): string | undefined {
  const fromSettings = getSettings().openaiApiKey;
  if (fromSettings && fromSettings.trim()) return fromSettings.trim();
  const fromEnv =
    (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) || undefined;
  return fromEnv;
}

export function getOpenAIClient() {
  const key = getRuntimeOpenAIApiKey();
  if (!key) throw new Error("OpenAI API key is not set");
  return new OpenAI({
    apiKey: key,
    dangerouslyAllowBrowser: true, // ブラウザからの直接呼び出しを許可
  });
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const client = getOpenAIClient();

  // BlobをFileオブジェクトに変換
  const file = new File([audioBlob], "audio.webm", { type: audioBlob.type });

  const transcription = await client.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
    language: "ja", // 日本語を指定
  });

  return transcription.text;
}
