import { useEffect, useState, type ReactNode } from "react";
import { AuthContext } from "./auth-context";
import * as authApi from "../api/auth";
import { TOKEN_KEY } from "../api/client";
import type { User } from "../types/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Only "loading" if there's a saved token to check
  const [loading, setLoading] = useState(
    () => !!localStorage.getItem(TOKEN_KEY),
  );

  // On page refresh: if a token exists, ask the backend who we are
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authApi
      .getMe()
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  async function saveTokenAndLoadUser(accessToken: string) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    setUser(await authApi.getMe());
  }

  async function login(email: string, password: string) {
    const { accessToken } = await authApi.login({ email, password });
    await saveTokenAndLoadUser(accessToken);
  }

  async function register(name: string, email: string, password: string) {
    const { accessToken } = await authApi.register({ name, email, password });
    await saveTokenAndLoadUser(accessToken);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
