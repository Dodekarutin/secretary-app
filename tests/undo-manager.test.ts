import { describe, it, expect, vi } from "vitest"
import { UndoManager, Command } from "@/lib/undo-manager"

// テスト用のシンプルなCommand実装
class TestCommand implements Command {
  description: string
  private value: { current: number }
  private oldValue: number
  private newValue: number

  constructor(value: { current: number }, newValue: number, description: string) {
    this.value = value
    this.oldValue = value.current
    this.newValue = newValue
    this.description = description
  }

  async execute(): Promise<void> {
    this.value.current = this.newValue
  }

  async undo(): Promise<void> {
    this.value.current = this.oldValue
  }
}

describe("UndoManager", () => {
  it("初期状態ではUndo/Redoできない", () => {
    const manager = new UndoManager()
    expect(manager.canUndo()).toBe(false)
    expect(manager.canRedo()).toBe(false)
  })

  it("コマンドを実行するとUndoが可能になる", async () => {
    const manager = new UndoManager()
    const value = { current: 0 }
    const cmd = new TestCommand(value, 10, "値を10に変更")

    await manager.executeCommand(cmd)
    expect(value.current).toBe(10)
    expect(manager.canUndo()).toBe(true)
    expect(manager.canRedo()).toBe(false)
  })

  it("Undoを実行すると元の状態に戻る", async () => {
    const manager = new UndoManager()
    const value = { current: 0 }
    const cmd = new TestCommand(value, 10, "値を10に変更")

    await manager.executeCommand(cmd)
    expect(value.current).toBe(10)

    await manager.undo()
    expect(value.current).toBe(0)
    expect(manager.canUndo()).toBe(false)
    expect(manager.canRedo()).toBe(true)
  })

  it("Redoを実行すると再度変更が適用される", async () => {
    const manager = new UndoManager()
    const value = { current: 0 }
    const cmd = new TestCommand(value, 10, "値を10に変更")

    await manager.executeCommand(cmd)
    await manager.undo()
    expect(value.current).toBe(0)

    await manager.redo()
    expect(value.current).toBe(10)
    expect(manager.canUndo()).toBe(true)
    expect(manager.canRedo()).toBe(false)
  })

  it("複数のコマンドをUndo/Redoできる", async () => {
    const manager = new UndoManager()
    const value = { current: 0 }

    await manager.executeCommand(new TestCommand(value, 10, "10に変更"))
    await manager.executeCommand(new TestCommand(value, 20, "20に変更"))
    await manager.executeCommand(new TestCommand(value, 30, "30に変更"))
    expect(value.current).toBe(30)

    await manager.undo()
    expect(value.current).toBe(20)

    await manager.undo()
    expect(value.current).toBe(10)

    await manager.redo()
    expect(value.current).toBe(20)
  })

  it("新しいコマンドを実行するとRedoスタックがクリアされる", async () => {
    const manager = new UndoManager()
    const value = { current: 0 }

    await manager.executeCommand(new TestCommand(value, 10, "10に変更"))
    await manager.executeCommand(new TestCommand(value, 20, "20に変更"))
    await manager.undo()
    expect(manager.canRedo()).toBe(true)

    // 新しいコマンドを実行
    await manager.executeCommand(new TestCommand(value, 30, "30に変更"))
    expect(manager.canRedo()).toBe(false)
    expect(value.current).toBe(30)
  })

  it("スタックサイズの制限が機能する", async () => {
    const manager = new UndoManager(3)
    const value = { current: 0 }

    await manager.executeCommand(new TestCommand(value, 10, "10に変更"))
    await manager.executeCommand(new TestCommand(value, 20, "20に変更"))
    await manager.executeCommand(new TestCommand(value, 30, "30に変更"))
    await manager.executeCommand(new TestCommand(value, 40, "40に変更"))

    expect(manager.getUndoStackSize()).toBe(3)
    expect(value.current).toBe(40)

    // 最も古いコマンド（10に変更）は削除されているはず
    await manager.undo()
    expect(value.current).toBe(30)
    await manager.undo()
    expect(value.current).toBe(20)
    await manager.undo()
    expect(value.current).toBe(10) // これが最後（最も古い10への変更はまだ残っている）
    expect(manager.canUndo()).toBe(false)
  })

  it("getLastUndoDescription/getLastRedoDescriptionが正しく動作する", async () => {
    const manager = new UndoManager()
    const value = { current: 0 }

    expect(manager.getLastUndoDescription()).toBeNull()
    expect(manager.getLastRedoDescription()).toBeNull()

    await manager.executeCommand(new TestCommand(value, 10, "値を10に変更"))
    expect(manager.getLastUndoDescription()).toBe("値を10に変更")

    await manager.undo()
    expect(manager.getLastRedoDescription()).toBe("値を10に変更")
    expect(manager.getLastUndoDescription()).toBeNull()
  })

  it("clearでスタックをクリアできる", async () => {
    const manager = new UndoManager()
    const value = { current: 0 }

    await manager.executeCommand(new TestCommand(value, 10, "10に変更"))
    await manager.executeCommand(new TestCommand(value, 20, "20に変更"))
    expect(manager.canUndo()).toBe(true)

    manager.clear()
    expect(manager.canUndo()).toBe(false)
    expect(manager.canRedo()).toBe(false)
    expect(manager.getUndoStackSize()).toBe(0)
    expect(manager.getRedoStackSize()).toBe(0)
  })
})

