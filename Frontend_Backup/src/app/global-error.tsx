"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#0b0b0f] text-white min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <span className="text-5xl">⚡</span>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-3">Musify crashed</h1>
            <p className="text-white/50 text-sm leading-relaxed">
              A critical error occurred. Our team has been notified. Please try refreshing the page.
            </p>
          </div>
          <button
            onClick={reset}
            className="bg-[#4cf479] hover:bg-[#69ff89] text-[#003913] font-bold text-sm px-10 py-3.5 rounded-full transition-all hover:scale-105 active:scale-95 uppercase tracking-wider"
          >
            Reload App
          </button>
        </div>
      </body>
    </html>
  );
}
