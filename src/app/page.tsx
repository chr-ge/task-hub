"use client";

import { AuthGuard, RoleRedirect } from "@/components/shared";

export default function Home() {
  return (
    <AuthGuard>
      <RoleRedirect />
    </AuthGuard>
  );
}
