"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AIGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const supabase = createClient();
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch CSRF token
      const csrfRes = await fetch("http://localhost:3001/api/auth/csrf", {
        headers: {
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        }
      });
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrfToken;

      // Post to generate playlist
      const response = await fetch("http://localhost:3001/api/ai/playlist/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ prompt, playlistName }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate playlist");
      }

      // Success! Redirect to the new playlist (or generic playlists page)
      // For now, redirecting to playlists page. If there's a dynamic playlist page, can use data.data.playlistId
      router.push("/playlists");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto mt-10">
      <div className="flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-br from-[#1ed760]/20 via-[#0d150d] to-transparent p-12 rounded-[32px] border border-white/5 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-[#1ed760]/10 blur-[100px] pointer-events-none" />
        
        <span className="material-symbols-outlined text-6xl text-[#1ed760] drop-shadow-[0_0_15px_rgba(30,215,96,0.5)]">
          auto_awesome
        </span>
        
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">AI Playlist Generator</h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Describe a mood, activity, or setting, and our AI will instantly generate the perfect playlist for you.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="w-full max-w-lg space-y-6 mt-8 z-10">
          <div className="space-y-4 text-left">
            <div>
              <label className="text-sm font-semibold text-white/70 ml-1">The Vibe (Prompt)</label>
              <input
                type="text"
                placeholder="e.g. Late night coding with lofi beats..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#1ed760]/50 focus:bg-white/10 transition-all duration-300"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-semibold text-white/70 ml-1">Playlist Name (Optional)</label>
              <input
                type="text"
                placeholder="Leave blank for auto-generated name"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#1ed760]/50 focus:bg-white/10 transition-all duration-300"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-left flex items-start gap-3">
              <span className="material-symbols-outlined text-lg">error</span>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-[#1ed760] text-black font-black py-4 rounded-xl hover:bg-[#4cf479] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_20px_rgba(30,215,96,0.3)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="material-symbols-outlined animate-spin">refresh</span>
                Generating Magic...
              </>
            ) : (
              <>
                Generate Playlist
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {[
          { title: "Workout Pump", prompt: "High energy edm for working out" },
          { title: "Rainy Evening", prompt: "Acoustic relaxing songs for a rainy evening" },
          { title: "Road Trip", prompt: "Classic pop songs for a long drive" }
        ].map((item) => (
          <button
            key={item.title}
            onClick={() => setPrompt(item.prompt)}
            className="bg-white/5 border border-white/5 rounded-2xl p-6 text-left hover:bg-white/10 transition-colors group"
          >
            <h3 className="font-bold text-white group-hover:text-[#1ed760] transition-colors">{item.title}</h3>
            <p className="text-sm text-white/40 mt-2 line-clamp-2">{item.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
