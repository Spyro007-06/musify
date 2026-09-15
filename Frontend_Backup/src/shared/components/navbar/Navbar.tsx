"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useUiStore } from "@/shared/store/ui-store";

export function Navbar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toggleMobileMenu = useUiStore((state) => state.toggleMobileMenu);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = user?.displayName || user?.username || user?.name || "User";
  const avatarUrl = user?.avatarUrl || user?.avatar || null;
  const initial = displayName.charAt(0).toUpperCase();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    try {
      const { authService } = await import("@/services/auth");
      await authService.logout();
    } catch (err) {
      console.warn("Backend logout failed:", err);
    } finally {
      logout();
      router.push("/login");
    }
  };

  return (
    <header className="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] z-40 bg-[#0d150d]/40 backdrop-blur-md flex justify-between items-center px-6 md:px-12 h-20 select-none">
      <div className="flex items-center gap-6 flex-1">
        {/* Mobile menu trigger */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden text-white/80 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-md w-full hidden md:block">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border-none rounded-full py-2.5 pl-12 pr-4 text-white placeholder:text-white/30 focus:ring-2 focus:ring-[#4cf479] outline-none text-sm transition-all"
            placeholder="Search artists, albums, songs..."
            suppressHydrationWarning
          />
        </form>

        {/* Mobile brand */}
        <div className="md:hidden text-xl font-black text-[#1ed760] tracking-tight">Musify</div>
      </div>

      <div className="flex items-center gap-6">
        <button className="text-white/60 hover:text-[#4cf479] transition-colors relative" suppressHydrationWarning>
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#4cf479] rounded-full" />
        </button>

        {user ? (
          <div className="relative" ref={dropdownRef}>
            {/* Avatar button */}
            <button
              onClick={() => setIsDropdownOpen((o) => !o)}
              className="w-10 h-10 rounded-full border border-white/20 overflow-hidden hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-[#4cf479]"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#4720ca] to-[#7B61FF] flex items-center justify-center text-white font-bold text-sm">
                  {initial}
                </div>
              )}
            </button>

            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-52 rounded-2xl glass-card py-2 shadow-2xl z-50 border border-white/10">
                {/* User info */}
                <div className="px-4 py-2.5 border-b border-white/5 mb-1">
                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                  <p className="text-[10px] text-white/40 truncate">{user.email}</p>
                </div>

                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-xs text-white/70 hover:text-white transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-xs text-white/70 hover:text-white transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  Settings
                </Link>

                <div className="border-t border-white/5 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 text-xs text-red-400 hover:text-red-300 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-5 py-2.5 transition-all"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
