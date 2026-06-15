"use client";

import React from "react";

interface AIWaveformProps {
  label?: string;
  className?: string;
}

export default function AIWaveform({
  label = "Poslouchám hlas...",
  className = ""
}: AIWaveformProps) {
  return (
    <div className={`flex items-center justify-center gap-2 py-3.5 bg-slate-950/40 backdrop-blur-md rounded-2xl border border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] z-10 ${className}`}>
      <span className="w-1.5 h-3 bg-purple-500 rounded-full wave-bar shadow-[0_0_6px_#a855f7]" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-7 bg-blue-500 rounded-full wave-bar shadow-[0_0_6px_#3b82f6]" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-10 bg-purple-400 rounded-full wave-bar shadow-[0_0_6px_#c084fc]" style={{ animationDelay: "300ms" }} />
      <span className="w-1.5 h-12 bg-cyan-400 rounded-full wave-bar shadow-[0_0_6px_#22d3ee]" style={{ animationDelay: "450ms" }} />
      <span className="w-1.5 h-7 bg-blue-400 rounded-full wave-bar shadow-[0_0_6px_#60a5fa]" style={{ animationDelay: "600ms" }} />
      <span className="w-1.5 h-3 bg-purple-500 rounded-full wave-bar shadow-[0_0_6px_#a855f7]" style={{ animationDelay: "750ms" }} />
      <span className="text-[10px] text-purple-300 font-bold tracking-widest uppercase ml-4 animate-pulse select-none">
        {label}
      </span>
    </div>
  );
}
