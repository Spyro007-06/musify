"use client";

import { PropsWithChildren } from "react";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { AudioProvider } from "./audio-provider";

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AudioProvider>{children}</AudioProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
