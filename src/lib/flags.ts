// デフォルトで有効（無効にするには VITE_FF_KANBAN=false を設定）
export const FF_KANBAN = import.meta.env.VITE_FF_KANBAN !== "false";

// デフォルトで無効（有効にするには VITE_FF_TASK_BACKEND=true を設定）
export const FF_TASK_BACKEND = Boolean(import.meta.env.VITE_FF_TASK_BACKEND);

// デフォルトで有効（無効にするには VITE_FF_WBS=false を設定）
export const FF_WBS = import.meta.env.VITE_FF_WBS !== "false";
