"use client";

import React from "react";

export interface AIStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  isCompleted: boolean;
  isError?: boolean;
  tooltip?: string;
  animationDelay?: string;
}

interface AIStepperProps {
  steps: AIStep[];
  className?: string;
}

export default function AIStepper({ steps, className = "" }: AIStepperProps) {
  return (
    <div className={`absolute -top-[24px] left-1/2 -translate-x-1/2 flex items-center gap-6 z-30 select-none ${className}`}>
      {steps.map((step) => {
        const isCompleted = step.isCompleted;
        const isError = step.isError;

        let bubbleStyles = "bg-[#0A0A10]/60 border-white/10 text-zinc-500 hover:border-white/20 hover:bg-[#101018]/80 hover:text-zinc-300";
        let textStyles = "text-zinc-500";

        if (isCompleted) {
          if (isError) {
            bubbleStyles = "bg-gradient-to-tr from-[#9B1C1C] via-[#DC2626] to-[#F87171] border-rose-400/80 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.45)] scale-110";
            textStyles = "text-rose-400 font-bold animate-pulse";
          } else {
            bubbleStyles = "bg-gradient-to-tr from-[#5000C8] via-[#7000FF] to-[#9D4EDD] border-purple-400/80 text-white shadow-[0_0_15px_rgba(112,0,255,0.4)] scale-110";
            textStyles = "text-purple-400 font-bold";
          }
        }

        return (
          <div
            key={step.id}
            className="flex flex-col items-center animate-fadeIn"
            style={{ animationDelay: step.animationDelay || "0ms" }}
          >
            <div
              className={`h-12 w-12 rounded-full border flex items-center justify-center transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.4)] backdrop-blur-md ${bubbleStyles}`}
              title={step.tooltip || step.label}
            >
              {step.icon}
            </div>
            <span className={`text-[9px] font-extrabold uppercase tracking-wider mt-1.5 transition-colors duration-300 ${textStyles}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
