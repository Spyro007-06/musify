"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { usePreferencesStore } from "@/features/profile/store/preferences-store";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    setAuthError(null);
    try {
      const generatedUsername = data.email
        .split("@")[0]
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .toLowerCase();

      const { authService } = await import("@/services/auth");
      // Map frontend fields to match backend signupSchema requirements
      const res = await authService.signup({
        email: data.email,
        username: generatedUsername,
        password: data.password,
        displayName: data.name,
      } as any);

      setAuth(res.user, res.accessToken);
      usePreferencesStore.getState().resetPreferences();
      router.push("/");
    } catch (err: any) {
      console.warn("Signup failed:", err);
      const msg = err?.response?.data?.message || err?.message || "Registration failed. Try again.";
      setAuthError(msg);
    }
  };

  return (
    <main className="flex min-h-screen w-full select-none">
      {/* Left Side: Immersive Visuals */}
      <section className="hidden lg:flex relative w-1/2 items-center justify-center overflow-hidden bg-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d150d] via-[#151e15] to-[#0b0b0f] opacity-60" />
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#4cf479]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#4720ca]/10 blur-[120px] rounded-full" />

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

      {/* Right Side: Clean Form */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <div className="glass-panel w-full max-w-md p-8 md:p-10 rounded-3xl z-10 animate-fade-in-up">
          <div className="text-center mb-8">
            <span className="material-symbols-outlined text-[#4cf479] text-5xl mb-4">graphic_eq</span>
            <h2 className="text-2xl font-bold text-white mb-1.5">Get Started</h2>
            <p className="text-white/50 text-sm">Create your free Musify account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-center">
                {authError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/50 px-1" htmlFor="name">
                Full Name
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#4cf479] transition-colors">
                  person
                </span>
                <input
                  type="text"
                  id="name"
                  {...register("name")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#4cf479]/20 focus:border-[#4cf479] outline-none transition-all text-sm"
                  placeholder="John Doe"
                />
              </div>
              {errors.name && <p className="text-red-400 text-xs px-1">{errors.name.message}</p>}
            </div>

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
              <label className="text-xs font-bold text-white/50 px-1" htmlFor="password">
                Password
              </label>
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
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/50">
              Already have an account?
              <Link href="/login" className="text-[#4cf479] font-bold hover:underline ml-1.5">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
