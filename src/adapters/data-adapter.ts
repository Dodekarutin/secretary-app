import type { Column, Id, Project, Task, Tag, TaskDependency, User, Member, Role } from "@/types/domain"
import type { ChecklistItem, Comment } from "@/types/domain"

export type ListTasksQuery = {
  projectId: Id
  columnId?: Id
}

export interface DataAdapter {
  getDefaultProject(): Promise<Project>
  getProject(projectId: Id): Promise<Project | null>
  updateProject(projectId: Id, patch: Partial<Pick<Project, "name" | "description">>): Promise<Project>
  getBoardColumns(projectId: Id): Promise<Column[]>
  listTasks(q: ListTasksQuery): Promise<Task[]>
  getTask(taskId: Id): Promise<Task | null>
  addTask(projectId: Id, columnId: Id, title: string): Promise<Task>
  updateTask(taskId: Id, patch: Partial<Pick<Task, "title" | "description" | "startDate" | "dueDate" | "progress" | "columnId" | "sortIndex" | "parentId" | "estimatedHours">>): Promise<Task | null>
  removeTask(taskId: Id): Promise<void>
  moveTask(taskId: Id, toColumnId: Id, toIndex: number): Promise<void>
  reorderColumns(projectId: Id, ordered: { columnId: Id; sortIndex: number }[]): Promise<void>

  // checklist
  listChecklist(taskId: Id): Promise<ChecklistItem[]>
  addChecklist(taskId: Id, title: string): Promise<ChecklistItem>
  toggleChecklist(itemId: Id, done: boolean): Promise<ChecklistItem | null>
  removeChecklist(itemId: Id): Promise<void>
  updateChecklist(itemId: Id, patch: Partial<Pick<ChecklistItem, "title" | "done" | "sortIndex" | "dueDate" | "assigneeId">>): Promise<ChecklistItem | null>

  // comments
  listComments(taskId: Id): Promise<Comment[]>
  addComment(taskId: Id, body: string): Promise<Comment>
  removeComment(commentId: Id): Promise<void>

  // dependencies (optional in some adapters)
  listDependencies?(projectId: Id): Promise<TaskDependency[]>
  addDependency?(taskId: Id, dependsOnTaskId: Id): Promise<TaskDependency>
  removeDependency?(taskId: Id, dependsOnTaskId: Id): Promise<void>

  // tags
  listProjectTags(projectId: Id): Promise<Tag[]>
  addProjectTag(projectId: Id, name: string, color: string): Promise<Tag>
  removeProjectTag(tagId: Id): Promise<void>
  listTaskTags(taskId: Id): Promise<Tag[]>
  addTagToTask(taskId: Id, tagId: Id): Promise<void>
  removeTagFromTask(taskId: Id, tagId: Id): Promise<void>

  // members / assignees
  listProjectMembers(projectId: Id): Promise<Member[]>
  getUser(userId: Id): Promise<User | null>
  listTaskAssignees(taskId: Id): Promise<Id[]>
  assignTask(taskId: Id, userId: Id): Promise<void>
  unassignTask(taskId: Id, userId: Id): Promise<void>
  addUser(email: string, displayName: string): Promise<User>
  addProjectMember(projectId: Id, userId: Id, role: Role): Promise<Member>
  removeProjectMember(memberId: Id): Promise<void>

  // projects
  listProjects(): Promise<Project[]>
  createProject(name: string, description?: string): Promise<Project>
  createColumns(projectId: Id, names: string[]): Promise<Column[]>

  // maintenance (optional for some adapters)
  clearProjectTasks?(projectId: Id): Promise<void>
  seedDemoTasks?(projectId: Id, targetCount: number): Promise<void>

  // WBS helpers
  addSubtask?(parentTaskId: Id, title: string): Promise<Task>
}
