import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { DataAdapter } from "@/adapters/data-adapter"
import { createLocalAdapter } from "@/adapters/local-adapter"
import { createHttpAdapter } from "@/adapters/http-adapter"
import { FF_TASK_BACKEND } from "@/lib/flags"

export type AdapterKind = "local" | "http"

const STORAGE_KEY = "secretary.adapter.kind"

function createAdapter(kind: AdapterKind): DataAdapter {
  if (kind === "http") return createHttpAdapter()
  return createLocalAdapter()
}

type AdapterContextValue = {
  kind: AdapterKind
  setKind: (k: AdapterKind) => void
  adapter: DataAdapter
}

const AdapterContext = createContext<AdapterContextValue | null>(null)

export const AdapterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialKind: AdapterKind = useMemo(() => {
    if (!FF_TASK_BACKEND) return "local"
    const saved = localStorage.getItem(STORAGE_KEY) as AdapterKind | null
    return saved === "http" ? "http" : "local"
  }, [])

  const [kind, setKindState] = useState<AdapterKind>(initialKind)

  const setKind = useCallback((k: AdapterKind) => {
    if (!FF_TASK_BACKEND && k === "http") return
    setKindState(k)
    localStorage.setItem(STORAGE_KEY, k)
  }, [])

  const adapter = useMemo(() => createAdapter(kind), [kind])

  const value = useMemo(() => ({ kind, setKind, adapter }), [kind, setKind, adapter])

  return <AdapterContext.Provider value={value}>{children}</AdapterContext.Provider>
}

export function useAdapter(): AdapterContextValue {
  const ctx = useContext(AdapterContext)
  if (!ctx) throw new Error("AdapterProvider is missing")
  return ctx
}

