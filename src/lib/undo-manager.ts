/**
 * Undo/Redo マネージャー
 * Command パターンで操作の履歴を管理し、間違えた操作を元に戻せるようにする
 */

export interface Command {
  execute(): Promise<void>
  undo(): Promise<void>
  description: string
}

export class UndoManager {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private maxStackSize: number

  constructor(maxStackSize = 50) {
    this.maxStackSize = maxStackSize
  }

  async executeCommand(command: Command): Promise<void> {
    await command.execute()
    this.undoStack.push(command)
    // 新しいコマンドを実行したら redo スタックはクリア
    this.redoStack = []
    // スタックサイズの制限
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift()
    }
  }

  async undo(): Promise<boolean> {
    const command = this.undoStack.pop()
    if (!command) return false
    await command.undo()
    this.redoStack.push(command)
    return true
  }

  async redo(): Promise<boolean> {
    const command = this.redoStack.pop()
    if (!command) return false
    await command.execute()
    this.undoStack.push(command)
    return true
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  getLastUndoDescription(): string | null {
    const last = this.undoStack[this.undoStack.length - 1]
    return last?.description ?? null
  }

  getLastRedoDescription(): string | null {
    const last = this.redoStack[this.redoStack.length - 1]
    return last?.description ?? null
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }

  getUndoStackSize(): number {
    return this.undoStack.length
  }

  getRedoStackSize(): number {
    return this.redoStack.length
  }
}

