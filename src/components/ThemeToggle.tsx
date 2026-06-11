"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("color-scheme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("color-scheme", "light");
    }
  };

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl bg-white/20 dark:bg-[#131322]/20 border border-[#E2E2ED]/40 dark:border-[#1F1F2E]/40 opacity-20 animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-white/60 dark:bg-[#131322]/40 backdrop-blur-md hover:bg-white dark:hover:bg-[#1A1A2E]/60 text-slate-700 dark:text-slate-300 hover:text-foreground border border-[#E2E2ED] dark:border-[#1F1F2E] hover:border-slate-300 dark:hover:border-zinc-700 hover:scale-105 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center"
      aria-label="Toggle Theme"
      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      {theme === "light" ? (
        <Moon size={15} className="transition-transform duration-250 rotate-0 hover:-rotate-12" />
      ) : (
        <Sun size={15} className="transition-transform duration-250 rotate-0 hover:rotate-45" />
      )}
    </button>
  );
}
