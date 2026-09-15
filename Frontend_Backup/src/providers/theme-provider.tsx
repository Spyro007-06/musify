"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { PropsWithChildren } from "react";

export function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      value={{ light: "theme-light", dark: "theme-dark" }}
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  );
}
