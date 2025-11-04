import type { Command } from "./undo-manager"
import type { DataAdapter } from "@/adapters/data-adapter"
import type { Id, Task } from "@/types/domain"

/**
 * タスク完了/未完了トグルコマンド
 */
export class CompleteTaskCommand implements Command {
  description: string
  private adapter: DataAdapter
  private taskId: Id
  private previousState: {
    progress: number
    columnId: Id
  }
  private targetCompleted: boolean
  private doneColumnId: Id

  constructor(
    adapter: DataAdapter,
    taskId: Id,
    currentTask: Task,
    targetCompleted: boolean,
    doneColumnId: Id,
    previousColumnId?: Id
  ) {
    this.adapter = adapter
    this.taskId = taskId
    this.targetCompleted = targetCompleted
    this.doneColumnId = doneColumnId
    this.description = targetCompleted
      ? `タスク「${currentTask.title}」を完了`
      : `タスク「${currentTask.title}」を未完了に戻す`

    // 現在の状態を保存
    if (targetCompleted) {
      // 完了にする場合：現在のprogressと列を保存
      this.previousState = {
        progress: currentTask.progress,
        columnId: currentTask.columnId,
      }
    } else {
      // 未完了に戻す場合：progress=0にして、指定された列に戻す
      this.previousState = {
        progress: 0,
        columnId: previousColumnId ?? currentTask.columnId,
      }
    }
  }

  async execute(): Promise<void> {
    if (this.targetCompleted) {
      // 完了: progress=100 にして Done 列に移動
      await this.adapter.updateTask(this.taskId, { 
        progress: 100,
        columnId: this.doneColumnId
      })
    } else {
      // 未完了: 以前の progress に戻して元の列に戻す
      await this.adapter.updateTask(this.taskId, {
        progress: this.previousState.progress,
        columnId: this.previousState.columnId,
      })
    }
  }

  async undo(): Promise<void> {
    if (this.targetCompleted) {
      // 完了を取り消し: 元の状態に戻す
      await this.adapter.updateTask(this.taskId, {
        progress: this.previousState.progress,
        columnId: this.previousState.columnId,
      })
    } else {
      // 未完了を取り消し: 再び完了状態にして Done 列に移動
      await this.adapter.updateTask(this.taskId, { 
        progress: 100,
        columnId: this.doneColumnId
      })
    }
  }
}

/**
 * タスク更新コマンド
 */
export class UpdateTaskCommand implements Command {
  description: string
  private adapter: DataAdapter
  private taskId: Id
  private newValues: Partial<Task>
  private oldValues: Partial<Task>

  constructor(
    adapter: DataAdapter,
    taskId: Id,
    taskTitle: string,
    oldValues: Partial<Task>,
    newValues: Partial<Task>
  ) {
    this.adapter = adapter
    this.taskId = taskId
    this.oldValues = oldValues
    this.newValues = newValues
    this.description = `タスク「${taskTitle}」を更新`
  }

  async execute(): Promise<void> {
    await this.adapter.updateTask(this.taskId, this.newValues)
  }

  async undo(): Promise<void> {
    await this.adapter.updateTask(this.taskId, this.oldValues)
  }
}

/**
 * タスク移動コマンド
 */
export class MoveTaskCommand implements Command {
  description: string
  private adapter: DataAdapter
  private taskId: Id
  private fromColumnId: Id
  private fromIndex: number
  private toColumnId: Id
  private toIndex: number

  constructor(
    adapter: DataAdapter,
    taskId: Id,
    taskTitle: string,
    fromColumnId: Id,
    fromIndex: number,
    toColumnId: Id,
    toIndex: number
  ) {
    this.adapter = adapter
    this.taskId = taskId
    this.fromColumnId = fromColumnId
    this.fromIndex = fromIndex
    this.toColumnId = toColumnId
    this.toIndex = toIndex
    this.description = `タスク「${taskTitle}」を移動`
  }

  async execute(): Promise<void> {
    await this.adapter.moveTask(this.taskId, this.toColumnId, this.toIndex)
  }

  async undo(): Promise<void> {
    await this.adapter.moveTask(this.taskId, this.fromColumnId, this.fromIndex)
  }
}

/**
 * タスク追加コマンド
 */
export class AddTaskCommand implements Command {
  description: string
  private adapter: DataAdapter
  private projectId: Id
  private columnId: Id
  private title: string
  private createdTaskId: Id | null = null

  constructor(adapter: DataAdapter, projectId: Id, columnId: Id, title: string) {
    this.adapter = adapter
    this.projectId = projectId
    this.columnId = columnId
    this.title = title
    this.description = `タスク「${title}」を追加`
  }

  async execute(): Promise<void> {
    const task = await this.adapter.addTask(
      this.projectId,
      this.columnId,
      this.title
    )
    this.createdTaskId = task.id
  }

  async undo(): Promise<void> {
    if (this.createdTaskId) {
      await this.adapter.removeTask(this.createdTaskId)
    }
  }
}

/**
 * タスク削除コマンド
 */
export class RemoveTaskCommand implements Command {
  description: string
  private adapter: DataAdapter
  private task: Task
  private relatedData: {
    checklist: any[]
    comments: any[]
    tags: any[]
  }

  constructor(adapter: DataAdapter, task: Task) {
    this.adapter = adapter
    this.task = task
    this.description = `タスク「${task.title}」を削除`
    this.relatedData = {
      checklist: [],
      comments: [],
      tags: [],
    }
  }

  async execute(): Promise<void> {
    // 削除前に関連データを保存
    this.relatedData.checklist = await this.adapter.listChecklist(this.task.id)
    this.relatedData.comments = await this.adapter.listComments(this.task.id)
    this.relatedData.tags = await this.adapter.listTaskTags(this.task.id)
    await this.adapter.removeTask(this.task.id)
  }

  async undo(): Promise<void> {
    // タスクを復元
    // Note: localAdapterの実装に依存するため、完全な復元には制限があります
    // 実際の実装では、より詳細な復元ロジックが必要です
    const restored = await this.adapter.addTask(
      this.task.projectId,
      this.task.columnId,
      this.task.title
    )

    // 可能な限り元の状態に戻す
    await this.adapter.updateTask(restored.id, {
      description: this.task.description,
      startDate: this.task.startDate,
      dueDate: this.task.dueDate,
      progress: this.task.progress,
      sortIndex: this.task.sortIndex,
      parentId: this.task.parentId,
      estimatedHours: this.task.estimatedHours,
    })

    // タグを復元
    for (const tag of this.relatedData.tags) {
      await this.adapter.addTagToTask(restored.id, tag.id)
    }

    // チェックリストを復元
    for (const item of this.relatedData.checklist) {
      const newItem = await this.adapter.addChecklist(restored.id, item.title)
      await this.adapter.updateChecklist(newItem.id, {
        done: item.done,
        sortIndex: item.sortIndex,
        dueDate: item.dueDate,
        assigneeId: item.assigneeId,
      })
    }

    // コメントを復元
    for (const comment of this.relatedData.comments) {
      await this.adapter.addComment(restored.id, comment.body)
    }
  }
}

