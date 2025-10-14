type Dict = Record<string, string>

const ja: Dict = {
  // Common
  "common.loading": "読み込み中...",
  "common.saving": "保存中...",
  "common.save": "保存する",
  "common.saved": "保存しました",

  // Navigation
  "nav.dashboard": "ダッシュボード",
  "nav.kanban": "カンバン",
  "nav.gantt": "ガント",
  "nav.settings": "設定",
  "nav.calendar": "カレンダー",
  "nav.list": "リスト",
  "nav.decompose": "分解",

  // Kanban
  "kanban.title": "カンバン",
  "kanban.addTask": "タスクを追加",
  "kanban.reorderHint": "列の並び替えが可能です",

  // Task
  "task.due": "期限",

  // Settings
  "settings.title": "設定",
  "settings.project": "プロジェクト",
  "settings.project.name": "名前",
  "settings.project.description": "説明",
  "settings.members": "メンバー",
  "settings.members.note": "メンバー管理は後続のAPI接続で有効になります。",
  "settings.dataSource": "データソース",
  "settings.dataSource.local": "ローカル（ブラウザ保存）",
  "settings.dataSource.http": "HTTP（API サーバー）",
  "settings.dataSource.httpDisabled": "HTTP は無効化されています。環境変数 VITE_FF_TASK_BACKEND=true で有効化できます。",
  "settings.ai": "AI 設定",
  "settings.ai.model": "モデル",
  "settings.ai.model.flash": "Gemini 2.5 Flash（高速）",
  "settings.ai.model.pro": "Gemini 1.5 Pro（高品質）",

  // Dashboard
  "dashboard.title": "ダッシュボード",
  "dashboard.progressSummary": "進捗サマリー",
  "dashboard.dueSoon": "期限接近",
  "dashboard.overdue": "期限超過",
  "dashboard.none": "該当なし",

  // Gantt
  "gantt.title": "ガント",
  "gantt.view": "表示",
  "gantt.startMinus": "開始-1日",
  "gantt.startPlus": "開始+1日",
  "gantt.dueMinus": "期限-1日",
  "gantt.duePlus": "期限+1日",
  "gantt.selected": "選択中のタスク",
  "gantt.details": "詳細",
  // Date shortcuts
  "date.today": "今日",
  "date.tomorrow": "明日",
  "date.endOfWeek": "今週末",
  "date.endOfNextWeek": "来週末",
  "date.endOfMonth": "今月末",
  // Decomposer
  "decompose.title": "タスク分解",
  "decompose.placeholder": "やりたいことを入力してください...",
  "decompose.run": "分解",
  "decompose.loading": "AIが分解しています...",
  "decompose.error": "分解に失敗しました。ローカル分解を試します。",
  "decompose.results": "分解結果",
  "decompose.selectAll": "全選択",
  "decompose.clear": "選択クリア",
  "decompose.targetColumn": "追加先の列",
  "decompose.addSelected": "選択を追加",
  "decompose.addAll": "すべて追加",
  "decompose.defaultDue": "既定の期限",
  "decompose.goKanban": "追加後にカンバンへ移動",

  // Calendar
  "calendar.title": "カレンダー",
  "calendar.prev": "前へ",
  "calendar.next": "次へ",
  "calendar.today": "今日",

  // List/Group View
  "list.title": "リスト",
  "list.groupBy": "分類",
  "list.group.label": "ラベル",
  "list.group.assignee": "担当者",
  "list.group.due": "期限",
  "list.none": "未設定",
  "list.unassigned": "未割り当て",
  "list.overdue": "期限超過",
  "list.today": "今日",
  "list.soon": "3日以内",
  "list.thisWeek": "今週",
  "list.later": "来週以降",
  // Drawer A11y
  "task.drawer.focusHint": "Tabで移動、Escで閉じる",
  // Gantt view labels
  "gantt.view.day": "日",
  "gantt.view.week": "週",
  "gantt.view.month": "月",
  // Task Drawer
  "task.drawer.close": "閉じる",
  "task.drawer.description": "説明",
  "task.drawer.checklist": "チェックリスト",
  "task.drawer.checklist.placeholder": "項目を追加",
  "task.drawer.add": "追加",
  "task.drawer.delete": "削除",
  "task.drawer.comments": "コメント",
  "task.drawer.comments.placeholder": "コメントを追加",
  "task.drawer.start": "開始",
  "task.drawer.due": "期限",
  "task.drawer.attachments": "添付",
  "task.drawer.attachments.note": "アップロードは後続のAPI接続で有効になります。",
  "task.drawer.clear": "クリア",
  "task.drawer.invalidDate": "開始日は期限以前である必要があります",
  
}

// Additional feature dictionaries can be merged here without touching the base block above.
const extraJa: Dict = {
  // WBS
  "nav.wbs": "WBS",
  "wbs.title": "WBS",
  "wbs.addChild": "子タスクを追加",
  "wbs.addSibling": "同じ階層に追加",
  "wbs.indent": "インデント",
  "wbs.outdent": "アウトデント",
  "wbs.expand": "展開",
  "wbs.collapse": "折りたたむ",
  "wbs.expandAll": "すべて展開",
  "wbs.collapseAll": "すべて折りたたむ",
  "wbs.hours": "所要(h)",
  "wbs.start": "開始",
  "wbs.due": "期限",
  "wbs.progress": "進捗",
}

let current: Dict = { ...ja, ...extraJa }

export function t(key: string): string {
  return current[key] ?? key
}
