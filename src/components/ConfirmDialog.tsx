"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  onThirdOption?: () => void | Promise<void>;
  thirdOptionLabel?: string;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Potvrdit",
  cancelLabel = "Zrušit",
  onThirdOption,
  thirdOptionLabel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-[#1F1F35] max-w-sm w-full p-6 rounded-3xl shadow-[0_20px_50px_rgba(112,0,255,0.12)] relative transition-all duration-300 text-xs text-left">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-3.5 flex items-center gap-2 select-none">
          <AlertCircle className="text-amber-500 dark:text-amber-400 bg-amber-500/10 p-0.5 rounded-full" size={18} />
          {title}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6 whitespace-pre-line font-medium">
          {message}
        </p>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#151522]/55 dark:hover:bg-[#1C1C30]/55 text-slate-700 dark:text-slate-350 border border-slate-200/40 dark:border-[#2A2A40] transition-colors"
          >
            {cancelLabel}
          </button>
          {onThirdOption && thirdOptionLabel && (
            <button
              type="button"
              onClick={async () => {
                await onThirdOption();
              }}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600/15 hover:bg-rose-600/25 text-rose-600 dark:text-rose-450 border border-rose-500/25 transition-colors"
            >
              {thirdOptionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-[0_4px_12px_rgba(225,29,72,0.2)] transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
