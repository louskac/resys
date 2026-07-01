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

  const isDestructive = 
    title.toLowerCase().includes("zrušit") || 
    title.toLowerCase().includes("smazat") || 
    title.toLowerCase().includes("odstranit") ||
    title.toLowerCase().includes("storno") ||
    confirmLabel.toLowerCase().includes("zrušit") || 
    confirmLabel.toLowerCase().includes("smazat");

  return (
    <div className="fixed inset-0 bg-[#07070C]/65 backdrop-blur-sm flex items-center justify-center z-[110] p-6 animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-[#1F1F35] max-w-sm w-full p-6 rounded-none shadow-[0_20px_50px_rgba(112,0,255,0.12)] relative transition-all duration-300 text-xs text-left animate-in zoom-in-95 duration-200">
        
        <h3 className="text-base font-extrabold text-tenant-primary mb-1 select-none">
          {title}
        </h3>
        
        <p className="text-slate-550 dark:text-slate-400 leading-relaxed mb-6 whitespace-pre-line font-medium text-[11px] mt-2">
          {message}
        </p>
        
        <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-none text-[10.5px] font-bold border border-tenant-primary/20 border-l-[3px] border-l-tenant-primary bg-tenant-primary/10 hover:bg-tenant-primary text-tenant-primary hover:text-white transition-all duration-200 cursor-pointer shadow-sm uppercase tracking-widest flex items-center justify-center"
          >
            {cancelLabel}
          </button>
          {onThirdOption && thirdOptionLabel && (
            <button
              type="button"
              onClick={async () => {
                await onThirdOption();
              }}
              className={`flex-1 py-2 rounded-none text-[10.5px] font-bold border transition-all duration-200 cursor-pointer shadow-sm uppercase tracking-wider flex items-center justify-center ${
                isDestructive
                  ? "border-rose-200 dark:border-rose-900/40 border-l-[3px] border-l-rose-500 bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-450 hover:text-white"
                  : "border-tenant-primary/20 border-l-[3px] border-l-tenant-primary bg-tenant-primary/10 hover:bg-tenant-primary text-tenant-primary hover:text-white"
              }`}
            >
              {thirdOptionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            className={`flex-1 py-2 rounded-none text-[10.5px] font-bold border transition-all duration-200 cursor-pointer shadow-sm uppercase tracking-wider flex items-center justify-center ${
              isDestructive
                ? "border-rose-200 dark:border-rose-900/40 border-l-[3px] border-l-rose-500 bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-450 hover:text-white"
                : "border-tenant-primary/20 border-l-[3px] border-l-tenant-primary bg-tenant-primary/10 hover:bg-tenant-primary text-tenant-primary hover:text-white"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
