import React, { useEffect, useMemo, useState } from "react";
import { useAdapter } from "@/adapters/adapter-context";
import type { Project, Task } from "@/types/domain";
import { t } from "@/lib/i18n";

// adapter provided by AdapterProvider

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round(diff);
}

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  accentColor: string;
  bgGradient: string;
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  bgGradient,
}) => {
  return (
    <div
      className={`rounded-xl border border-zinc-200/70 bg-gradient-to-br ${bgGradient} p-6 shadow-lg transition-all hover:scale-105 hover:shadow-xl dark:border-zinc-700/60`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {title}
          </p>
          <p className={`mt-2 text-3xl font-bold ${accentColor}`}>{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`text-4xl opacity-20`}>{icon}</div>
      </div>
    </div>
  );
};

type TaskListCardProps = {
  title: string;
  tasks: Task[];
  emptyMessage: string;
  icon: string;
  accentColor: string;
};

const TaskListCard: React.FC<TaskListCardProps> = ({
  title,
  tasks,
  emptyMessage,
  icon,
  accentColor,
}) => {
  return (
    <div className="rounded-xl border border-zinc-200/70 bg-white/90 p-6 shadow-lg backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-900/90">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <h2 className={`text-lg font-semibold ${accentColor}`}>{title}</h2>
        {/* カウントバッジは非表示にする */}
      </div>
      {tasks.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-800/50">
          <span>✓</span>
          <span>{emptyMessage}</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.slice(0, 5).map((task) => {
            const days = daysUntil(task.dueDate);
            return (
              <li
                key={task.id}
                className="group rounded-lg border border-zinc-200/50 bg-zinc-50/50 p-3 transition-all hover:border-zinc-300 hover:bg-white hover:shadow-md dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        📅 {task.dueDate}
                        {days !== null && (
                          <span
                            className={`ml-2 ${
                              days < 0 ? "text-red-500" : "text-amber-500"
                            }`}
                          >
                            (
                            {days < 0
                              ? `${Math.abs(days)}日超過`
                              : `残り${days}日`}
                            )
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  {task.progress !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <div
                          className="h-1.5 rounded-full bg-brand-500 transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 min-w-[2.5rem] text-right">
                        {task.progress}%
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {tasks.length > 5 && (
            <li className="pt-2 text-center text-sm text-zinc-500">
              他 {tasks.length - 5} 件のタスク
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export const DashboardRoot: React.FC = () => {
  const { adapter } = useAdapter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject();
      setProject(p);
      const ts = await adapter.listTasks({ projectId: p.id });
      setTasks(ts);
      const cols = await adapter.getBoardColumns(p.id);
      setColumns(cols);
    };
    run();
  }, []);

  const stats = useMemo(() => {
    // 列IDから列名へのマップを作成
    const columnMap = new Map(columns.map((c) => [c.id, c.name]));
    
    const total = tasks.length;
    
    // Done列のタスクを完了としてカウント
    const done = tasks.filter((t) => {
      const colName = columnMap.get(t.columnId);
      return colName === "Done";
    }).length;
    
    // Doing列のタスクを進行中としてカウント
    const inProgress = tasks.filter((t) => {
      const colName = columnMap.get(t.columnId);
      return colName === "Doing";
    }).length;
    
    // To Do列のタスクを未着手としてカウント
    const notStarted = tasks.filter((t) => {
      const colName = columnMap.get(t.columnId);
      return colName === "To Do";
    }).length;
    
    const pct = total ? Math.round((done / total) * 100) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueSoon = tasks
      .map((t) => ({ t, days: daysUntil(t.dueDate) }))
      .filter(
        (x) =>
          x.days !== null && (x.days as number) >= 0 && (x.days as number) <= 3
      )
      .sort((a, b) => (a.days as number) - (b.days as number))
      .map((x) => x.t);

    const overdue = tasks
      .map((t) => ({ t, days: daysUntil(t.dueDate) }))
      .filter((x) => (x.days ?? 0) < 0)
      .map((x) => x.t);

    const dueToday = tasks.filter((t) => {
      const days = daysUntil(t.dueDate);
      return days === 0;
    });

    return {
      total,
      done,
      inProgress,
      notStarted,
      percent: pct,
      dueSoon,
      overdue,
      dueToday,
    };
  }, [tasks, columns]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {t("dashboard.title")}
        </h1>
        {project && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {project.name}
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="全タスク"
          value={stats.total}
          subtitle="プロジェクト全体"
          icon="📝"
          accentColor="text-brand-600 dark:text-brand-400"
          bgGradient="from-white to-brand-50/30 dark:from-zinc-900 dark:to-brand-950/30"
        />
        <StatCard
          title="完了"
          value={stats.done}
          subtitle={`${stats.percent}% 達成`}
          icon="✅"
          accentColor="text-green-600 dark:text-green-400"
          bgGradient="from-white to-green-50/30 dark:from-zinc-900 dark:to-green-950/30"
        />
        <StatCard
          title="進行中"
          value={stats.inProgress}
          subtitle="作業中のタスク"
          icon="⚡"
          accentColor="text-blue-600 dark:text-blue-400"
          bgGradient="from-white to-blue-50/30 dark:from-zinc-900 dark:to-blue-950/30"
        />
        <StatCard
          title="未着手"
          value={stats.notStarted}
          subtitle="これから開始"
          icon="⏸️"
          accentColor="text-zinc-600 dark:text-zinc-400"
          bgGradient="from-white to-zinc-50/30 dark:from-zinc-900 dark:to-zinc-800/30"
        />
      </div>

      {/* Progress Overview */}
      <div className="rounded-xl border border-zinc-200/70 bg-gradient-to-br from-white to-brand-50/20 p-6 shadow-lg dark:border-zinc-700/60 dark:from-zinc-900 dark:to-brand-950/20">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {t("dashboard.progressSummary")}
        </h2>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {stats.done} / {stats.total} タスク完了
          </span>
          <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
            {stats.percent}%
          </span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-4 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500 ease-out"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">完了</p>
            <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
              {stats.done}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">進行中</p>
            <p className="mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400">
              {stats.inProgress}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">未着手</p>
            <p className="mt-1 text-lg font-semibold text-zinc-600 dark:text-zinc-400">
              {stats.notStarted}
            </p>
          </div>
        </div>
      </div>

      {/* Task Lists Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TaskListCard
          title={t("dashboard.overdue")}
          tasks={stats.overdue}
          emptyMessage={t("dashboard.none")}
          icon="🚨"
          accentColor="text-red-600 dark:text-red-400"
        />
        <TaskListCard
          title={t("dashboard.dueSoon")}
          tasks={stats.dueSoon}
          emptyMessage={t("dashboard.none")}
          icon="⏰"
          accentColor="text-amber-600 dark:text-amber-400"
        />
      </div>
    </div>
  );
};
