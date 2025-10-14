import React, { useEffect } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { Router } from "@/lib/router"
import { KanbanRoot } from "@/features/kanban/kanban-root"
import { GanttRoot } from "@/features/gantt/gantt-root"
import { DashboardRoot } from "@/features/dashboard/dashboard-root"
import { ProjectSettingsRoot } from "@/features/settings/project-settings-root"
import { DecomposerRoot } from "@/features/decomposer/decomposer-root"
import { CalendarRoot } from "@/features/calendar/calendar-root"
import { ListRoot } from "@/features/list/list-root"
import { AdapterProvider } from "@/adapters/adapter-context"
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
      <AppShell>
        <Router
          routes={[
            { path: "/dashboard", element: <DashboardRoot /> },
          { path: "/kanban", element: <KanbanRoot /> },
          { path: "/list", element: <ListRoot /> },
          { path: "/calendar", element: <CalendarRoot /> },
          { path: "/decompose", element: <DecomposerRoot /> },
          { path: "/gantt", element: <GanttRoot /> },
            { path: "/settings", element: <ProjectSettingsRoot /> },
            ...(FF_WBS ? [{ path: "/wbs", element: <WbsRoot /> }] : []),
          ]}
          fallback={<DashboardRoot />}
        />
      </AppShell>
    </AdapterProvider>
  )
}
