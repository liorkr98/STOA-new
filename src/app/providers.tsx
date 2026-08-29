"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useState, type ReactNode } from "react";
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { InstallHint } from "@/components/layout/install-hint";
import { PwaRegister } from "@/components/layout/pwa-register";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={client}>
        {children}
        <CookieConsentBanner />
        <InstallHint />
        <PwaRegister />
        <Toaster
          position="bottom-center"
          aria-live="polite"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-card)",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
