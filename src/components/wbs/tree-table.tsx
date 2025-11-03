import React, { useEffect, useMemo, useState } from "react";
import type { Task } from "@/types/domain";
import type { WbsNode } from "@/lib/wbs-utils";
import {
  rollupEstimatedHours,
  rollupDates,
  rollupProgressWeighted,
} from "@/lib/wbs-utils";
import { t } from "@/lib/i18n";

export type TreeTableProps = {
  tree: WbsNode[];
  onAddChild?: (task: Task) => void;
  onAddSibling?: (task: Task) => void;
  onRename?: (task: Task, title: string) => void;
  onTaskClick?: (task: Task) => void;
};

type FlatNode = {
  node: WbsNode;
  number: string;
  depth: number;
  hasChildren: boolean;
};

function flattenTree(tree: WbsNode[], parentNumber = ""): FlatNode[] {
  const result: FlatNode[] = [];

  tree.forEach((node, index) => {
    const number = parentNumber
      ? `${parentNumber}.${index + 1}`
      : String(index + 1);
    const depth = node.level;
    const hasChildren = node.children.length > 0;

    result.push({ node, number, depth, hasChildren });

    if (hasChildren) {
      result.push(...flattenTree(node.children, number));
    }
  });

  return result;
}

function getTaskTypeIcon(
  depth: number,
  hasChildren: boolean
): { icon: string; color: string; label: string } {
  if (depth === 0) {
    return { icon: "📦", color: "text-purple-600", label: "親タスク (L0)" };
  }
  if (depth === 1) {
    return { icon: "📋", color: "text-blue-600", label: "小タスク (L1)" };
  }
  if (depth === 2) {
    return { icon: "📄", color: "text-green-600", label: "孫タスク (L2)" };
  }
  if (depth === 3) {
    return { icon: "📝", color: "text-amber-600", label: "ひ孫タスク (L3)" };
  }
  if (depth >= 4) {
    return {
      icon: "📌",
      color: "text-pink-600",
      label: `サブタスク (L${depth})`,
    };
  }
  if (hasChildren) {
    return { icon: "📄", color: "text-green-600", label: "サブタスク" };
  }
  return { icon: "✓", color: "text-zinc-500", label: "タスク" };
}

function getPriorityIcon(progress: number): string {
  if (progress >= 100) return "✓";
  if (progress >= 50) return "▲";
  if (progress > 0) return "●";
  return "○";
}

function getPriorityColor(progress: number): string {
  if (progress >= 100) return "text-green-600";
  if (progress >= 50) return "text-orange-500";
  return "text-red-500";
}

export const TreeTable: React.FC<TreeTableProps> = ({
  tree,
  onAddChild,
  onAddSibling,
  onRename,
  onTaskClick,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // デフォルトで全展開
  useEffect(() => {
    const allIds = new Set<string>();
    function visit(nodes: WbsNode[]) {
      nodes.forEach((node) => {
        if (node.children.length > 0) {
          allIds.add(node.id);
          visit(node.children);
        }
      });
    }
    visit(tree);
    setExpandedIds(allIds);
  }, [tree]);

  const flatNodes = useMemo(() => {
    const flat = flattenTree(tree);
    // Filter out collapsed children
    return flat.filter((item) => {
      // Check if any parent is collapsed
      let currentDepth = item.depth;
      for (let i = flat.indexOf(item) - 1; i >= 0; i--) {
        const prev = flat[i];
        if (prev.depth < currentDepth) {
          if (prev.hasChildren && !expandedIds.has(prev.node.id)) {
            return false;
          }
          currentDepth = prev.depth;
        }
      }
      return true;
    });
  }, [tree, expandedIds]);

  function toggleExpand(nodeId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  function expandAll() {
    const allIds = new Set<string>();
    function visit(nodes: WbsNode[]) {
      nodes.forEach((node) => {
        if (node.children.length > 0) {
          allIds.add(node.id);
          visit(node.children);
        }
      });
    }
    visit(tree);
    setExpandedIds(allIds);
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  function startEdit(node: WbsNode) {
    setEditingId(node.id);
    setEditingValue(node.task.title);
  }

  function commitEdit(node: WbsNode) {
    if (editingId !== node.id) return;
    const next = editingValue.trim();
    setEditingId(null);
    if (next && next !== node.task.title && onRename) {
      onRename(node.task, next);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingValue("");
  }

  if (tree.length === 0) {
    return (
      <div className="rounded border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {t("dashboard.none")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={expandAll}
          className="rounded bg-zinc-100 px-3 py-1.5 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          {t("wbs.expandAll")}
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="rounded bg-zinc-100 px-3 py-1.5 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          {t("wbs.collapseAll")}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            <tr>
              <th
                className="px-4 py-3 text-left font-medium"
                style={{ minWidth: "400px" }}
              >
                タスク
              </th>
              <th
                className="px-4 py-3 text-center font-medium"
                style={{ width: "150px" }}
              >
                進捗
              </th>
              <th
                className="px-4 py-3 text-center font-medium"
                style={{ width: "80px" }}
              >
                優先度
              </th>
              <th
                className="px-4 py-3 text-center font-medium"
                style={{ width: "100px" }}
              >
                所要時間
              </th>
              <th
                className="px-4 py-3 text-center font-medium"
                style={{ width: "120px" }}
              >
                開始日
              </th>
              <th
                className="px-4 py-3 text-center font-medium"
                style={{ width: "120px" }}
              >
                期限
              </th>
              <th
                className="px-4 py-3 text-center font-medium"
                style={{ width: "100px" }}
              >
                ステータス
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {flatNodes.map((item) => {
              const { node, number, depth, hasChildren } = item;
              const { task } = node;
              const isExpanded = expandedIds.has(node.id);
              const typeInfo = getTaskTypeIcon(depth, hasChildren);

              // Rollup calculations
              const rollHours = rollupEstimatedHours(node);
              const { start, due } = rollupDates(node);
              const rollProgress = Math.max(
                0,
                Math.min(100, Math.round(rollupProgressWeighted(node)))
              );

              const priorityIcon = getPriorityIcon(rollProgress);
              const priorityColor = getPriorityColor(rollProgress);

              return (
                <tr
                  key={node.id}
                  className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  {/* Task Name Column */}
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${depth * 24}px` }}
                    >
                      {/* Expand/Collapse Button */}
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(node.id)}
                          className="flex h-5 w-5 items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          aria-label={
                            isExpanded ? t("wbs.collapse") : t("wbs.expand")
                          }
                        >
                          {isExpanded ? "▼" : "▶"}
                        </button>
                      ) : (
                        <div className="w-5" />
                      )}

                      {/* Task Number */}
                      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {number}
                      </span>

                      {/* Task Title */}
                      <div className="flex-1">
                        {editingId === node.id ? (
                          <input
                            className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => commitEdit(node)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit(node);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            autoFocus
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onTaskClick?.(task)}
                            onDoubleClick={() => startEdit(node)}
                            className="text-left font-medium text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                          >
                            {task.title}
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Progress Column */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {rollProgress}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all"
                          style={{ width: `${rollProgress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Priority Column */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-lg ${priorityColor}`}
                      title={`進捗 ${rollProgress}%`}
                    >
                      {priorityIcon}
                    </span>
                  </td>

                  {/* Estimated Hours Column */}
                  <td className="px-4 py-3 text-center text-zinc-700 dark:text-zinc-300">
                    {rollHours ? `${rollHours}h` : "-"}
                  </td>

                  {/* Start Date Column */}
                  <td className="px-4 py-3 text-center text-zinc-700 dark:text-zinc-300">
                    {start || "-"}
                  </td>

                  {/* Due Date Column */}
                  <td className="px-4 py-3 text-center text-zinc-700 dark:text-zinc-300">
                    {due || "-"}
                  </td>

                  {/* Status Column */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        rollProgress >= 100
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : rollProgress > 0
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {rollProgress >= 100
                        ? "完了"
                        : rollProgress > 0
                        ? "進行中"
                        : "未着手"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
