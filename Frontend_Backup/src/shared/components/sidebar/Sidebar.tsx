"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/utils";
import { useUiStore } from "@/shared/store/ui-store";

export function Sidebar() {
  const pathname = usePathname();
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);

  const mainNav = [
    { name: "Home", href: "/", icon: "home" },
    { name: "Search", href: "/search", icon: "search" },
    { name: "Browse", href: "/browse", icon: "explore" },
    { name: "Library", href: "/library", icon: "library_music" },
  ];

  const collectionsNav = [
    { name: "Liked Songs", href: "/liked-songs", icon: "favorite" },
    { name: "Playlists", href: "/playlists", icon: "playlist_play" },
    { name: "AI Generator", href: "/ai-generator", icon: "auto_awesome" },
    { name: "Downloads", href: "/downloads", icon: "download" },
    { name: "Recently Played", href: "/history", icon: "history" },
  ];

  if (!isSidebarOpen) return null;

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 border-r border-white/10 bg-[#0d150d]/60 backdrop-blur-xl shadow-xl flex flex-col py-6 z-50 hidden md:flex select-none">
      <div className="px-6 mb-8">
        <span className="text-2xl font-black text-[#1ed760] tracking-tight">Musify</span>
        <p className="text-white/40 text-xs mt-0.5">Premium Audio</p>
      </div>

      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto hide-scrollbar">
        {mainNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href as any}
              className={cn(
                "flex items-center gap-4 px-4 py-2.5 rounded-lg transition-all duration-200 group text-sm font-semibold",
                isActive
                  ? "text-[#4cf479] bg-white/5 border-r-2 border-[#4cf479]"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}

        <div className="pt-6 pb-2 px-4 text-[10px] text-white/30 tracking-widest font-black uppercase">
          Collections
        </div>

        {collectionsNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href as any}
              className={cn(
                "flex items-center gap-4 px-4 py-2.5 rounded-lg transition-all duration-200 group text-sm font-semibold",
                isActive
                  ? "text-[#4cf479] bg-white/5 border-r-2 border-[#4cf479]"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>


    </aside>
  );
}
