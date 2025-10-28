const SEPARATORS = ["\n", "・", "- ", "— ", "→", "。", "；", ";", "。", "。 "];

export type DecomposedTask = {
  title: string;
  children?: DecomposedTask[];
};

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
  const { getGeminiClient, getRuntimeGeminiModel } = await import("./aiClient");
  const ai = getGeminiClient();
  const prompt = buildDecompositionPrompt(input);
  const response = await ai.models.generateContent({
    model: getRuntimeGeminiModel(),
    contents: prompt,
  });
  let text = "" as string;
  const anyRes: any = response as any;
  if (typeof anyRes.text === "function") {
    text = await anyRes.text();
  } else if (typeof anyRes.text === "string") {
    text = anyRes.text as string;
  }
  const parsed = tryParseTasksFromText(text);
  if (parsed.length > 0) return parsed;
  // フォールバック: AI 出力が期待形式でない場合はローカル分解に委ねる
  return decomposeRequirements(text);
}

export async function decomposeWithGeminiStructured(
  input: string
): Promise<DecomposedTask[]> {
  if (!input || !input.trim()) return [];
  const { getGeminiClient, getRuntimeGeminiModel } = await import("./aiClient");
  const ai = getGeminiClient();
  const prompt = buildStructuredDecompositionPrompt(input);
  const response = await ai.models.generateContent({
    model: getRuntimeGeminiModel(),
    contents: prompt,
  });
  let text = "" as string;
  const anyRes: any = response as any;
  if (typeof anyRes.text === "function") {
    text = await anyRes.text();
  } else if (typeof anyRes.text === "string") {
    text = anyRes.text as string;
  }
  const parsed = tryParseStructuredTasksFromText(text);
  if (parsed.length > 0) return parsed;
  // フォールバック: フラットなタスクリストから階層構造を推測
  const flatTasks = decomposeRequirements(text);
  return flatTasks.map((title) => ({ title }));
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

function buildStructuredDecompositionPrompt(userInput: string): string {
  return [
    "あなたは優秀なタスク分解エージェントです。",
    "与えられた曖昧な要求・要望を、階層構造を持った実行可能な具体的なタスクに分解してください。",
    "",
    "出力要件:",
    "- JSON 配列で返す。各要素は以下の形式:",
    '  { "title": "タスク名", "children": [ サブタスク配列（省略可） ] }',
    "- title は短い命令形（例: 'ログイン機能を実装'）",
    "- children は任意。サブタスクがある場合のみ含める（再帰的に同じ構造）",
    "- 階層は最大3レベルまで（親 > 子 > 孫）",
    "- 余計な前置き、解説、コードブロックは一切出力しない。JSON配列のみを返す。",
    "",
    "分解のポイント:",
    "- 大きな機能は親タスクとして、その実装ステップを子タスクに分ける",
    "- 粒度: 画面/状態管理/API/バリデーション/テスト/文書化",
    "- 依存関係を意識して順序を並べる",
    "- 日本語で書く",
    "- 各階層で重複を避ける",
    "- 全体で最大30タスク（子タスク含む）",
    "",
    "例:",
    "[",
    "  {",
    '    "title": "ユーザー認証機能を実装",',
    '    "children": [',
    '      { "title": "ログインフォームを作成" },',
    '      { "title": "認証APIを実装" },',
    '      { "title": "セッション管理を追加" }',
    "    ]",
    "  },",
    '  { "title": "ドキュメントを更新" }',
    "]",
    "",
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

function tryParseStructuredTasksFromText(text: string): DecomposedTask[] {
  if (!text) return [];

  // JSON 配列を抽出
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    // 型チェックとバリデーション
    const validateTask = (obj: any): obj is DecomposedTask => {
      if (typeof obj !== "object" || obj === null) return false;
      if (typeof obj.title !== "string" || !obj.title.trim()) return false;
      if (obj.children !== undefined) {
        if (!Array.isArray(obj.children)) return false;
        return obj.children.every(validateTask);
      }
      return true;
    };

    const tasks = parsed.filter(validateTask);
    if (tasks.length === 0) return [];

    // 重複除去（階層的に）
    return dedupeStructured(tasks);
  } catch (e) {
    console.error("Failed to parse structured tasks:", e);
    return [];
  }
}

function dedupeStructured(tasks: DecomposedTask[]): DecomposedTask[] {
  const seen = new Set<string>();
  const result: DecomposedTask[] = [];

  for (const task of tasks) {
    const key = task.title.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const dedupedTask: DecomposedTask = { title: task.title.trim() };
    if (task.children && task.children.length > 0) {
      dedupedTask.children = dedupeStructured(task.children);
    }
    result.push(dedupedTask);
  }

  return result;
}

// 階層構造をフラットなリストに変換するユーティリティ
export function flattenTasks(tasks: DecomposedTask[]): string[] {
  const result: string[] = [];
  const traverse = (task: DecomposedTask) => {
    result.push(task.title);
    if (task.children) {
      task.children.forEach(traverse);
    }
  };
  tasks.forEach(traverse);
  return result;
}
