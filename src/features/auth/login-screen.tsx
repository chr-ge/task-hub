"use client";

import { useEffect, useState } from "react";
import { LoaderIcon } from "lucide-react";
import type { User } from "@/lib/types";
import { useAuth } from "./auth-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const USERS_KEY = "task-hub:users";

function loadUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

export function LoginScreen() {
  const { login } = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    setUsers(loadUsers());
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel — desktop only */}
      <div className="hidden w-[40%] flex-col justify-center bg-muted/50 px-12 lg:flex">
        <div className="animate-in-fade">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-sm font-bold text-primary-foreground">
            T
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            TaskHub
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-[280px]">
            A micro-task platform for managing, completing, and reviewing work.
          </p>
        </div>
      </div>

      {/* User picker */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile header */}
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-primary-foreground">
                T
              </div>
              <span className="text-lg font-semibold tracking-tight">
                TaskHub
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Select an account to continue
          </p>

          {/* User list */}
          <div className="mt-4 space-y-1">
            {users.map((u, i) => (
              <button
                key={u.id}
                type="button"
                className={cn(
                  "animate-in-up flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => login(u.id)}
              >
                {/* Avatar */}
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt={u.name}
                    className="size-9 shrink-0 rounded-full bg-muted"
                  />
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {u.name.charAt(0)}
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email}
                  </p>
                </div>

                {/* Role badge */}
                <Badge
                  variant={u.role === "admin" ? "default" : "secondary"}
                  className="shrink-0 capitalize"
                >
                  {u.role}
                </Badge>
              </button>
            ))}

            {users.length === 0 && (
              <div className="animate-in-fade flex flex-col items-center gap-3 py-12 text-center">
                <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading accounts&hellip;
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
