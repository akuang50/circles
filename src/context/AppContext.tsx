import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@/core/types";
import { getStore, type CirclesStore } from "@/data";

type AppState = {
  store: CirclesStore;
  user: User | null;
  ready: boolean;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getStore(), []);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return store.subscribeAuth((next) => {
      setUser(next);
      setReady(true);
    });
  }, [store]);

  const value = useMemo(() => ({ store, user, ready }), [store, user, ready]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
