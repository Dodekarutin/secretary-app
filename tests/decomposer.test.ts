import { describe, expect, it } from "vitest";
import { decomposeRequirements } from "@/lib/decomposer";

describe("decomposeRequirements", () => {
  it("空は空配列", () => {
    expect(decomposeRequirements("")).toEqual([]);
  });

  it("改行・句点・箇条書きを分割", () => {
    const input = `ユーザ登録を作る。\nメール認証を追加する\n・フォームのバリデーション\n- 成功時にトースト`;
    const out = decomposeRequirements(input);
    expect(out.length).toBeGreaterThanOrEqual(4);
    expect(out).toEqual(
      expect.arrayContaining([
        expect.stringContaining("ユーザ登録"),
        expect.stringContaining("メール認証"),
        expect.stringContaining("バリデーション"),
        expect.stringContaining("トースト"),
      ])
    );
  });

  it("重複を除去", () => {
    const input = `API を作る。API を作る。`;
    const out = decomposeRequirements(input);
    const set = new Set(out);
    expect(out.length).toBe(set.size);
  });
});
