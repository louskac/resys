import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { headers } from "next/headers";
import ScrollReveal from "@/components/ScrollReveal";
import { 
  ArrowRight, Cpu, Database, 
  Users, Layers, Lock, Server, Terminal
} from "lucide-react";

import prisma from "@/lib/prisma";
import { ensureDefaultData } from "@/lib/dbInit";
import PricingCalculator from "@/components/PricingCalculator";
import AIShowcase from "@/components/AIShowcase";

// Import new redesigned interactive sections
import HeroSection from "@/components/HeroSection";
import VerticalsShowcase from "@/components/VerticalsShowcase";
import BookingJourneyVisualizer from "@/components/BookingJourneyVisualizer";
import DeveloperConsole from "@/components/DeveloperConsole";

export default async function Home() {
  await ensureDefaultData();
  const hostHeader = (await headers()).get("host") || "";
  const isLocal = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");
  const hostConsoleUrl = isLocal ? "http://localhost:3000/host" : "/host";

  const tenants = await prisma.tenant.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="flex-1 bg-background text-foreground flex flex-col font-sans transition-colors duration-150 relative overflow-hidden">
      
      {/* Background ambient glow blobs */}
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] pointer-events-none select-none -z-10">
        <div className="w-full h-full rounded-full bg-tenant-primary/10 dark:bg-tenant-primary/5 blur-[100px]" />
      </div>
      <div className="absolute bottom-[15%] right-[-5%] w-[55%] h-[55%] pointer-events-none select-none -z-10">
        <div className="w-full h-full rounded-full bg-[#3B82F6]/10 dark:bg-[#3B82F6]/5 blur-[120px]" />
      </div>
      <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] pointer-events-none select-none -z-10">
        <div className="w-full h-full rounded-full bg-[#8B5CF6]/8 dark:bg-[#8B5CF6]/4 blur-[110px]" />
      </div>

      {/* HEADER */}
      <header className="border-b border-zinc-800/40 bg-zinc-950/90 backdrop-blur-xl sticky top-0 z-50 transition-all shadow-md shadow-black/10 select-none text-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 500"
              className="h-9 w-9 transition-transform hover:scale-105"
              fill="none"
            >
              <defs>
                <linearGradient id="resysGradientInline" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7000FF" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <linearGradient id="slotGradientInline" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F5FF" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <filter id="subtleGlowInline" x="-15%" y="-15%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#7000FF" floodOpacity="0.35" />
                </filter>
              </defs>
              <g filter="url(#subtleGlowInline)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M 110 150 L 155 105 H 315 C 385 105 405 145 405 205 C 405 255 380 285 325 295 L 385 395 H 320 L 265 305 H 175 V 395 H 120 V 170 L 110 150 Z M 175 160 V 255 H 275 C 325 255 345 235 345 205 C 345 175 325 160 275 160 H 175 Z"
                  fill="url(#resysGradientInline)"
                />
                <g>
                  {/* Row 1 */}
                  <rect x="290" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="312" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="334" y="325" width="10" height="10" rx="2.5" fill="url(#slotGradientInline)" />
                  <rect x="356" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
 
                  {/* Row 2 */}
                  <rect x="301" y="345" width="10" height="10" rx="2.5" fill="url(#slotGradientInline)" />
                  <rect x="323" y="345" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="345" y="345" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="367" y="345" width="10" height="10" rx="2.5" fill="url(#slotGradientInline)" />
 
                  {/* Row 3 */}
                  <rect x="312" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="334" y="365" width="10" height="10" rx="2.5" fill="url(#slotGradientInline)" />
                  <rect x="356" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                  <rect x="378" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity={0.2} />
                </g>
              </g>
            </svg>
            <span className="font-extrabold text-lg tracking-tight text-white select-none">
              ReSys
            </span>
            <span className="text-[9px] px-2 py-0.5 border border-white/20 bg-white/5 text-white/90 font-extrabold uppercase tracking-widest select-none rounded-none">SAAS</span>
          </div>
 
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-bold text-zinc-400">
            <a href="#verticals" className="hover:text-white hover:bg-white/5 py-1.5 px-3 rounded-none transition-all uppercase tracking-wider">Segmenty</a>
            <a href="#journey" className="hover:text-white hover:bg-white/5 py-1.5 px-3 rounded-none transition-all uppercase tracking-wider">Jak to funguje</a>
            <a href="#sandbox" className="hover:text-white hover:bg-white/5 py-1.5 px-3 rounded-none transition-all uppercase tracking-wider">Dema portálů</a>
            <a href="#pricing" className="hover:text-white hover:bg-white/5 py-1.5 px-3 rounded-none transition-all uppercase tracking-wider">Ceník</a>
            <a href="#developer" className="hover:text-white hover:bg-white/5 py-1.5 px-3 rounded-none transition-all uppercase tracking-wider">API & Vývojáři</a>
          </nav>
 
          {/* Actions & Theme */}
          <div className="flex items-center gap-3">
            <ThemeToggle className="p-2.5 rounded-none bg-zinc-900/30 text-zinc-400 hover:bg-zinc-800/40 hover:text-white border border-zinc-800/80 hover:border-zinc-700 hover:scale-105 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center" />
            <Link 
              href={hostConsoleUrl}
              className="border border-purple-500/50 bg-purple-950/30 hover:bg-purple-900/40 text-white text-[11px] font-bold py-2 px-4 rounded-none flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider"
            >
              <Terminal size={13} />
              HOST CONSOLE
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 select-none">
        
        {/* HERO SECTION */}
        <HeroSection hostConsoleUrl={hostConsoleUrl} />

        {/* COMPREHENSIVE PERFORMANCE METRICS ROW */}
        <section className="py-16 lg:py-20 bg-white dark:bg-[#07070C]/5 border-b border-slate-200/30 dark:border-[#1F1F35]/30">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 select-none">
            
            {/* Metric 1: OneID */}
            <ScrollReveal animation="fade-up" delay={100} duration={600}>
              <div className="border-t border-slate-200/60 dark:border-[#1F1F35]/40 pt-6 space-y-3 group hover:border-tenant-primary/60 transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-tenant-primary font-black tracking-widest uppercase">Jediný účet</span>
                </div>
                <div className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter leading-none">
                  OneID
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-600 dark:text-zinc-350 uppercase tracking-wider">
                    Jednotné přihlášení
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-550 leading-normal">
                    Hráči se přihlásí jedním účtem v libovolném sportovním areálu v síti, bez složitých registrací a hesel.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Metric 2: Zámky & světla */}
            <ScrollReveal animation="fade-up" delay={200} duration={600}>
              <div className="border-t border-slate-200/60 dark:border-[#1F1F35]/40 pt-6 space-y-3 group hover:border-tenant-primary/60 transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-tenant-primary font-black tracking-widest uppercase">Přímé spínání</span>
                </div>
                <div className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter leading-none">
                  Zámky & světla
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-600 dark:text-zinc-350 uppercase tracking-wider">
                    Bezobslužný vstup
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-555 leading-normal">
                    Automatické odemčení dveří a rozsvícení kurtu v čas rezervace. Po skončení hry se světla sama zhasnou.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Metric 3: B2B Kredit */}
            <ScrollReveal animation="fade-up" delay={300} duration={600}>
              <div className="border-t border-slate-200/60 dark:border-[#1F1F35]/40 pt-6 space-y-3 group hover:border-tenant-primary/60 transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-tenant-primary font-black tracking-widest uppercase">Pro firmy a kluby</span>
                </div>
                <div className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter leading-none">
                  Faktury & Kredity
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-600 dark:text-zinc-350 uppercase tracking-wider">
                    Smluvní pronájmy
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-555 leading-normal">
                    Rezervace pro školy, kluby a firmy (IČO/DIČ) s platbou na měsíční fakturu a hlídáním kreditních limitů.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Metric 4: Provize */}
            <ScrollReveal animation="fade-up" delay={400} duration={600}>
              <div className="border-t border-slate-200/60 dark:border-[#1F1F35]/40 pt-6 space-y-3 group hover:border-tenant-primary/60 transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-tenant-primary font-black tracking-widest uppercase">Platíte jen z rezervací</span>
                </div>
                <div className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter leading-none">
                  Provize z plateb
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-600 dark:text-zinc-350 uppercase tracking-wider">
                    Žádný drahý paušál
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-555 leading-normal">
                    Žádné drahé fixní poplatky. Systém si bere malou provizi (0–3 %) pouze z uskutečněných online plateb.
                  </p>
                </div>
              </div>
            </ScrollReveal>

          </div>
        </section>

        {/* VERTICAL SECTOR SEGMENTS */}
        <section id="verticals" className="py-20 lg:py-28 border-b border-slate-200/30 dark:border-[#1F1F35]/30 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <div className="pl-2.5 border-l-2 border-tenant-primary text-tenant-primary text-[10px] font-black uppercase tracking-widest select-none">
                Podporované segmenty
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Jedno unifikované jádro pro libovolné odvětví</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl mx-auto">
                Zapomeňte na instalaci několika jednoúčelových kalendářů. ReSys je modulární platforma, kterou lze flexibilně nakonfigurovat pro jakékoliv časové či kapacitní plány.
              </p>
            </div>
 
            <VerticalsShowcase tenants={tenants} isLocal={isLocal} />
          </div>
        </section>

        {/* INTERACTIVE BOOKING LIFE-CYCLE JOURNEY */}
        <section id="journey" className="py-20 lg:py-28 border-b border-slate-200/30 dark:border-[#1F1F35]/30 bg-slate-50/5 dark:bg-[#07070C]/5 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <div className="pl-2.5 border-l-2 border-tenant-primary text-tenant-primary text-[10px] font-black uppercase tracking-widest select-none">
                Samoobslužný Průchod
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Jak probíhá rezervace a fyzické odbavení</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl mx-auto">
                Vyzkoušejte si interaktivní proces od online zarezervování slotu přes ověření identity, online platbu, až po přiložení vygenerované vstupenky u simulovaného turniketu.
              </p>
            </div>

            <BookingJourneyVisualizer />
          </div>
        </section>

        {/* AI ASSISTANT SHOWCASE */}
        <AIShowcase />

        {/* DEMO PORTALS / SANDBOX SHOWCASE */}
        <section id="sandbox" className="py-20 lg:py-28 border-b border-slate-200/30 dark:border-[#1F1F35]/30 relative">
          <div className="max-w-7xl mx-auto px-6">
            
            {/* Header description */}
            <div className="text-center mb-16 space-y-4">
              <div className="pl-2.5 border-l-2 border-tenant-primary text-tenant-primary text-[10px] font-black uppercase tracking-widest select-none">
                Multi-tenant Core Engine
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mt-2">Více portálů, jedno univerzální jádro</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                ReSys funguje jako robustní platforma s izolovanými databázovými strukturami. Libovolné množství klientských portálů je napájeno identickým jádrem a jednotnou SSO identitou, ale liší se designem, cenami a pravidly slotů.
              </p>
            </div>

            {/* Glowing background behind cards */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-tenant-primary/5 to-indigo-500/5 blur-3xl opacity-50 -z-10 rounded-full scale-95" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tenants.map((t) => {
                  const portalUrl = isLocal ? `http://${t.id}.localhost:3000` : `/tenants/${t.id}`;
                  const attrs = (t.attributes as Record<string, string | undefined>) || {};
                  const tagline = attrs.tagline || (t.vertical === "SPORTS_GROUND" 
                    ? "Pronájem časových slotů na hřišti, dělení plochy na sektory a vazba na hardware turniketů."
                    : "Skupinové lekce, kapacitní kurzy a rezervace výukových laboratoří.");
                  
                  const verticalLabel = 
                    t.vertical === "SPORTS_GROUND" ? "Sportoviště / Časový grid" :
                    t.vertical === "EDUCATIONAL_COURSE" ? "Kapacitní model / Výuka" :
                    t.vertical === "CAPACITY_CLASS" ? "Kapacitní model / Lekce" : "Eventy / Ticketing";

                  return (
                    <div 
                      key={t.id} 
                      className="p-6 bg-white/45 dark:bg-[#07070C]/35 border border-slate-200/50 dark:border-[#1F1F35]/30 rounded-[32px] hover:border-tenant-primary/30 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden backdrop-blur-xl"
                    >
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-tenant-gradient opacity-10 group-hover:opacity-100 transition-opacity" />
                      <div className="space-y-4 text-left">
                        <div className="flex justify-between items-start gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-tenant-primary/10 text-tenant-primary border border-tenant-primary/15 uppercase tracking-wide">{verticalLabel}</span>
                          <span className="text-[9px] text-slate-400 dark:text-zinc-550 font-bold uppercase font-mono tracking-wider">Demo ID: {t.id}</span>
                        </div>
                        <h3 className="font-extrabold text-lg text-foreground group-hover:text-tenant-primary transition-colors">{t.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-450 leading-relaxed">
                          {tagline}
                        </p>
                      </div>
                      <div className="pt-6 mt-6 border-t border-slate-100/50 dark:border-[#1F1F35]/25 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-semibold">Stav: Aktivní</span>
                        <Link 
                          href={portalUrl}
                          className="inline-flex items-center gap-1.5 text-tenant-primary group-hover:text-tenant-primary-hover text-xs font-extrabold hover:translate-x-0.5 transition-all cursor-pointer"
                        >
                          Otevřít demo
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        {/* DEVELOPER API PLAYGROUND */}
        <section id="developer" className="py-20 lg:py-28 border-b border-slate-200/30 dark:border-[#1F1F35]/30 bg-slate-50/10 dark:bg-[#07070C]/5 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <div className="pl-2.5 border-l-2 border-tenant-primary text-tenant-primary text-[10px] font-black uppercase tracking-widest select-none">
                Developer Playground
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Jednoduchá a spolehlivá API integrace</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl mx-auto">
                ReSys poskytuje integrátorům a programátorům plný přístup ke všem rezervačním a hardware kontrolním endpointům přes plně transakční REST API.
              </p>
            </div>

            <DeveloperConsole />
          </div>
        </section>

        {/* SECURITY & ARCHITECTURE */}
        <section id="features" className="py-20 lg:py-28 max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-16 space-y-4">
            <div className="pl-2.5 border-l-2 border-tenant-primary text-tenant-primary text-[10px] font-black uppercase tracking-widest select-none">
              Infrastruktura & Zabezpečení
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Architektura postavená na důvěře a transakční bezpečnosti</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl mx-auto">
              ReSys spojuje federovanou identitu OneiD s pokročilým relačním modelováním na úrovni databáze k eliminaci race conditions a konfliktů.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Interactive-Looking Flow Diagram */}
            <ScrollReveal animation="fade-right" duration={1000} className="lg:col-span-6 relative p-6 bg-white/40 dark:bg-[#07070C]/35 border border-slate-200/50 dark:border-[#1F1F35]/30 rounded-3xl overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-tenant-primary/5 to-transparent blur-3xl opacity-30 -z-10" />
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono font-bold uppercase border-b border-slate-200/40 dark:border-white/5 pb-3 mb-6 select-none flex items-center justify-between">
                <span>Systémové toky & Integrace</span>
                <span className="h-2 w-2 rounded-full bg-tenant-primary animate-pulse" />
              </div>

              <div className="space-y-6 select-none font-sans">
                {/* Actor Nodes */}
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-white dark:bg-[#0E0E18] border border-slate-200/50 dark:border-[#1F1F35]/30 rounded-2xl flex items-center gap-2.5 w-[42%] hover:border-tenant-primary/30 transition-all shadow-sm">
                    <div className="h-7 w-7 rounded-lg bg-tenant-primary/10 text-tenant-primary flex items-center justify-center"><Users size={14} /></div>
                    <div className="text-left"><p className="text-[10px] font-black leading-none text-foreground">Uživatel</p><p className="text-[8px] text-slate-400">OneiD SSO</p></div>
                  </div>
                  <div className="w-[16%] flex items-center justify-center">
                    <svg className="w-full h-2 text-slate-300 dark:text-[#1F1F35]" viewBox="0 0 60 8" fill="none"><path d="M0 4H56M56 4L52 1M56 4L52 7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3"/></svg>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#0E0E18] border border-slate-200/50 dark:border-[#1F1F35]/30 rounded-2xl flex items-center gap-2.5 w-[42%] hover:border-tenant-primary/30 transition-all shadow-sm">
                    <div className="h-7 w-7 rounded-lg bg-tenant-primary/10 text-tenant-primary flex items-center justify-center"><Cpu size={14} /></div>
                    <div className="text-left"><p className="text-[10px] font-black leading-none text-foreground">IoT Čtečka</p><p className="text-[8px] text-slate-400">REST API Gate</p></div>
                  </div>
                </div>

                {/* Flow Arrow to Core */}
                <div className="flex justify-center py-1">
                  <div className="h-8 w-px bg-gradient-to-b from-slate-200 to-tenant-primary dark:from-[#1F1F35] dark:to-tenant-primary relative">
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-tenant-primary" />
                  </div>
                </div>

                {/* Core Node */}
                <div className="flex justify-center">
                  <div className="p-4 bg-tenant-primary/10 border border-tenant-primary/35 rounded-3xl w-full max-w-[280px] text-center shadow-lg relative group overflow-hidden">
                    <div className="absolute inset-0 bg-tenant-gradient opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
                    <div className="mx-auto h-8 w-8 rounded-xl bg-tenant-primary/20 text-tenant-primary flex items-center justify-center mb-2.5"><Layers size={16} className="animate-pulse" /></div>
                    <h4 className="text-xs font-black text-foreground">ReSys Core Engine</h4>
                    <p className="text-[8.5px] text-slate-450 dark:text-zinc-400 mt-1 leading-relaxed">Pravidla konfliktů • Hlídání kapacity • JWT Validátory</p>
                  </div>
                </div>

                {/* Flow Arrow to DB */}
                <div className="flex justify-center py-1">
                  <div className="h-8 w-px bg-gradient-to-b from-tenant-primary to-slate-200 dark:to-[#1F1F35] relative">
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-tenant-primary" />
                  </div>
                </div>

                {/* DB Node */}
                <div className="flex justify-center">
                  <div className="p-3.5 bg-white dark:bg-[#0E0E18] border border-slate-200/50 dark:border-[#1F1F35]/30 rounded-2xl w-[60%] flex items-center justify-center gap-3 hover:border-tenant-primary/30 transition-all shadow-sm">
                    <div className="h-8 w-8 rounded-xl bg-tenant-primary/10 text-tenant-primary flex items-center justify-center"><Database size={16} /></div>
                    <div className="text-left">
                      <p className="text-[10px] font-black leading-none text-foreground">PostgreSQL & Prisma</p>
                      <p className="text-[8px] text-slate-400">Transakční izolace (Locks)</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Right Column: Architectural Pillar Details */}
            <ScrollReveal animation="fade-left" duration={1000} delay={200} className="lg:col-span-6 space-y-4">
              
              {/* Pillar 1 */}
              <div className="flex gap-4 p-5 rounded-2xl border border-slate-200/40 dark:border-[#1F1F35]/20 hover:border-tenant-primary/20 dark:hover:border-tenant-primary/25 bg-white/40 dark:bg-[#07070C]/35 backdrop-blur-md shadow-xs transition-all relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-tenant-primary/10 group-hover:bg-tenant-primary transition-colors" />
                <div className="h-10 w-10 shrink-0 rounded-xl bg-tenant-primary/10 text-tenant-primary flex items-center justify-center relative z-10"><Lock size={18} /></div>
                <div className="space-y-1 text-left relative z-10">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">01 • OneiD SSO Federovaná identita</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Zjednodušte ověřování identity. Žádné lokální ukládání hesel, standardní JWT tokeny a bezproblémová integrace s federovaným SSO rozhraním.
                  </p>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="flex gap-4 p-5 rounded-2xl border border-slate-200/40 dark:border-[#1F1F35]/20 hover:border-tenant-primary/20 dark:hover:border-tenant-primary/25 bg-white/40 dark:bg-[#07070C]/35 backdrop-blur-md shadow-xs transition-all relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-tenant-primary/10 group-hover:bg-tenant-primary transition-colors" />
                <div className="h-10 w-10 shrink-0 rounded-xl bg-tenant-primary/10 text-tenant-primary flex items-center justify-center relative z-10"><Layers size={18} /></div>
                <div className="space-y-1 text-left relative z-10">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">02 • Multi-Resource Konfliktní Zámky</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-450 leading-relaxed">
                    Rezervační jádro automaticky blokuje překrývající se rezervace. Pronájem celé haly automaticky zneaktivní časové sloty pro dílčí badmintonové kurty.
                  </p>
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="flex gap-4 p-5 rounded-2xl border border-slate-200/40 dark:border-[#1F1F35]/20 hover:border-tenant-primary/20 dark:hover:border-tenant-primary/25 bg-white/40 dark:bg-[#07070C]/35 backdrop-blur-md shadow-xs transition-all relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-tenant-primary/10 group-hover:bg-tenant-primary transition-colors" />
                <div className="h-10 w-10 shrink-0 rounded-xl bg-tenant-primary/10 text-tenant-primary flex items-center justify-center relative z-10"><Database size={18} /></div>
                <div className="space-y-1 text-left relative z-10">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">03 • PostgreSQL Relační Transakce</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Eliminuje riziko dvojích rezervací (race conditions). Všechny rezervace a kontrolní logy zápisů do databáze probíhají v přísně izolované transakci.
                  </p>
                </div>
              </div>

            </ScrollReveal>
          </div>
        </section>

        {/* PRICING CALCULATOR SECTION */}
        <div id="pricing">
          <PricingCalculator />
        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/40 dark:border-[#1F1F35]/40 py-12 bg-white/20 dark:bg-[#07070C]/30 text-slate-500 dark:text-zinc-500 text-xs transition-colors backdrop-blur-md select-none">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-slate-200">
                Re<span className="text-tenant-primary">Sys</span>
              </span>
              <span className="text-[9px] border-l-2 border-tenant-primary text-tenant-primary pl-1.5 font-extrabold uppercase tracking-widest select-none">SaaS</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-relaxed">
              Unifikovaný rezervační engine a IoT přístupový hub. Vyvinuto pro sportovní, vzdělávací a společenské areály.
            </p>
          </div>

          <div>
            <span className="font-bold text-slate-700 dark:text-zinc-300 block mb-3 uppercase tracking-wider text-[10px]">Aktivní portály</span>
            <ul className="space-y-2 text-[11px]">
              {tenants.slice(0, 4).map((t) => {
                const portalUrl = isLocal ? `http://${t.id}.localhost:3000` : `/tenants/${t.id}`;
                return (
                  <li key={t.id}>
                    <Link href={portalUrl} className="hover:text-tenant-primary transition-colors">
                      {t.name}
                    </Link>
                  </li>
                );
              })}
              {tenants.length === 0 && (
                <li><span className="text-slate-400">Žádné aktivní portály</span></li>
              )}
            </ul>
          </div>

          <div>
            <span className="font-bold text-slate-700 dark:text-zinc-300 block mb-3 uppercase tracking-wider text-[10px]">Vývojáři</span>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#developer" className="hover:text-tenant-primary transition-colors">REST API Specifikace</a></li>
              <li><a href="#developer" className="hover:text-tenant-primary transition-colors">API Sandbox konzole</a></li>
              <li><Link href={hostConsoleUrl} className="hover:text-tenant-primary transition-colors">SaaS Host Konzole</Link></li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-slate-700 dark:text-zinc-300 block mb-3 uppercase tracking-wider text-[10px]">Eko-systém</span>
            <ul className="space-y-2 text-[11px]">
              <li><a href="https://oneid.cz" target="_blank" rel="noopener noreferrer" className="hover:text-tenant-primary transition-colors">OneiD SSO Poskytovatel</a></li>
              <li><span className="text-slate-400 dark:text-zinc-650">Verze platformy: v1.0.0</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-6 border-t border-slate-200/10 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} ReSys SaaS. Všechna práva vyhrazena. Navrženo pro integrátory.</p>
          <div className="flex gap-4 font-semibold text-[10px] tracking-wide select-none">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SaaS Engine v provozu
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
