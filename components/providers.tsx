"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { Toaster } from "sonner";
import { configureApiAuthBridge } from "@/lib/api";

function ApiSessionBridge() {
  const { data: session, update } = useSession();

  useEffect(() => {
    configureApiAuthBridge({
      getAccessToken: () => session?.accessToken,
      getRefreshToken: () => session?.refreshToken,
      onAccessToken: async (accessToken) => {
        await update({ accessToken });
      },
      onUnauthorized: () => {
        void signOut({ callbackUrl: "/login" });
      },
    });
  }, [session?.accessToken, session?.refreshToken, update]);

  return null;
}

function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <ApiSessionBridge />
        {children}
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-poppins)",
            },
          }}
        />
      </QueryProvider>
    </SessionProvider>
  );
}

