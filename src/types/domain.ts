export type Id = string

export type Role = "admin" | "editor" | "viewer"

export type User = {
  id: Id
  email: string
  displayName: string
  createdAt: string
}

export type Project = {
  id: Id
  name: string
  description?: string
  createdAt: string
  createdBy: Id
}

export type Member = {
  id: Id
  projectId: Id
  userId: Id
  role: Role
  joinedAt: string
}

export type Board = {
  id: Id
  projectId: Id
  name: string
  sortIndex: number
}

export type Column = {
  id: Id
  boardId: Id
  name: string
  wipLimit?: number
  sortIndex: number
}

export type Task = {
  id: Id
  projectId: Id
  columnId: Id
  title: string
  description?: string
  startDate?: string
  dueDate?: string
  progress: number
  sortIndex: number
  createdAt: string
  createdBy: Id
  parentId?: Id
  estimatedHours?: number
}

export type ChecklistItem = {
  id: Id
  taskId: Id
  title: string
  done: boolean
  sortIndex: number
  dueDate?: string
  assigneeId?: Id
}

export type Tag = {
  id: Id
  projectId: Id
  name: string
  color: string
}

export type Comment = {
  id: Id
  taskId: Id
  authorId: Id
  body: string
  createdAt: string
}

export type TaskDependency = {
  id: Id
  taskId: Id
  dependsOnTaskId: Id
}

export type Attachment = {
  id: Id
  taskId: Id
  filename: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  createdAt: string
}

export type NotificationType =
  | "due_soon"
  | "overdue"
  | "comment"
  | "reassigned"
  | "mention"

export type Notification = {
  id: Id
  projectId: Id
  recipientId: Id
  type: NotificationType
  refType: "task" | "comment" | "project"
  refId: Id
  read: boolean
  createdAt: string
}
