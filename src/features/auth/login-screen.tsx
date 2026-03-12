"use client";

import { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { useAuth } from "./auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">TaskHub</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select an account to continue
          </p>
        </div>

        {/* User list */}
        <div className="space-y-3">
          {users.map((u) => (
            <Card
              key={u.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-muted/50",
              )}
            >
              <CardContent className="flex items-center gap-4">
                {/* Avatar */}
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt={u.name}
                    className="size-10 shrink-0 rounded-full bg-muted"
                  />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {u.name.charAt(0)}
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.name}</p>
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

                {/* Login button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => login(u.id)}
                >
                  Login
                </Button>
              </CardContent>
            </Card>
          ))}

          {users.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No users found. Data may still be loading.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
