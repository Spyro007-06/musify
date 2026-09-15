"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Page Error]:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-red-400">error</span>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-white/50 text-sm max-w-md">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <button
        onClick={reset}
        className="bg-[#4cf479] hover:bg-[#69ff89] text-[#003913] font-bold text-sm px-8 py-3 rounded-full transition-all hover:scale-105 active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}
