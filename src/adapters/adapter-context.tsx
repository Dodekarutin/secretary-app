import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DataAdapter } from "@/adapters/data-adapter";
import { createLocalAdapter } from "@/adapters/local-adapter";
import { createHttpAdapter } from "@/adapters/http-adapter";
import { createIndexedDBAdapter } from "@/adapters/indexeddb-adapter";
import { clearLocalStorageMock, seedMinimalData } from "@/lib/db";
import { FF_TASK_BACKEND } from "@/lib/flags";

export type AdapterKind = "local" | "http" | "indexeddb";

const STORAGE_KEY = "secretary.adapter.kind";
const INIT_FLAG_KEY = "secretary.indexeddb.initialized";

function createAdapter(kind: AdapterKind): DataAdapter {
  if (kind === "http") return createHttpAdapter();
  if (kind === "indexeddb") return createIndexedDBAdapter();
  return createLocalAdapter();
}

type AdapterContextValue = {
  kind: AdapterKind;
  setKind: (k: AdapterKind) => void;
  adapter: DataAdapter;
};

const AdapterContext = createContext<AdapterContextValue | null>(null);

export const AdapterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ready, setReady] = useState(false);

  const initialKind: AdapterKind = useMemo(() => {
    // デフォルトは indexeddb を使用
    const saved = localStorage.getItem(STORAGE_KEY) as AdapterKind | null;
    return saved || "indexeddb";
  }, []);

  const [kind, setKindState] = useState<AdapterKind>(initialKind);

  const setKind = useCallback((k: AdapterKind) => {
    setKindState(k);
    localStorage.setItem(STORAGE_KEY, k);
  }, []);

  const adapter = useMemo(() => createAdapter(kind), [kind]);

  const value = useMemo(
    () => ({ kind, setKind, adapter }),
    [kind, setKind, adapter]
  );

  // IndexedDB 初期化
  useEffect(() => {
    async function init() {
      if (kind !== "indexeddb") {
        setReady(true);
        return;
      }

      const initialized = localStorage.getItem(INIT_FLAG_KEY);
      if (!initialized) {
        // 初回起動時: モックをクリアしてシードを投入
        console.log(
          "First time initialization: clearing mock and seeding data..."
        );
        clearLocalStorageMock();
        await seedMinimalData();
        localStorage.setItem(INIT_FLAG_KEY, "true");
      }

      setReady(true);
    }

    init().catch((err) => {
      console.error("Failed to initialize IndexedDB:", err);
      // エラー時は local にフォールバック
      setKindState("local");
      setReady(true);
    });
  }, [kind]);

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <AdapterContext.Provider value={value}>{children}</AdapterContext.Provider>
  );
};

export function useAdapter(): AdapterContextValue {
  const ctx = useContext(AdapterContext);
  if (!ctx) throw new Error("AdapterProvider is missing");
  return ctx;
}
