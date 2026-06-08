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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
      <div className="bg-card border border-border max-w-sm w-full p-6 rounded-2xl shadow-2xl relative transition-colors duration-200 text-xs text-left">
        <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
          {type === "success" ? (
            <Check className="text-emerald-500" size={18} />
          ) : type === "error" ? (
            <AlertCircle className="text-red-500" size={18} />
          ) : (
            <AlertCircle className="text-tenant-primary" size={18} />
          )}
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
          {message}
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-tenant text-white px-6 py-2 font-bold"
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
