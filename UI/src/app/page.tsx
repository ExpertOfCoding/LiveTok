"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Settings, Monitor, Zap } from "lucide-react";

export default function Home() {
  const [status, setStatus] = useState<string | null>(null);
  const [screens, setScreens] = useState<string[]>(["1", "2"]);

  const fetchScreens = async () => {
    try {
      const resp = await fetch("http://localhost:3000/config");
      const config = await resp.json();
      if (config.actions) {
        const uniqueScreens = Array.from(
          new Set(Object.values(config.actions).map((a: any) => a.screen))
        ) as string[];

        // Ensure we have at least 1 and 2 if they are not there, or just show what's in actions
        if (uniqueScreens.length > 0) {
          setScreens(uniqueScreens.sort());
        }
      }
    } catch (err) {
      console.error("Failed to fetch screens", err);
    }
  };

  useEffect(() => {
    fetchScreens();
  }, []);

  const refreshConfig = async () => {
    try {
      const resp = await fetch("http://localhost:3000/updateData");
      if (resp.ok) {
        setStatus("Backend config reloaded!");
        fetchScreens();
      } else {
        setStatus("Failed to reload backend config.");
      }
    } catch (err) {
      setStatus("Error: Backend not reachable.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-[#050505] text-white selection:bg-primary selection:text-white">
      <div className="glass p-12 rounded-[2.5rem] text-center max-w-5xl w-full border border-white/5 shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-secondary/10 blur-[120px] rounded-full"></div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8 animate-fade-in">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Next-Gen Interaction</span>
        </div>

        <h1 className="text-7xl md:text-9xl font-black mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/20 tracking-tighter italic">
          LIVETOK
        </h1>

        <p className="text-zinc-500 mb-16 text-xl max-w-2xl mx-auto font-light leading-relaxed">
          The ultimate bridge between TikTok Live and Minecraft. <br />
          Custom overlays, real-time events, and premium aesthetics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {screens.map((id) => (
            <Link key={id} href={`/screen/${id}`} className="group">
              <div className="glass p-8 rounded-3xl border border-white/5 group-hover:border-primary/40 transition-all duration-500 group-hover:bg-primary/5 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                  <Monitor className="w-16 h-16" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Overlay #{id}</h3>
                <p className="text-zinc-500 group-hover:text-zinc-300 transition-colors text-sm">Active display for screen {id}.</p>
                <div className="mt-6 flex items-center gap-2 text-primary font-black text-xs tracking-widest uppercase">
                  Launch <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <Link href="/config">
            <button className="px-10 py-5 bg-white text-black font-black rounded-2xl hover:scale-105 transition-all uppercase tracking-widest shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 flex items-center gap-3">
              <Settings className="w-5 h-5" />
              Manager Dashboard
            </button>
          </Link>
          <button
            onClick={refreshConfig}
            className="px-10 py-5 glass border-white/10 text-white font-bold rounded-2xl hover:bg-white/5 transition-all uppercase tracking-widest active:scale-95 border-2"
          >
            Sync Backend
          </button>
        </div>

        {status && (
          <div className="mt-12 p-4 rounded-2xl bg-white/5 border border-white/5 animate-slide-in inline-block px-8">
            <p className={`font-mono text-sm tracking-widest uppercase ${status.includes("Error") ? "text-red-500" : "text-primary"}`}>
              {status}
            </p>
          </div>
        )}
      </div>

      <footer className="mt-16 text-zinc-800 text-xs font-black tracking-[0.5em] uppercase">
        Connected v1.0.4 // Port 3000
      </footer>
    </main>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor font-bold">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
    </svg>
  );
}
