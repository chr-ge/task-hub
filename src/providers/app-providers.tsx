"use client";

import { useEffect } from "react";
import QueryProvider from "./query-provider";
import { AuthProvider } from "@/features/auth";
import { Toaster } from "@/components/ui/sonner";
import { seedDatabase } from "@/lib/seed";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryProvider>
  );
}
