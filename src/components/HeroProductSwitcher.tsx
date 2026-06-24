"use client";

import React, { useState } from "react";
import { Laptop, Smartphone, Cpu, Sparkles } from "lucide-react";

interface ViewMode {
  id: string;
  label: string;
  icon: React.ReactNode;
  image: string;
  alt: string;
  title: string;
  description: string;
  badges: string[];
  annotations: { x: string; y: string; label: string }[];
}

export default function HeroProductSwitcher() {
  const [activeTab, setActiveTab] = useState("customer");

  const views: ViewMode[] = [
    {
      id: "customer",
      label: "Zákaznický Portál",
      icon: <Smartphone size={14} />,
      image: "/resys-booking-interface.png",
      alt: "ReSys SaaS Mobile Booking Timeline Schedule",
      title: "Jednoduché klientské rezervační rozhraní",
      description: "Přehledný kalendář přizpůsobený pro mobilní telefony. Zákazníci si mohou okamžitě vybrat volný čas a zaplatit.",
      badges: ["Výběr tažením prstu", "Lístky v Apple/Google Wallet", "Automatické SMS a e-maily"],
      annotations: [
        { x: "12%", y: "15%", label: "Rychlé přihlášení jedním kliknutím" },
        { x: "55%", y: "45%", label: "Jednoduchý výběr volného času" },
        { x: "32%", y: "78%", label: "Průběžná rekapitulace ceny" }
      ]
    },
    {
      id: "admin",
      label: "Host Konzole",
      icon: <Laptop size={14} />,
      image: "/resys-hero-dashboard.png",
      alt: "ReSys SaaS Dashboard Admin Console",
      title: "Přehledná administrace pro správu areálu",
      description: "Přehledná administrace pro správu otevíracích dob, rezervovaných míst, přehledu plateb a automatického odemykání.",
      badges: ["Přehled plateb a tržeb", "Nastavení přístupů personálu", "Statistiky a vytíženost"],
      annotations: [
        { x: "10%", y: "10%", label: "Úprava barev a loga podle vaší značky" },
        { x: "42%", y: "30%", label: "Přehled všech rezervací v reálném čase" },
        { x: "78%", y: "85%", label: "Konfigurace technických přestávek" }
      ]
    },
    {
      id: "iot",
      label: "Automatický vstup",
      icon: <Cpu size={14} />,
      image: "/resys-iot-checkin.png",
      alt: "ReSys SaaS turnstile scanner checkin gateway",
      title: "Automatické odemykání dveří a bran bez personálu",
      description: "Propojení s chytrými zámky a čtečkami QR kódů. Zákazník přiloží telefon s QR kódem z rezervace a systém mu automaticky otevře dveře nebo zapne osvětlení.",
      badges: ["Otevření během okamžiku", "Platby kartou přímo u vstupu", "Funguje i při výpadku internetu"],
      annotations: [
        { x: "25%", y: "20%", label: "Skenování QR kódu z mobilu" },
        { x: "65%", y: "48%", label: "Okamžité ověření rezervace" },
        { x: "48%", y: "82%", label: "Automatické otevření dveří či turniketu" }
      ]
    }
  ];

  const currentView = views.find((v) => v.id === activeTab) || views[0];

  return (
    <div className="space-y-6 w-full">
      {/* Selector Tabs */}
      <div className="flex items-center bg-slate-200/50 dark:bg-black/60 border border-slate-300 dark:border-zinc-700 divide-x divide-slate-300 dark:divide-zinc-700 rounded-none w-full shadow-sm">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveTab(v.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 cursor-pointer whitespace-nowrap rounded-none ${
              activeTab === v.id
                ? "bg-tenant-primary/15 text-tenant-primary font-black shadow-[inset_0_-2px_0_0_var(--tenant-primary)]"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/5 dark:hover:bg-white/5"
            }`}
          >
            {v.icon}
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {/* Frame Container */}
      <div className="relative group p-2.5 bg-white/30 dark:bg-black/25 backdrop-blur-md border border-white/20 dark:border-zinc-800/60 rounded-none shadow-2xl transition-all duration-300">
        
        {/* Mock Window Controls Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 dark:border-zinc-800/40 bg-white/10 dark:bg-black/10 rounded-none select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
          </div>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono font-bold select-none tracking-wider uppercase">
            {currentView.alt}
          </span>
        </div>

        {/* Content Box */}
        <div className="relative rounded-none overflow-hidden bg-black/40 aspect-[4/3] flex items-center justify-center">
          
          {/* Main Visual Image */}
          <img
            src={currentView.image}
            alt={currentView.alt}
            className="w-full h-full object-cover select-none transition-transform duration-550 ease-out group-hover:scale-[1.01] animate-fade-in"
            key={currentView.image} // Force re-render/animation on tab change
          />

          {/* Interactive Annotations / Tooltips */}
          {currentView.annotations.map((ann, idx) => (
            <div
              key={idx}
              className="absolute hidden md:block group/ann"
              style={{ left: ann.x, top: ann.y }}
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute h-4 w-4 rounded-full bg-tenant-primary/30 animate-ping" />
                <span className="h-2.5 w-2.5 rounded-full bg-tenant-primary border-2 border-white dark:border-black cursor-pointer shadow-md" />
                
                {/* Pointer glass tooltip */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-44 scale-90 opacity-0 pointer-events-none group-hover/ann:scale-100 group-hover/ann:opacity-100 transition-all duration-200 bg-white/90 dark:bg-[#090912]/95 border border-slate-200/50 dark:border-[#1F1F35]/50 p-2 rounded-xl shadow-xl text-center backdrop-blur-md z-30">
                  <p className="text-[10px] leading-relaxed text-slate-800 dark:text-zinc-250 font-bold font-sans">
                    {ann.label}
                  </p>
                  <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-white/90 dark:bg-[#090912]/95 border-r border-b border-slate-200/50 dark:border-[#1F1F35]/50 z-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description Footer */}
      <div className="p-5 bg-white/45 dark:bg-[#07070C]/35 border border-slate-200/50 dark:border-[#1F1F35]/30 border-l-2 border-l-tenant-primary rounded-none text-left space-y-2 relative overflow-hidden backdrop-blur-xl">
        <h4 className="text-xs font-black text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles size={13} className="text-tenant-primary" />
          {currentView.title}
        </h4>
        <p className="text-xs text-slate-555 dark:text-zinc-400 leading-relaxed">
          {currentView.description}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {currentView.badges.map((badge, idx) => (
            <span
              key={idx}
              className="text-[9px] px-2 py-0.5 bg-tenant-primary/10 border border-tenant-primary/15 border-l border-l-tenant-primary text-tenant-primary font-black uppercase tracking-wider rounded-none"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
