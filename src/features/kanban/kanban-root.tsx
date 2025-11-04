import React, { useEffect, useMemo, useState } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { Column, Id, Project, Task } from "@/types/domain";
import { useAdapter } from "@/adapters/adapter-context";
import { t } from "@/lib/i18n";
import { TaskDrawer } from "@/components/task/task-drawer";
import { navigate } from "@/lib/router";

export const KanbanRoot: React.FC = () => {
  const { adapter } = useAdapter();
  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const loading = !project;

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject();
      setProject(p);
      const cols = await adapter.getBoardColumns(p.id);
      setColumns(cols);
      const ts = await adapter.listTasks({ projectId: p.id });
      setTasks(ts);
    };
    run();
  }, []);

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const c of columns) map[c.id] = [];
    for (const t of tasks) {
      if (!map[t.columnId]) map[t.columnId] = [];
      map[t.columnId].push(t);
    }
    return map;
  }, [columns, tasks]);

  if (loading) {
    return (
      <div className="p-6 text-zinc-600 dark:text-zinc-300">
        {t("common.loading")}
      </div>
    );
  }

  async function onAddTask(columnId: Id) {
    if (!project) return;
    const title = window.prompt("タスク名を入力")?.trim();
    if (!title) return;
    const t = await adapter.addTask(project.id, columnId, title);
    setTasks((prev) => [...prev, t]);
  }

  async function refreshTasks() {
    if (!project) return;
    const ts = await adapter.listTasks({ projectId: project.id });
    setTasks(ts);
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {t("kanban.title")}
        </h1>
      </div>
      <KanbanBoard
        projectId={project!.id}
        columns={columns}
        tasksByColumn={tasksByColumn}
        onTaskMove={async (taskId, toColumnId, toIndex) => {
          // タスクを移動
          await adapter.moveTask(taskId, toColumnId, toIndex);
          
          // 移動先の列を判定
          const targetColumn = columns.find((c) => c.id === toColumnId);
          const task = tasks.find((t) => t.id === taskId);
          
          if (task && targetColumn) {
            let newProgress: number | undefined;
            
            // 列名に応じてprogressを設定
            switch (targetColumn.name) {
              case "To Do":
                // To Do列: 未着手（0%）
                if (task.progress !== 0) {
                  newProgress = 0;
                }
                break;
              case "Doing":
                // Doing列: 進行中（50%）
                if (task.progress === 0 || task.progress === 100) {
                  newProgress = 50;
                }
                // すでに進行中（1-99%）の場合は変更しない
                break;
              case "Done":
                // Done列: 完了（100%）
                if (task.progress !== 100) {
                  newProgress = 100;
                }
                break;
            }
            
            // progressを更新
            if (newProgress !== undefined) {
              await adapter.updateTask(taskId, { progress: newProgress });
            }
          }
          
          const ts = await adapter.listTasks({ projectId: project!.id });
          setTasks(ts);
        }}
        onColumnReorder={async (ordered) => {
          await adapter.reorderColumns(project!.id, ordered);
          const cols = await adapter.getBoardColumns(project!.id);
          setColumns(cols);
        }}
        onAddTask={onAddTask}
        onOpenTask={(taskId) => setOpenTaskId(taskId)}
        onTaskUpdate={refreshTasks}
      />
      <TaskDrawer
        open={Boolean(openTaskId)}
        task={tasks.find((t) => t.id === openTaskId) ?? null}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  );
};
