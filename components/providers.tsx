"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { Toaster } from "sonner";
import { ErrorFeedbackProvider } from "@/components/management/error-feedback";
import { configureApiAuthBridge } from "@/lib/api";

function ApiSessionBridge({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const signingOut = useRef(false);

  useLayoutEffect(() => {
    signingOut.current = false;
    configureApiAuthBridge({
      getAccessToken: () => session?.accessToken,
      getRefreshToken: () => session?.refreshToken,
      onAccessToken: async (accessToken) => {
        await update({ accessToken });
      },
      onUnauthorized: () => {
        if (!signingOut.current) {
          signingOut.current = true;
          void signOut({ callbackUrl: "/login" });
        }
      },
    });
  }, [session?.accessToken, session?.refreshToken, update]);

  return status === "loading" ? null : children;
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
        <ApiSessionBridge>
          <ErrorFeedbackProvider>{children}</ErrorFeedbackProvider>
        </ApiSessionBridge>
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

