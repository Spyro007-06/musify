"use client";

import { Sidebar } from "@/shared/components/sidebar/Sidebar";
import { MobileSidebar } from "@/shared/components/sidebar/MobileSidebar";
import { Navbar } from "@/shared/components/navbar/Navbar";
import { Player } from "@/features/player/components/Player";
import { QueueDrawer } from "@/features/player/components/QueueDrawer";
import { LyricsView } from "@/features/player/components/LyricsView";
import { usePlayerStore } from "@/features/player/store/player-store";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const accentColor = usePlayerStore((state) => state.accentColor);

  return (
    <div 
      className="min-h-screen text-[#dce5d8] overflow-x-hidden transition-colors duration-1000 ease-in-out relative"
      style={{
        backgroundColor: "#0b0b0f", // Fallback
      }}
    >
      {/* Dynamic Background Glow Layer */}
      <div 
        className="fixed inset-0 pointer-events-none transition-opacity duration-1000 z-[-1]"
        style={{
          background: accentColor 
            ? `radial-gradient(circle at 50% 0%, ${accentColor}40 0%, #0b0b0f 70%)` 
            : 'transparent'
        }}
      />
      {/* Sidebars */}
      <Sidebar />
      <MobileSidebar />

      {/* Main Content Layout */}
      <div className="flex flex-col min-h-screen md:pl-64">
        {/* Navigation */}
        <Navbar />

        {/* Dynamic Pages Area */}
        <main className="flex-1 pt-20 pb-32 px-4 sm:px-6 md:px-12 w-full max-w-[1400px] mx-auto">
          {children}
        </main>

        {/* Global Drawers */}
        <QueueDrawer />
        <LyricsView />

        {/* Bottom Persistent Audio Player */}
        <Player />
      </div>
    </div>
  );
}
