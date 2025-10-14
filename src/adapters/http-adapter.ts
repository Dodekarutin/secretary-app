import type { Column, Id, Project, Task, Tag, Role, User, Member, ChecklistItem, TaskDependency, Comment } from "@/types/domain"
import type { DataAdapter, ListTasksQuery } from "./data-adapter"

// HTTP Adapter skeleton (API v1). 現時点では未接続。
// 実装時に /api/v1 へ接続し、認証付き fetch を行う。

export function createHttpAdapter(baseUrl = "/api/v1"): DataAdapter {
  async function httpGet<T>(path: string): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, { credentials: "include" })
    if (!res.ok) throw new Error(`GET ${path} failed`)
    return (await res.json()) as T
  }
  async function httpPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
    if (!res.ok) throw new Error(`POST ${path} failed`)
    return (await res.json()) as T
  }
  async function httpPatch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
    if (!res.ok) throw new Error(`PATCH ${path} failed`)
    return (await res.json()) as T
  }

  return {
    async getDefaultProject(): Promise<Project> {
      const list = await httpGet<Project[]>(`/projects`)
      return list[0]
    },
    async getProject(projectId: Id): Promise<Project | null> { const list = await httpGet<Project[]>(`/projects`); return list.find(p=>p.id===projectId) ?? null },
    async updateProject(projectId: Id, body: Partial<Pick<Project, "name"|"description">>): Promise<Project> { return await httpPatch<Project>(`/projects/${projectId}`, body) },
    async getBoardColumns(projectId: Id): Promise<Column[]> {
      const boards = await httpGet<{ id: Id }[]>(`/projects/${projectId}/boards`)
      const boardId = boards[0]?.id
      if (!boardId) return []
      return await httpGet<Column[]>(`/boards/${boardId}/columns`)
    },
    async listTasks(q: ListTasksQuery): Promise<Task[]> {
      const params = new URLSearchParams({ projectId: q.projectId })
      if (q.columnId) params.set("columnId", q.columnId)
      return await httpGet<Task[]>(`/tasks?${params.toString()}`)
    },
    async getTask(taskId: Id): Promise<Task | null> { try { return await httpGet<Task>(`/tasks/${taskId}`) } catch { return null } },
    async addTask(projectId: Id, columnId: Id, title: string): Promise<Task> {
      return await httpPost<Task>(`/projects/${projectId}/tasks`, { title, columnId })
    },
    async updateTask(taskId: Id, patchBody: Partial<Pick<Task, "title"|"description"|"startDate"|"dueDate"|"progress"|"columnId"|"sortIndex">>): Promise<Task | null> { return await httpPatch<Task>(`/tasks/${taskId}`, patchBody) },
    async moveTask(taskId: Id, toColumnId: Id, toIndex: number): Promise<void> {
      await httpPost<void>(`/tasks/${taskId}:move`, { toColumnId, toSortIndex: toIndex * 1000 })
    },
    async reorderColumns(projectId: Id, ordered: { columnId: Id; sortIndex: number }[]): Promise<void> {
      await httpPost<void>(`/projects/${projectId}/columns:reorder`, { ordered })
    },
    async listChecklist(taskId: Id): Promise<ChecklistItem[]> { return await httpGet<ChecklistItem[]>(`/tasks/${taskId}/checklist`) },
    async addChecklist(taskId: Id, title: string): Promise<ChecklistItem> { return await httpPost<ChecklistItem>(`/tasks/${taskId}/checklist`, { title }) },
    async toggleChecklist(itemId: Id, done: boolean): Promise<ChecklistItem | null> { return await httpPatch<ChecklistItem>(`/checklist/${itemId}`, { done }) },
    async removeChecklist(itemId: Id): Promise<void> { await httpPost<void>(`/checklist/${itemId}:delete`, {}) },
    async updateChecklist(itemId: Id, patchBody: Partial<Pick<ChecklistItem, "title"|"done"|"sortIndex"|"dueDate"|"assigneeId">>): Promise<ChecklistItem | null> { return await httpPatch<ChecklistItem>(`/checklist/${itemId}`, patchBody) },
    async listComments(taskId: Id): Promise<import("@/types/domain").Comment[]> { return await httpGet<import("@/types/domain").Comment[]>(`/tasks/${taskId}/comments`) },
    async addComment(taskId: Id, body: string): Promise<import("@/types/domain").Comment> { return await httpPost<import("@/types/domain").Comment>(`/tasks/${taskId}/comments`, { body }) },
    async removeComment(commentId: Id): Promise<void> { await httpPost<void>(`/comments/${commentId}:delete`, {}) },
    async listDependencies(projectId: Id): Promise<TaskDependency[]> { return await httpGet<TaskDependency[]>(`/projects/${projectId}/dependencies`) },
    async addDependency(taskId: Id, dependsOnTaskId: Id): Promise<TaskDependency> { return await httpPost<TaskDependency>(`/tasks/${taskId}/dependencies`, { dependsOnTaskId }) },
    async removeDependency(taskId: Id, dependsOnTaskId: Id): Promise<void> { await httpPost<void>(`/tasks/${taskId}/dependencies:delete`, { dependsOnTaskId }) },
    async listProjectTags(projectId: Id): Promise<Tag[]> { return await httpGet<Tag[]>(`/projects/${projectId}/tags`) },
    async addProjectTag(projectId: Id, name: string, color: string): Promise<Tag> { return await httpPost<Tag>(`/projects/${projectId}/tags`, { name, color }) },
    async removeProjectTag(tagId: Id): Promise<void> { await httpPost<void>(`/tags/${tagId}:delete`, {}) },
    async listTaskTags(taskId: Id): Promise<Tag[]> { return await httpGet<Tag[]>(`/tasks/${taskId}/tags`) },
    async addTagToTask(taskId: Id, tagId: Id): Promise<void> { await httpPost<void>(`/tasks/${taskId}/tags`, { tagId }) },
    async removeTagFromTask(taskId: Id, tagId: Id): Promise<void> { await httpPost<void>(`/tasks/${taskId}/tags:delete`, { tagId }) },
    async listProjectMembers(projectId: Id): Promise<Member[]> { return await httpGet<Member[]>(`/projects/${projectId}/members`) },
    async getUser(userId: Id): Promise<User | null> { return await httpGet<User>(`/users/${userId}`) },
    async listTaskAssignees(taskId: Id): Promise<Id[]> { return await httpGet<Id[]>(`/tasks/${taskId}/assignees`) },
    async assignTask(taskId: Id, userId: Id): Promise<void> { await httpPost<void>(`/tasks/${taskId}/assignees`, { userId }) },
    async unassignTask(taskId: Id, userId: Id): Promise<void> { await httpPost<void>(`/tasks/${taskId}/assignees:delete`, { userId }) },
    async addUser(email: string, displayName: string): Promise<User> { return await httpPost<User>(`/users`, { email, displayName }) },
    async addProjectMember(projectId: Id, userId: Id, role: Role): Promise<Member> { return await httpPost<Member>(`/projects/${projectId}/members`, { userId, role }) },
    async removeProjectMember(memberId: Id): Promise<void> { await httpPost<void>(`/members/${memberId}:delete`, {}) },
    async listProjects(): Promise<Project[]> { return await httpGet<Project[]>(`/projects`) },
    async createProject(name: string, description?: string): Promise<Project> { return await httpPost<Project>(`/projects`, { name, description }) },
    async createColumns(projectId: Id, names: string[]): Promise<Column[]> { return await httpPost<Column[]>(`/projects/${projectId}/columns:bulk`, { names }) },
  }
}
