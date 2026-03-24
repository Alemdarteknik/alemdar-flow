"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { getQueryClient } from "@/lib/query-client";
import { watchpowerKeys } from "@/lib/watchpower";

type ProvidersProps = {
  children: ReactNode;
};

const STARTUP_STATUS_POLL_KEY = "alemdar-flow-startup-status-poll-v1";

function StartupStatusPoller() {
  const queryClient = getQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.sessionStorage.getItem(STARTUP_STATUS_POLL_KEY) === "done") {
      return;
    }

    window.sessionStorage.setItem(STARTUP_STATUS_POLL_KEY, "pending");

    void (async () => {
      try {
        const response = await fetch("/api/watchpower/poll", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Startup force poll failed with status ${response.status}`);
        }

        await queryClient.invalidateQueries({
          queryKey: watchpowerKeys.inverterStatus(),
        });

        window.sessionStorage.setItem(STARTUP_STATUS_POLL_KEY, "done");
      } catch (error) {
        console.error("Startup status poll failed:", error);
        window.sessionStorage.removeItem(STARTUP_STATUS_POLL_KEY);
      }
    })();
  }, [queryClient]);

  return null;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <StartupStatusPoller />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
