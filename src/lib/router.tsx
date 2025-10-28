import React, { useEffect, useMemo, useSyncExternalStore } from "react"

export type Route = {
  path: string // e.g. "/kanban"
  element: React.ReactNode
}

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback)
  return () => window.removeEventListener("hashchange", callback)
}

function getSnapshot() {
  return window.location.hash || "#\/"
}

export function useHashLocation() {
  const hash = useSyncExternalStore(subscribe, getSnapshot)
  const path = useMemo(() => hash.replace(/^#/, ""), [hash])
  return path
}

export function navigate(path: string) {
  const target = path.startsWith("#") ? path : `#${path}`
  if (window.location.hash === target) return
  window.location.hash = target
}

export const Router: React.FC<{ routes: Route[]; fallback?: React.ReactNode }> = ({
  routes,
  fallback,
}) => {
  const path = useHashLocation()
  const match = routes.find((r) => r.path === path)
  return <>{match ? match.element : fallback ?? null}</>
}

