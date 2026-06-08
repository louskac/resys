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
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel"
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
      <div className="bg-card border border-border max-w-sm w-full p-6 rounded-2xl shadow-2xl relative transition-colors duration-200 text-xs text-left">
        <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
          <AlertCircle className="text-amber-500" size={18} />
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1 py-2 text-xs font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            className="btn-danger-filled flex-1 py-2 text-xs font-bold"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
