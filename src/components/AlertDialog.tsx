"use client";

import React, { useState } from "react";
import { Check, AlertCircle, Info, Copy } from "lucide-react";

interface AlertDialogProps {
  isOpen: boolean;
  type: "success" | "error" | "info" | "confirm";
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  okLabel?: string;
  cancelLabel?: string;
  copyText?: string;
}

export default function AlertDialog({
  isOpen,
  type,
  title,
  message,
  onClose,
  onConfirm,
  okLabel = "Rozumím",
  cancelLabel = "Zrušit",
  copyText
}: AlertDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

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

        {/* Copy Box (if provided) */}
        {copyText && (
          <div className="w-full mt-2 text-left bg-slate-50/80 dark:bg-[#131322]/80 border border-slate-200/60 dark:border-[#1F1F35] rounded-2xl p-3.5 flex flex-col gap-2 relative group overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-200/40 dark:border-[#1F1F35]/40 pb-2 mb-1 select-none">
              <span className="text-[9px] text-muted-foreground font-extrabold uppercase tracking-widest">Credentials</span>
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer border text-[10px] font-bold ${
                  copied
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                    : "bg-white dark:bg-[#1C1C30] border-slate-200 dark:border-[#2E2E4A] hover:bg-slate-50 dark:hover:bg-[#25253D] text-slate-500 dark:text-slate-350 hover:text-slate-700 dark:hover:text-white shadow-sm"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={11} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="font-mono text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-350 whitespace-pre-wrap select-all font-semibold">
              {copyText}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        {onConfirm ? (
          <div className="flex gap-3 w-full mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 dark:border-[#2E2E4A] hover:bg-slate-50 dark:hover:bg-[#25253D] rounded-xl text-xs text-slate-600 dark:text-slate-350 font-bold transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-3 rounded-xl text-xs text-white font-bold bg-[#7000FF] hover:bg-[#5B00D6] dark:bg-[#7000FF] dark:hover:bg-[#6000EE] shadow-[0_4px_14px_rgba(112,0,255,0.3)] hover:shadow-[0_6px_20px_rgba(112,0,255,0.4)] transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              {okLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-3 rounded-xl text-xs text-white font-bold bg-[#7000FF] hover:bg-[#5B00D6] dark:bg-[#7000FF] dark:hover:bg-[#6000EE] shadow-[0_4px_14px_rgba(112,0,255,0.3)] hover:shadow-[0_6px_20px_rgba(112,0,255,0.4)] transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            {okLabel}
          </button>
        )}
      </div>
    </div>
  );
}

