"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Circle, Loader2, GitCommit, FileCode, ChevronDown, ChevronUp } from "lucide-react";

interface VersionGroup {
  version: string;
  displayVersion: string;
  date: string;
  benefits: string[];
  files: string[];
}

interface SystemUpdatesListProps {
  variant?: "host" | "tenant";
}

function UpdateCard({ 
  upg, 
  variant 
}: { 
  upg: VersionGroup; 
  variant: "host" | "tenant" 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isHost = variant === "host";

  // Class style selectors based on variant
  const badgeStyles = isHost 
    ? "bg-primary/10 border-primary/20 text-primary" 
    : "bg-tenant-primary/10 border-tenant-primary/20 text-tenant-primary";
  const cardBorderHover = isHost ? "hover:border-primary/20" : "hover:border-tenant-primary/20";
  const filesBtnStyles = isHost 
    ? "text-primary/70 hover:text-primary hover:bg-primary/5 border-primary/10" 
    : "text-tenant-primary/70 hover:text-tenant-primary hover:bg-tenant-primary/5 border-tenant-primary/10";

  return (
    <div className="relative group">
      {/* Timeline Node Badge */}
      <span className="absolute -left-[35px] top-6 bg-white dark:bg-[#0D0D15] p-1 rounded-none border-2 border-slate-200 dark:border-[#1F1F35] flex items-center justify-center z-10 shadow-sm">
        <Circle className={`h-2.5 w-2.5 ${isHost ? "fill-primary text-primary" : "fill-tenant-primary text-tenant-primary"}`} />
      </span>

      {/* Main Release Card */}
      <div className={`p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-none shadow-sm space-y-4 ${cardBorderHover} hover:scale-[1.01] hover:shadow-md transition-all duration-300`}>
        
        {/* Card Header (Version Tag + Date) */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className={`px-2.5 py-0.5 border rounded-none text-[10px] font-black tracking-wider uppercase select-none shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.4)] ${badgeStyles}`}>
            {upg.version}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500 font-semibold select-none">
            <Calendar size={12} />
            {upg.date}
          </span>
        </div>

        {/* List of changes / user benefits */}
        <div className="space-y-2 select-text">
          <ul className="space-y-2.5">
            {upg.benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                <GitCommit size={14} className={`mt-1 shrink-0 ${isHost ? "text-primary/75" : "text-tenant-primary/75"}`} />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Collapsible files list */}
        {upg.files.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1F1F35]/40">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none border text-[10.5px] font-bold cursor-pointer transition-all ${filesBtnStyles}`}
            >
              <FileCode size={12} />
              <span>
                {isExpanded ? "Skrýt změněné soubory" : `Zobrazit změněné soubory (${upg.files.length})`}
              </span>
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {isExpanded && (
              <div className="bg-slate-50/50 dark:bg-black/25 border border-slate-200/40 dark:border-[#1F1F35]/40 rounded-none p-3.5 max-h-48 overflow-y-auto scrollbar-none animate-in fade-in slide-in-from-top-1 duration-200">
                <ul className="space-y-1.5">
                  {upg.files.map((file, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[10.5px] text-slate-500 dark:text-zinc-400 font-mono select-all">
                      <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-zinc-600 rounded-none shrink-0" />
                      <span>{file}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SystemUpdatesList({ variant = "tenant" }: SystemUpdatesListProps) {
  const [updates, setUpdates] = useState<VersionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUpdates() {
      try {
        const res = await fetch("/api/system-updates");
        if (!res.ok) throw new Error("Nepodařilo se načíst systémové aktualizace.");
        const data = await res.json();
        setUpdates(data.updates || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Chyba při stahování aktualizací");
      } finally {
        setLoading(false);
      }
    }
    fetchUpdates();
  }, []);

  const isHost = variant === "host";
  const loaderColor = isHost ? "text-primary" : "text-tenant-primary";

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-zinc-400">
        <Loader2 className={`animate-spin ${loaderColor}`} size={24} />
        <span className="text-xs font-mono select-none">Načítání systémového protokolu změn...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-xs text-rose-500 font-mono bg-rose-500/5 border border-rose-500/20 rounded-none">
        {error}
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground font-mono bg-white/45 dark:bg-[#0D0D15]/40 border border-slate-200/50 dark:border-[#1F1F35] rounded-none select-none">
        Žádné zaznamenané systémové aktualizace.
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-slate-100 dark:border-[#1F1F35] pl-6 ml-3 space-y-6 py-2">
      {updates.map((upg) => (
        <UpdateCard key={upg.version} upg={upg} variant={variant} />
      ))}
    </div>
  );
}
