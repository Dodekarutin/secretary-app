import React from "react"
import { UndoManager } from "./undo-manager"

type UndoContextValue = {
  undoManager: UndoManager
}

const UndoContext = React.createContext<UndoContextValue | null>(null)

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const undoManager = React.useMemo(() => new UndoManager(50), [])
  return (
    <UndoContext.Provider value={{ undoManager }}>
      {children}
    </UndoContext.Provider>
  )
}

export function useUndo() {
  const ctx = React.useContext(UndoContext)
  if (!ctx) throw new Error("useUndo must be used within UndoProvider")
  return ctx
}

