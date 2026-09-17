import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSession } from "../api/authApi.js";

const SessionContext = createContext(undefined);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await getSession();
      setSession(user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check the auth cookie once on app load so the app knows who's logged in
  // (or that no one is) before deciding which route to render.
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <SessionContext.Provider value={{ session, isLoading, setSession, refreshSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
