"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Code2, Database } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

interface HeroSectionProps {
  hostConsoleUrl: string;
}

export default function HeroSection({ hostConsoleUrl }: HeroSectionProps) {
  return (
    <section className="relative w-full h-[600px] sm:h-[700px] lg:h-[780px] bg-slate-950 overflow-hidden">
      
      {/* 1. BACKGROUND IMAGE (Flipped 180deg and stretched to 100% screen width) */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-vibe-1.jpg"
          alt="Venkovní tenisový kurt s přístupovým sloupkem"
          fill
          priority
          className="object-cover object-center pointer-events-none"
          sizes="100vw"
        />
      </div>

      {/* 2. DYNAMIC AMBIENT GLOW OVERLAYS */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-tenant-primary/15 blur-[120px] pointer-events-none z-10" />
      <div className="absolute bottom-[10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-tenant-primary/10 blur-[120px] pointer-events-none z-10" />

      {/* 3. SHADOW & GRADIENT MASK FOR HIGH CONTRAST TEXT */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/98 via-black/90 md:via-black/70 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10 pointer-events-none" />

      {/* 4. LEANING INTO GHOST TYPOGRAPHY DESIGN LANGUAGE */}
      {/* Solid text with low opacity to prevent diacritic rendering issues on Á and Ů */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-15 overflow-hidden">
        <span className="text-[9.5vw] font-black tracking-tighter uppercase leading-none whitespace-nowrap text-white opacity-[0.08]">
          AUTOMATIZACE AREÁLŮ
        </span>
      </div>

      {/* 5. OVERLAY CONTENT GRID (Aligned to max-w-7xl) */}
      <div className="absolute inset-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-full w-full relative flex items-center justify-between pt-24 sm:pt-32 pb-16">
          
          {/* Left Column: B2B Copywriting & CTAs */}
          <div className="max-w-xl space-y-6 md:space-y-8 text-left">
            <ScrollReveal animation="fade-right" duration={800} delay={100} className="space-y-2 select-none">
              <div className="inline-block border border-tenant-primary px-3 py-1.5 text-[9.5px] font-black text-tenant-primary uppercase tracking-widest leading-none bg-tenant-primary/5 rounded-none mb-3">
                PROVOZOVATELÉ AREÁLŮ
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5.5xl font-black tracking-tighter uppercase leading-none text-white pt-1">
                AUTOMATICKÁ SPRÁVA. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B766FF] to-[#38BDF8]">
                  OD REZERVACE PO VSTUP.
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal animation="fade-right" duration={800} delay={200}>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                Propojení online rezervací, platebních bran a automatického spínání osvětlení či zámků pro sportoviště a haly. Systém na základě rezervovaných slotů spouští připojený hardware bez nutnosti stálé obsluhy.
              </p>
            </ScrollReveal>

            <ScrollReveal animation="fade-right" duration={800} delay={250} className="flex flex-wrap gap-3 pt-2">
              <a 
                href={hostConsoleUrl}
                className="group bg-[#581c87] hover:bg-[#6b21a8] border border-[#a855f7]/50 shadow-lg shadow-purple-500/10 text-white text-[11px] sm:text-xs py-3.5 px-6 rounded-none font-extrabold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer"
              >
                SPUSTIT ADMINISTRACI (HOST)
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
              </a>
              <a 
                href="#sandbox"
                className="px-5 sm:px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/20 text-slate-200 hover:text-white text-[11px] sm:text-xs rounded-none font-extrabold uppercase tracking-widest transition-all duration-300 cursor-pointer"
              >
                PROHLÉDNOUT PORTÁLY
              </a>
            </ScrollReveal>

            {/* Developer credentials (Futuristically elegant & premium single point) */}
            <ScrollReveal animation="fade-right" duration={800} delay={300}>
              <div className="flex items-center pt-8 sm:pt-10 text-[8px] sm:text-[8.5px] font-mono uppercase tracking-widest text-slate-500 select-none">
                <span>VÝVOJ A TECHNICKÁ SPRÁVA &bull; <span className="text-slate-400 font-bold">DEEPVISION S.R.O.</span></span>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column: Subtle typographic stats with left accent border, no backgrounds */}
          <div className="absolute bottom-24 lg:bottom-28 right-6 hidden md:flex items-center gap-10 select-none">
            <div className="pl-4 border-l-2 border-tenant-primary">
              <div className="text-[9px] font-black text-tenant-primary uppercase tracking-widest leading-none">PROVOZ BEZ RECEPČNÍ</div>
              <div className="text-3xl lg:text-4xl font-black text-white mt-1.5 tracking-tight leading-none">Bezobslužně</div>
            </div>
            <div className="pl-4 border-l-2 border-tenant-primary">
              <div className="text-[9px] font-black text-tenant-primary uppercase tracking-widest leading-none">GARANTOVANÁ PLATBA</div>
              <div className="text-3xl lg:text-4xl font-black text-white mt-1.5 tracking-tight leading-none">100% online</div>
            </div>
          </div>

        </div>
      </div>

    </section>
  );
}
