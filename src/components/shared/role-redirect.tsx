"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth";

export function RoleRedirect() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "admin") {
      router.replace("/admin/tasks");
    } else if (user?.role === "worker") {
      router.replace("/worker");
    }
  }, [user, router]);

  return null;
}
