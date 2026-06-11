"use client";

import React from "react";
import { Check, AlertCircle } from "lucide-react";

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
  okLabel = "OK"
}: AlertDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-[#1F1F35] max-w-sm w-full p-6 rounded-3xl shadow-[0_20px_50px_rgba(112,0,255,0.12)] relative transition-all duration-300 text-xs text-left">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-3.5 flex items-center gap-2 select-none">
          {type === "success" ? (
            <Check className="text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 p-0.5 rounded-full" size={18} />
          ) : type === "error" ? (
            <AlertCircle className="text-rose-500 dark:text-rose-455 bg-rose-500/10 p-0.5 rounded-full" size={18} />
          ) : (
            <AlertCircle className="text-[#7000FF] dark:text-[#A78BFA] bg-[#7000FF]/10 p-0.5 rounded-full" size={18} />
          )}
          {title}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6 whitespace-pre-line font-medium">
          {message}
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs text-white font-bold bg-[#7000FF] hover:bg-[#5B00D6] dark:bg-[#7000FF] dark:hover:bg-[#6000EE] shadow-[0_4px_14px_rgba(112,0,255,0.3)] transition-all duration-200"
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
