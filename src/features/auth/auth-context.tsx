"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User, UserRole } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (userId: string) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENT_USER_KEY = "task-hub:current-user";
const USERS_KEY = "task-hub:users";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadUsersFromStorage(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

function findUserById(userId: string): User | null {
  const users = loadUsersFromStorage();
  return users.find((u) => u.id === userId) ?? null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedId = localStorage.getItem(CURRENT_USER_KEY);
    if (storedId) {
      const found = findUserById(storedId);
      if (found) {
        setUser(found);
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((userId: string) => {
    const found = findUserById(userId);
    if (found) {
      localStorage.setItem(CURRENT_USER_KEY, userId);
      setUser(found);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    const users = loadUsersFromStorage();
    const match = users.find((u) => u.role === role);
    if (match) {
      localStorage.setItem(CURRENT_USER_KEY, match.id);
      setUser(match);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout, switchRole }),
    [user, isLoading, login, logout, switchRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
