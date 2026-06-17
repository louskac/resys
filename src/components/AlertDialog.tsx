"use client";

import React from "react";
import { Check, AlertCircle, Info } from "lucide-react";

interface AlertDialogProps {
  isOpen: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
  onClose: () => void;
  okLabel?: string;
}

export default function AlertDialog({
  isOpen,
  type,
  title,
  message,
  onClose,
  okLabel = "Rozumím"
}: AlertDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-[#1F1F35] max-w-sm w-full p-7 rounded-[2rem] shadow-[0_20px_50px_rgba(112,0,255,0.15)] relative transition-all duration-300 text-center flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
        
        {/* Animated Icon Circle */}
        <div className="flex items-center justify-center">
          {type === "success" ? (
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center animate-bounce shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-emerald-500/20">
              <Check className="text-emerald-500 dark:text-emerald-450" size={26} />
            </div>
          ) : type === "error" ? (
            <div className="h-14 w-14 rounded-full bg-rose-500/10 dark:bg-rose-500/15 flex items-center justify-center animate-[shake_0.5s_ease-in-out_infinite] shadow-[0_0_20px_rgba(244,63,94,0.2)] border border-rose-500/20">
              <AlertCircle className="text-rose-550 dark:text-rose-450" size={26} />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-full bg-purple-500/10 dark:bg-purple-500/15 flex items-center justify-center shadow-[0_0_20px_rgba(112,0,255,0.2)] border border-purple-500/20">
              <Info className="text-purple-550 dark:text-purple-400" size={26} />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 tracking-tight select-none">
          {title}
        </h3>

        {/* Description Message */}
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-xs font-semibold whitespace-pre-line -mt-1 max-w-[90%]">
          {message}
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-xl text-xs text-white font-bold bg-[#7000FF] hover:bg-[#5B00D6] dark:bg-[#7000FF] dark:hover:bg-[#6000EE] shadow-[0_4px_14px_rgba(112,0,255,0.3)] hover:shadow-[0_6px_20px_rgba(112,0,255,0.4)] transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          {okLabel}
        </button>
      </div>
    </div>
  );
}

