import React, { useState } from "react";
import { navigate, useHashLocation } from "@/lib/router";
import { t } from "@/lib/i18n";
import { FF_WBS } from "@/lib/flags";
import { Sparkles } from "lucide-react";
import { DecomposerRoot } from "@/features/decomposer/decomposer-root";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const path = useHashLocation();
  const [showDecomposer, setShowDecomposer] = useState(false);

  const NavButton: React.FC<{ to: string; label: string }> = ({
    to,
    label,
  }) => {
    const active = path === to;
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
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-accent-50 text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-50">
      <header className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="text-xl font-semibold">Secretary</div>
        <nav className="flex flex-wrap gap-2 rounded-full border border-zinc-300/70 bg-white/70 p-1 text-sm backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <NavButton to="/dashboard" label={t("nav.dashboard")} />
          <NavButton to="/kanban" label={t("nav.kanban")} />
          {FF_WBS && <NavButton to="/wbs" label={t("nav.wbs")} />}
          <NavButton to="/gantt" label={t("nav.gantt")} />
          <NavButton to="/settings" label={t("nav.settings")} />
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-10">{children}</main>

      {/* フローティングボタン */}
      <div className="fixed bottom-6 right-6 z-40 group">
        <button
          type="button"
          onClick={() => setShowDecomposer(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          aria-label={t("decompose.title")}
        >
          <Sparkles className="h-6 w-6" />
        </button>
        {/* ツールチップ */}
        <div className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900">
          {t("decompose.title")}
          <div className="absolute -bottom-1 right-6 h-2 w-2 rotate-45 bg-zinc-900 dark:bg-zinc-100"></div>
        </div>
      </div>

      {/* タスク分解モーダル */}
      {showDecomposer && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8">
          <div className="w-full max-w-4xl rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
              <h2 className="text-xl font-semibold">{t("decompose.title")}</h2>
              <button
                type="button"
                onClick={() => setShowDecomposer(false)}
                className="text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                aria-label="閉じる"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-6">
              <DecomposerRoot onClose={() => setShowDecomposer(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
