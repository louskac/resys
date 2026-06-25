"use client";

import React from "react";
import { Mic } from "lucide-react";

interface AILiquidCoreProps {
  onClick: () => void;
  label?: string;
  title?: string;
  className?: string;
  showMicIcon?: boolean;
  hoverWidth?: string;
}

export default function AILiquidCore({
  onClick,
  label = "Rezervovat s ReKeeperem",
  title = "Otevřít ReKeepera",
  className = "",
  showMicIcon = true,
  hoverWidth = "300px"
}: AILiquidCoreProps) {
  return (
    <div 
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 group"
      style={{ '--hover-width': hoverWidth } as React.CSSProperties}
    >
      {/* Futuristic Siri/Gemini-style bleeding ambient glow outside the overflow-hidden button */}
      <div className="absolute left-0 top-0 h-14 w-14 pointer-events-none">
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#7000FF] via-[#EC4899] to-[#00F5FF] opacity-35 blur-[8px] group-hover:opacity-65 transition-opacity duration-300" />
      </div>

      <button
        onClick={onClick}
        className={`w-14 h-14 md:w-14 md:h-14 md:group-hover:w-[var(--hover-width)] rounded-full bg-slate-950/90 dark:bg-[#07070C]/95 backdrop-blur-xl border border-white/10 group-hover:border-tenant-primary/40 text-white flex items-center justify-start shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_20px_rgba(112,0,255,0.2)] group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_25px_rgba(112,0,255,0.35)] group-hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 ease-in-out cursor-pointer select-none overflow-hidden relative ${className}`}
        title={title}
      >
        {/* Inside core sphere */}
        <div className="absolute left-0 top-0 h-14 w-14 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
          <div className="absolute inset-0 rounded-full border border-white/15 bg-slate-950/90 backdrop-blur-lg shadow-[0_0_20px_rgba(112,0,255,0.3),inset_0_1px_2px_rgba(255,255,255,0.15)] overflow-hidden flex items-center justify-center transition-colors duration-300 group-hover:border-tenant-primary/30">
            {/* Pulsing base glow */}
            <div className="absolute inset-0 rounded-full bg-tenant-primary/10 animate-pulse" />
            
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

        {/* The expanding label & mic section */}
        <div className="hidden md:flex items-center justify-between w-[calc(var(--hover-width)-56px)] pl-16 pr-6 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out pointer-events-none group-hover:pointer-events-auto overflow-hidden whitespace-nowrap">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-300 group-hover:text-white transition-colors whitespace-nowrap shrink-0">
            {label}
          </span>
          
          <div className="flex items-center gap-2 pl-3.5 border-l border-white/10 text-[10px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
            {showMicIcon && (
              <Mic size={12} className="text-white shrink-0 animate-bounce drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" style={{ animationDuration: '2s' }} />
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
