"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/utils";
import { useUiStore } from "@/shared/store/ui-store";

export function MobileSidebar() {
  const pathname = usePathname();
  const isMobileMenuOpen = useUiStore((state) => state.isMobileMenuOpen);
  const toggleMobileMenu = useUiStore((state) => state.toggleMobileMenu);

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

  if (!isMobileMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={toggleMobileMenu}
      />

      {/* Drawer */}
      <aside className="relative flex flex-col w-64 max-w-xs h-full bg-[#0b0b0f] border-r border-white/10 p-6 animate-fade-in-up">
        <div className="flex justify-between items-center mb-8">
          <div>
            <span className="text-xl font-black text-[#1ed760] tracking-tight">Musify</span>
            <p className="text-white/40 text-[10px] mt-0.5">Premium Audio</p>
          </div>
          <button onClick={toggleMobileMenu} className="text-white/60 hover:text-white">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto hide-scrollbar">
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href as any}
                onClick={toggleMobileMenu}
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
                onClick={toggleMobileMenu}
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
    </div>
  );
}
