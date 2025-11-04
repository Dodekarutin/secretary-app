import React, { useEffect } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { Router } from "@/lib/router"
import { KanbanRoot } from "@/features/kanban/kanban-root"
import { GanttRoot } from "@/features/gantt/gantt-root"
import { DashboardRoot } from "@/features/dashboard/dashboard-root"
import { ProjectSettingsRoot } from "@/features/settings/project-settings-root"
 
import { AdapterProvider } from "@/adapters/adapter-context"
import { UndoProvider } from "@/lib/undo-context"
import { FF_WBS } from "@/lib/flags"
import { WbsRoot } from "@/features/wbs/wbs-root"

export const AppRouted: React.FC = () => {
  useEffect(() => {
    // 初期ハッシュが未設定ならダッシュボードへ
    if (!window.location.hash) {
      window.location.hash = "#/dashboard"
    }
  }, [])

  return (
    <AdapterProvider>
      <UndoProvider>
        <AppShell>
          <Router
            routes={[
              { path: "/dashboard", element: <DashboardRoot /> },
              { path: "/kanban", element: <KanbanRoot /> },
              { path: "/gantt", element: <GanttRoot /> },
              { path: "/settings", element: <ProjectSettingsRoot /> },
              ...(FF_WBS ? [{ path: "/wbs", element: <WbsRoot /> }] : []),
            ]}
            fallback={<DashboardRoot />}
          />
        </AppShell>
      </UndoProvider>
    </AdapterProvider>
  )
}
