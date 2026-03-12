"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ListTodo,
  ClipboardCheck,
  Briefcase,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const adminNav: NavItem[] = [
  { label: "Tasks", href: "/admin/tasks", icon: <ListTodo className="size-4" /> },
  { label: "Submissions", href: "/admin/submissions", icon: <ClipboardCheck className="size-4" /> },
];

const userNav: NavItem[] = [
  { label: "Tasks", href: "/user", icon: <Briefcase className="size-4" /> },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const navItems = user.role === "admin" ? adminNav : userNav;
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar md:flex">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-primary-foreground">
            T
          </div>
          <span className="text-sm font-semibold tracking-tight">TaskHub</span>
          <Badge variant="outline" className="ml-auto text-[10px] capitalize">
            {user.role}
          </Badge>
        </div>
        <Separator />

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive =
              item.href === pathname ||
              (item.href !== "/admin" &&
                item.href !== "/user" &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User & actions */}
        <div className="border-t bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="size-8 rounded-full bg-muted"
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button
            className="inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="size-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-primary-foreground">
              T
            </div>
            <span className="text-sm font-semibold">TaskHub</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">
              {user.role}
            </Badge>
            <button
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={logout}
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>

        {navItems.length > 1 && (
          <nav className="flex border-t bg-card md:hidden">
            {navItems.map((item) => {
              const isActive =
                item.href === pathname ||
                (item.href !== "/admin" &&
                  item.href !== "/user" &&
                  pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
