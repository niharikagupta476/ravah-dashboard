"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemeProvider } from "next-themes";
import { ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <NextThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </NextThemeProvider>
    </SessionProvider>
  );
}
