"use client";

import React from "react";
import { Mic } from "lucide-react";

interface AILiquidCoreProps {
  onClick: () => void;
  label?: string;
  title?: string;
  badgeText?: string;
  className?: string;
  showMicIcon?: boolean;
}

export default function AILiquidCore({
  onClick,
  label = "Rezervovat s ReKeeperem",
  title = "Otevřít ReKeepera",
  badgeText = "ReKeeper",
  className = "",
  showMicIcon = true
}: AILiquidCoreProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 h-12 pl-14 pr-5 rounded-full bg-slate-950/90 dark:bg-[#07070C]/95 backdrop-blur-xl border border-white/10 hover:border-purple-500/40 text-white flex items-center justify-between gap-5 shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_20px_rgba(112,0,255,0.2)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_25px_rgba(112,0,255,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 z-50 cursor-pointer group select-none ${className}`}
      title={title}
    >
      {/* Futuristic Siri/Gemini-style Liquid Energy Core docked on the left */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-14 w-14 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
        {/* Ambient background glow bleeding outside the border */}
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#7000FF] via-[#EC4899] to-[#00F5FF] opacity-35 blur-[8px] group-hover:opacity-65 transition-opacity duration-300" />
        
        {/* The main core sphere */}
        <div className="absolute inset-0 rounded-full border border-white/15 bg-slate-950/90 backdrop-blur-lg shadow-[0_0_20px_rgba(112,0,255,0.3),inset_0_1px_2px_rgba(255,255,255,0.15)] overflow-hidden flex items-center justify-center transition-colors duration-300 group-hover:border-purple-500/30">
          {/* Pulsing base glow */}
          <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-pulse" />
          
          {/* Layer 1: Deep Purple Blob */}
          <div className="absolute h-[34px] w-[34px] rounded-full bg-[#7000FF] blur-[7px] opacity-85 animate-blob-orbit-1" />
          
          {/* Layer 2: Neon Cyan Blob */}
          <div className="absolute h-[28px] w-[28px] rounded-full bg-[#00F5FF] blur-[6px] opacity-75 animate-blob-orbit-2 mix-blend-screen" />
          
          {/* Layer 3: Hot Pink Blob */}
          <div className="absolute h-[32px] w-[32px] rounded-full bg-[#EC4899] blur-[7px] opacity-70 animate-blob-orbit-3 mix-blend-screen" />
          
          {/* Layer 4: Royal Blue Blob */}
          <div className="absolute h-[36px] w-[36px] rounded-full bg-[#3B82F6] blur-[8px] opacity-60 animate-blob-orbit-1 mix-blend-screen" style={{ animationDirection: 'reverse', animationDuration: '9s' }} />
          
          {/* Layer 5: Bright Core (Siri style neon focus) */}
          <div className="absolute h-[14px] w-[14px] rounded-full bg-cyan-100 blur-[3px] opacity-60 animate-pulse" style={{ animationDuration: '1.5s' }} />
          
          {/* Glass reflection overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
        </div>
      </div>

      <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-300 group-hover:text-white transition-colors">
        {label}
      </span>
      
      <div className="flex items-center gap-2 pl-3.5 border-l border-white/10 text-[10px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
        {badgeText && (
          <span className="font-mono bg-white/[0.04] border border-white/[0.08] group-hover:border-purple-500/30 rounded px-1.5 py-0.5 select-none font-bold text-[9px] group-hover:text-purple-300 transition-colors">
            {badgeText}
          </span>
        )}
        {showMicIcon && (
          <Mic size={12} className="text-purple-400 shrink-0 animate-bounce drop-shadow-[0_0_4px_rgba(168,85,247,0.5)]" style={{ animationDuration: '2s' }} />
        )}
      </div>
    </button>
  );
}
