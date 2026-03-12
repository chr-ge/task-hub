"use client";

import { useEffect } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
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
    <NuqsAdapter>
      <QueryProvider>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </QueryProvider>
    </NuqsAdapter>
  );
}
