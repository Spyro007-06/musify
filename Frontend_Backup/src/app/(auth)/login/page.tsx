"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { usePreferencesStore } from "@/features/profile/store/preferences-store";
import { apiClient } from "@/shared/services/api-client";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setAuthError(null);
    try {
      const { authService } = await import("@/services/auth");
      const res = await authService.login({
        email: data.email,
        password: data.password,
      });
      setAuth(res.user, res.accessToken);
      
      try {
        const prefsRes = await apiClient.get("/user/preferences", {
          headers: { Authorization: `Bearer ${res.accessToken}` }
        });
        const prefs = prefsRes.data.data;
        if (prefs && (prefs.favouriteLanguages?.length > 0 || prefs.favouriteArtists?.length > 0)) {
          usePreferencesStore.getState().setPreferences(prefs.favouriteLanguages, prefs.favouriteArtists);
        } else {
          usePreferencesStore.getState().resetPreferences();
        }
      } catch (err) {
        console.warn("Failed to fetch preferences:", err);
        usePreferencesStore.getState().resetPreferences();
      }

      router.push("/");
    } catch (err: any) {
      console.warn("Login failed:", err);
      const msg = err?.response?.data?.message || err?.message || "Invalid email or password.";
      setAuthError(msg);
    }
  };

  return (
    <main className="flex min-h-screen w-full select-none">
      {/* Left Side: Immersive Visuals */}
      <section className="hidden lg:flex relative w-1/2 items-center justify-center overflow-hidden bg-black/20">
        {/* Animated ambient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d150d] via-[#151e15] to-[#0b0b0f] opacity-60" />
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#4cf479]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#4720ca]/10 blur-[120px] rounded-full" />

        {/* Music Notes SVG */}
        <div className="relative z-10 text-center px-12">
          <div className="mb-6 w-full max-w-sm mx-auto opacity-75">
            <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
              <defs>
                <linearGradient id="grad1" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: "#7B61FF", stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: "#4DA3FF", stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <g>
                <path
                  d="M150 100 L150 200 C150 220 130 230 110 230 C90 230 70 220 70 200 C70 180 90 170 110 170 C120 170 130 175 140 180 L140 110 L220 80 L220 120 L150 145"
                  fill="url(#grad1)"
                />
              </g>
              <g>
                <path
                  d="M280 180 L280 280 C280 300 260 310 240 310 C220 310 200 300 200 280 C200 260 220 250 240 250 C250 250 260 255 270 260 L270 190 L330 165 L330 200 L280 225"
                  fill="#1ED760"
                />
              </g>
            </svg>
          </div>
          <h1 className="text-5xl font-black text-[#4cf479] tracking-tighter mb-4">Musify</h1>
          <p className="text-white/60 text-base max-w-sm mx-auto">
            Experience sound in its purest form. High-fidelity audio, curated for your journey.
          </p>
        </div>
      </section>

      {/* Right Side: Clean Login Form */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <div className="glass-panel w-full max-w-md p-8 md:p-10 rounded-3xl z-10 animate-fade-in-up">
          <div className="text-center mb-8">
            <span className="material-symbols-outlined text-[#4cf479] text-5xl mb-4">graphic_eq</span>
            <h2 className="text-2xl font-bold text-white mb-1.5">Welcome back</h2>
            <p className="text-white/50 text-sm">Log in to your Musify account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-center">
                {authError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/50 px-1" htmlFor="email">
                Email address
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#4cf479] transition-colors">
                  mail
                </span>
                <input
                  type="email"
                  id="email"
                  {...register("email")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#4cf479]/20 focus:border-[#4cf479] outline-none transition-all text-sm"
                  placeholder="name@example.com"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs px-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-white/50" htmlFor="password">
                  Password
                </label>
                <Link href="#" className="text-xs text-[#4cf479] hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#4cf479] transition-colors">
                  lock
                </span>
                <input
                  type="password"
                  id="password"
                  {...register("password")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#4cf479]/20 focus:border-[#4cf479] outline-none transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-400 text-xs px-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#4cf479] text-[#003913] font-bold rounded-xl neon-glow transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
            >
              {isSubmitting ? "Logging In..." : "Log In"}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#18181f] px-4 text-white/40 font-semibold">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl hover:bg-white/10 transition-all text-xs font-bold text-white">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M12 5.04c1.94 0 3.51.68 4.79 1.84l3.54-3.54C18.18 1.48 15.34 0 12 0 7.31 0 3.25 2.69 1.25 6.61l4.08 3.17c.97-2.91 3.68-4.74 6.67-4.74z"
                  fill="#EA4335"
                />
                <path
                  d="M23.49 12.27c0-.8-.07-1.56-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.89 3c2.28-2.1 3.53-5.2 3.53-8.82z"
                  fill="#4285F4"
                />
                <path
                  d="M5.33 14.22c-.25-.74-.39-1.53-.39-2.35s.14-1.61.39-2.35L1.25 6.61C.45 8.19 0 9.94 0 12s.45 3.81 1.25 5.39l4.08-3.17z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.89-3c-1.1.74-2.51 1.17-4.07 1.17-3 0-5.54-2.01-6.46-4.74L1.25 17.75C3.25 21.31 7.31 24 12 24z"
                  fill="#34A853"
                />
              </svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl hover:bg-white/10 transition-all text-xs font-bold text-white">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M17.073 11.233c-.025-2.511 2.046-3.719 2.141-3.776-1.173-1.714-2.992-1.947-3.64-1.975-1.545-.158-3.016.91-3.8.91-.785 0-1.996-.893-3.287-.866-1.697.025-3.264.987-4.137 2.506-1.764 3.064-.452 7.6 1.264 10.075.838 1.209 1.831 2.565 3.136 2.516 1.257-.051 1.733-.812 3.251-.812 1.519 0 1.947.812 3.277.787 1.353-.025 2.215-1.233 3.047-2.45 1-.448 1.41-1.332 1.428-1.368-.02-.01-2.693-1.033-2.72-4.116M15.421 4.757c.691-.836 1.155-2.001.026-3.729-1.012.041-2.235.674-2.959 1.517-.652.747-1.22 1.943-1.071 3.093 1.134.088 2.274-.674 2.87-1.381" />
              </svg>
              Apple
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-white/50">
              New to Vibe?
              <Link href="/signup" className="text-[#4cf479] font-bold hover:underline ml-1.5">
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        {/* Simplified Footer */}
        <footer className="absolute bottom-6 left-0 w-full px-12 hidden lg:flex justify-between items-center opacity-40 select-none">
          <p className="text-[10px] font-bold text-white/40">© 2024 Vibe Music. High-Fidelity Sound.</p>
          <div className="flex gap-6 text-[10px] font-bold">
            <a href="#" className="text-white hover:text-[#4cf479] transition-colors">Privacy</a>
            <a href="#" className="text-white hover:text-[#4cf479] transition-colors">Terms</a>
            <a href="#" className="text-white hover:text-[#4cf479] transition-colors">Support</a>
          </div>
        </footer>
      </section>
    </main>
  );
}
