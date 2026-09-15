import type { Metadata } from "next";
import "@/styles/globals.css";
import { AppProvider } from "@/providers/app-provider";

export const metadata: Metadata = {
  title: "Musify - Premium Audio Streaming",
  description: "Experience sound in its purest form. High-fidelity audio, curated for your journey.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00F0FF]/10 via-background to-background"></div>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
