"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, LoginScreen } from "@/features/auth";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Redirect to root when logged out so the URL resets.
  // Redirect to correct section when role doesn't match the current route.
  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (pathname !== "/") router.replace("/");
      return;
    }

    const onAdminRoute = pathname.startsWith("/admin");
    const onUserRoute = pathname.startsWith("/user");

    if (user.role === "admin" && !onAdminRoute) {
      router.replace("/admin/tasks");
    } else if (user.role === "user" && !onUserRoute) {
      router.replace("/user");
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
