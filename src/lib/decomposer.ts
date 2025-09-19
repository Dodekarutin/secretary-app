const SEPARATORS = ["\n", "・", "- ", "— ", "→", "。", "；", ";", "。", "。 "];

export function decomposeRequirements(input: string): string[] {
  if (!input || !input.trim()) return [];

  let text = input;
  // unify bullets
  text = text
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u2022|\u25CF|\*/g, "・")
    .replace(/、/g, "。");

  // split by common separators
  let parts = text
    .split(/\n+|[・]|—\s|->|→|。|；|;|\u3002/g)
    .map((s) => s.trim())
    .filter(Boolean);

  // further split by conjunctions to make items actionable
  const refined: string[] = [];
  for (const p of parts) {
    const tmp = p
      .replace(/(そして|また|及び|かつ|and)/g, "|")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    refined.push(...tmp);
  }

  // normalize verbs to imperative style lightly
  const normalized = refined
    .map((s) =>
      s
        .replace(/すること。?$/g, "する")
        .replace(/。+$/g, "")
        .trim()
    )
    .map((s) => capitalizeFirst(s));

  // deduplicate while keeping order
  const seen = new Set<string>();
  const unique = normalized.filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function decomposeWithGemini(input: string): Promise<string[]> {
  if (!input || !input.trim()) return [];
  const { getGeminiClient } = await import("./aiClient");
  const ai = getGeminiClient();
  const prompt = buildDecompositionPrompt(input);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  const text = response.text;
  const parsed = tryParseTasksFromText(text);
  if (parsed.length > 0) return parsed;
  // フォールバック: AI 出力が期待形式でない場合はローカル分解に委ねる
  return decomposeRequirements(text);
}

function buildDecompositionPrompt(userInput: string): string {
  return [
    "あなたは優秀なタスク分解エージェントです。",
    "与えられた曖昧な要求・要望を、小さく実行可能で、依存関係を意識した具体的なタスクに分解してください。",
    "出力要件:",
    "- JSON 配列 (strings のみ)。",
    "- 各要素は 1 タスク = 1 行の短い命令形 (例: 'ログインフォームを実装する')。",
    "- 余計な前置き、解説、コードブロック、番号、見出しは一切出力しない。JSON 配列のみを返す。",
    "- タスクはできるだけ粒度を細かく (画面/状態/検証/API/テスト/文書化) に分ける。",
    "- 日本語で書く。",
    "- 依存がある場合は順序を意識して上から並べる。",
    "- 最大 30 個。冗長な重複は避ける。",
    "入力:",
    JSON.stringify(userInput),
  ].join("\n");
}

function tryParseTasksFromText(text: string): string[] {
  if (!text) return [];
  // まず JSON 配列を抽出してパース
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        const tasks = parsed
          .filter((v) => typeof v === "string")
          .map((s: string) => s.trim())
          .filter(Boolean);
        if (tasks.length > 0) return dedupe(tasks);
      }
    } catch {}
  }
  // 次に、テキストを行分割してプレーンリストとして扱う
  const lines = text
    .split(/\r?\n/)
    .map((s) =>
      s
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .trim()
    )
    .filter(Boolean);
  return dedupe(lines);
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const key = it.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}
