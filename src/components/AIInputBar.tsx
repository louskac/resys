"use client";

import React from "react";
import { Mic, Send, Check } from "lucide-react";

interface AIInputBarProps {
  inputText: string;
  onChangeInput: (text: string) => void;
  onSubmit: () => void;
  onMicClick: () => void;
  onConfirm: () => void;
  isListening: boolean;
  isLoading: boolean;
  isSpeechSupported: boolean;
  isReadyToConfirm: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function AIInputBar({
  inputText,
  onChangeInput,
  onSubmit,
  onMicClick,
  onConfirm,
  isListening,
  isLoading,
  isSpeechSupported,
  isReadyToConfirm,
  placeholder,
  disabled = false
}: AIInputBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  const defaultPlaceholder = isListening ? "Mluvte..." : "Napište pokyn...";

  return (
    <div className="flex items-center gap-2 z-10 w-full">
      {isSpeechSupported && (
        <button
          onClick={onMicClick}
          type="button"
          disabled={disabled || isLoading}
          className={`h-11 w-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer z-10 shrink-0 ${
            isListening
              ? "border-rose-500/50 bg-rose-500/20 text-rose-300 animate-pulse scale-105 shadow-[0_0_15px_rgba(239,68,68,0.35)]"
              : "border-white/10 text-zinc-200 bg-slate-950/40 hover:bg-slate-950/70 hover:border-purple-500/40 hover:text-white"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Mic size={18} />
        </button>
      )}

      <input
        type="text"
        id="ai-assistant-input"
        autoComplete="off"
        value={inputText}
        onChange={(e) => onChangeInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || defaultPlaceholder}
        className="flex-1 bg-slate-950/50 focus:bg-slate-950/70 border border-white/15 focus:border-purple-500/50 rounded-2xl px-4 h-11 text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:shadow-[0_0_15px_rgba(112,0,255,0.15)] transition-all z-10 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled || isListening || isLoading}
      />

      {isReadyToConfirm ? (
        <button
          onClick={onConfirm}
          type="button"
          disabled={disabled || isLoading}
          className="h-11 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-[11px] font-extrabold tracking-wider uppercase shadow-md shadow-emerald-600/20 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer flex items-center gap-1.5 z-10 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={14} className="text-emerald-100" />
          Potvrdit
        </button>
      ) : (
        <button
          onClick={onSubmit}
          type="button"
          disabled={disabled || isListening || isLoading || !inputText.trim()}
          className="h-11 w-11 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-950/20 hover:shadow-purple-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer z-10 shrink-0 disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      )}
    </div>
  );
}
