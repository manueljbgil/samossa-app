import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { apiRequest, queryClient, setAuthToken } from "./queryClient";
import type { PublicUser } from "@shared/schema";

const AUTH_TOKEN_KEY = "auth_token";

type AuthState = {
  user: PublicUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const apply = useCallback(
    (newToken: string | null, newUser: PublicUser | null) => {
      setAuthToken(newToken);
      setToken(newToken);
      setUser(newUser);
      if (newToken) {
        localStorage.setItem(AUTH_TOKEN_KEY, newToken);
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
      // Invalidate all queries since auth state changed.
      queryClient.invalidateQueries();
    },
    [],
  );

  // Restore auth state on mount from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (storedToken) {
      setAuthToken(storedToken);
      setToken(storedToken);
      // Fetch current user info to verify token is still valid
      apiRequest("GET", "/api/auth/me")
        .then((res) => res.json())
        .then((data: { user: PublicUser | null }) => {
          if (data.user) {
            setUser(data.user);
          } else {
            // Token is invalid, clear it
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setAuthToken(null);
            setToken(null);
          }
        })
        .catch(() => {
          // Request failed, clear token
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setAuthToken(null);
          setToken(null);
        });
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });
      const data = (await res.json()) as { token: string; user: PublicUser };
      apply(data.token, data.user);
    },
    [apply],
  );

  const register = useCallback(
    async (username: string, password: string, displayName: string) => {
      const res = await apiRequest("POST", "/api/auth/register", {
        username,
        password,
        displayName,
      });
      const data = (await res.json()) as { token: string; user: PublicUser };
      apply(data.token, data.user);
    },
    [apply],
  );

  const googleLogin = useCallback(
    async (idToken: string) => {
      const res = await apiRequest("POST", "/api/auth/google-callback", {
        idToken,
      });
      const data = (await res.json()) as { token: string; user: PublicUser };
      apply(data.token, data.user);
    },
    [apply],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {
      // ignore
    }
    apply(null, null);
  }, [apply]);

  return (
    <AuthCtx.Provider
      value={{ user, token, login, register, googleLogin, logout }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
