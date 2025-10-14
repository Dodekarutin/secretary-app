import React from "react"
import { navigate, useHashLocation } from "@/lib/router"
import { NotificationsButton } from "@/components/notifications/notifications-button"
import { t } from "@/lib/i18n"
import { FF_WBS } from "@/lib/flags"

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const path = useHashLocation()

  const NavButton: React.FC<{ to: string; label: string }> = ({ to, label }) => {
    const active = path === to
    return (
      <button
        type="button"
        onClick={() => navigate(to)}
        className={`rounded-full px-3 py-1 text-sm transition ${
          active
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        }`}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-accent-50 text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-50">
      <header className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="text-xl font-semibold">Secretary</div>
        <nav className="flex flex-wrap gap-2 rounded-full border border-zinc-300/70 bg-white/70 p-1 text-sm backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <NavButton to="/dashboard" label={t("nav.dashboard")} />
          <NavButton to="/kanban" label={t("nav.kanban")} />
          <NavButton to="/list" label={t("nav.list")} />
          <NavButton to="/calendar" label={t("nav.calendar")} />
          <NavButton to="/decompose" label={t("nav.decompose")} />
          <NavButton to="/gantt" label={t("nav.gantt")} />
          {FF_WBS && <NavButton to="/wbs" label={t("nav.wbs")} />}
          <NavButton to="/settings" label={t("nav.settings")} />
        </nav>
        <div className="md:ml-auto"><NotificationsButton /></div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-10">{children}</main>
    </div>
  )
}
