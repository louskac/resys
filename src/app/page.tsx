import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { headers } from "next/headers";
import IoTSimulator from "@/components/IoTSimulator";
import ScrollReveal from "@/components/ScrollReveal";
import { 
  ArrowRight, Sparkles, ShieldCheck, Cpu, Database, 
  Code, ChevronRight, Calendar, Users, CheckCircle2, 
  Layers, Activity, Building, Smartphone, Globe, 
  Lock, Terminal, ArrowUpRight, Check, Server
} from "lucide-react";

import prisma from "@/lib/prisma";
import { ensureDefaultData } from "@/lib/dbInit";
import PricingCalculator from "@/components/PricingCalculator";
import AIShowcase from "@/components/AIShowcase";

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
      <header className="border-b border-slate-200/50 dark:border-[#1F1F35]/30 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl sticky top-0 z-50 transition-all shadow-md shadow-slate-100/5 dark:shadow-black/5 select-none">
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
            <span className="font-extrabold text-lg tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-[#7000FF] to-[#3B82F6]">
              ReSys
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary font-bold uppercase tracking-widest">SaaS</span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-400">
            <a href="#verticals" className="hover:text-tenant-primary hover:bg-slate-100/50 dark:hover:bg-[#131322]/40 py-1.5 px-3 rounded-xl transition-all">Segmenty</a>
            <a href="#sandbox" className="hover:text-tenant-primary hover:bg-slate-100/50 dark:hover:bg-[#131322]/40 py-1.5 px-3 rounded-xl transition-all">Ukázky portálů</a>
            <a href="#pricing" className="hover:text-tenant-primary hover:bg-slate-100/50 dark:hover:bg-[#131322]/40 py-1.5 px-3 rounded-xl transition-all">Ceník</a>
            <a href="#iot" className="hover:text-tenant-primary hover:bg-slate-100/50 dark:hover:bg-[#131322]/40 py-1.5 px-3 rounded-xl transition-all">IoT & Přístup</a>
            <a href="#features" className="hover:text-tenant-primary hover:bg-slate-100/50 dark:hover:bg-[#131322]/40 py-1.5 px-3 rounded-xl transition-all">Integrace</a>
          </nav>

          {/* Actions & Theme */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link 
              href={hostConsoleUrl}
              className="bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-[11px] font-bold py-2 px-4 rounded-xl shadow-md shadow-tenant-primary/15 flex items-center gap-1.5 cursor-pointer"
            >
              <Server size={13} />
              Host Console
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 select-none">
        
        <section className="relative py-20 lg:py-28 max-w-7xl mx-auto px-6 border-b border-slate-200/30 dark:border-[#1F1F35]/30">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Value Pitch */}
            <ScrollReveal animation="fade-up" duration={1000} delay={100} className="lg:col-span-5 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary text-xs font-bold shadow-sm select-none">
                <Sparkles size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
                Universal Booking Core
              </div>
              
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                Jediný engine pro <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-tenant-primary to-cyan-500">
                  libovolné rezervace.
                </span>
              </h1>
              
              <p className="text-base text-slate-500 dark:text-zinc-400 leading-relaxed max-w-lg">
                ReSys je moderní multi-tenant rezervační systém navržený pro sportoviště, vzdělávací areály a kapacitní provozy. Automatizuje plánování kapacit, online platby a fyzický přístup přes chytré IoT turnikety s ověřením OneiD SSO.
              </p>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <a 
                  href="#sandbox"
                  className="bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-xs py-3 px-6 rounded-xl font-bold shadow-md shadow-tenant-primary/15 flex items-center gap-2 cursor-pointer"
                >
                  Prohlédnout dema portálů
                  <ArrowRight size={14} />
                </a>
                <a 
                  href="#iot"
                  className="px-5 py-3 text-xs font-bold rounded-xl bg-white/60 hover:bg-slate-100/80 dark:bg-[#131322]/40 dark:hover:bg-[#1C1C30]/50 border border-slate-200/50 dark:border-[#1F1F35] text-slate-700 dark:text-zinc-300 hover:scale-102 active:scale-98 transition-all cursor-pointer shadow-sm"
                >
                  IoT specifikace
                </a>
              </div>

              {/* Badges footer */}
              <div className="pt-8 border-t border-slate-200/40 dark:border-[#1F1F35]/40 flex items-center gap-4 text-xs text-slate-400 dark:text-zinc-550 select-none">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-tenant-primary/80" />
                  OneiD SSO zabezpečení
                </div>
                <div className="h-4 w-px bg-slate-200 dark:bg-[#1F1F35]" />
                <div className="flex items-center gap-1.5">
                  <Cpu size={16} className="text-tenant-primary/80" />
                  IoT API integrace
                </div>
              </div>
            </ScrollReveal>

            {/* Right Column: Hero Dashboard Image Mockup */}
            <div className="lg:col-span-7 relative">
              <ScrollReveal animation="fade-up" duration={1000} delay={300} className="relative">
                {/* Colored light glow background */}
                <div className="absolute inset-0 bg-gradient-to-tr from-tenant-primary/15 to-cyan-500/15 blur-3xl opacity-50 -z-10 rounded-full scale-95" />
                
                <div className="p-2.5 bg-white/30 dark:bg-black/25 backdrop-blur-md border border-white/20 dark:border-zinc-800/60 rounded-[32px] shadow-2xl shadow-tenant-primary/5 relative group hover:border-tenant-primary/25 transition-colors duration-300">
                  {/* Mock Window Controls Header */}
                  <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/10 dark:border-zinc-800/40 bg-white/10 dark:bg-black/10 rounded-t-[22px] select-none">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] opacity-80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] opacity-80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] opacity-80" />
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono font-semibold ml-2 select-none tracking-wider uppercase">resys-admin-console.png</span>
                  </div>
                  
                  {/* Actual image */}
                  <div className="rounded-b-[22px] overflow-hidden bg-black/40">
                    <img 
                      src="/resys-hero-dashboard.png" 
                      alt="ReSys SaaS Dashboard Admin Console" 
                      className="w-full h-auto object-cover select-none group-hover:scale-[1.01] transition-transform duration-500"
                    />
                  </div>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </section>

        {/* SAAS METRIC BAR */}
        <section className="py-10 bg-slate-50/20 dark:bg-[#07070C]/10 border-b border-slate-200/30 dark:border-[#1F1F35]/30">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 select-none">
            <ScrollReveal animation="fade-up" delay={100} duration={600} className="h-full">
              <div className="p-5 bg-white/40 dark:bg-[#07070C]/25 backdrop-blur-md border border-slate-200/40 dark:border-[#1F1F35]/20 rounded-2xl shadow-xs text-center md:text-left space-y-1 hover:border-tenant-primary/20 transition-all h-full relative group overflow-hidden">
                <div className="absolute top-0 right-0 h-10 w-10 bg-tenant-primary/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-tenant-primary to-indigo-500 block">99.99%</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Garantovaný Uptime</span>
                <span className="text-[9.5px] text-slate-400 dark:text-zinc-500 block leading-tight">Smluvní garance SLA stability portálu.</span>
              </div>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={200} duration={600} className="h-full">
              <div className="p-5 bg-white/40 dark:bg-[#07070C]/25 backdrop-blur-md border border-slate-200/40 dark:border-[#1F1F35]/20 rounded-2xl shadow-xs text-center md:text-left space-y-1 hover:border-tenant-primary/20 transition-all h-full relative group overflow-hidden">
                <div className="absolute top-0 right-0 h-10 w-10 bg-tenant-primary/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-tenant-primary to-indigo-500 block">&lt;12ms</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Odezva API</span>
                <span className="text-[9.5px] text-slate-400 dark:text-zinc-500 block leading-tight">Ultrarychlé vyhodnocení turniketových relay.</span>
              </div>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={300} duration={600} className="h-full">
              <div className="p-5 bg-white/40 dark:bg-[#07070C]/25 backdrop-blur-md border border-slate-200/40 dark:border-[#1F1F35]/20 rounded-2xl shadow-xs text-center md:text-left space-y-1 hover:border-tenant-primary/20 transition-all h-full relative group overflow-hidden">
                <div className="absolute top-0 right-0 h-10 w-10 bg-tenant-primary/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-tenant-primary to-indigo-500 block">150k+</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Rezervací/měsíc</span>
                <span className="text-[9.5px] text-slate-400 dark:text-zinc-500 block leading-tight">Navrženo pro masivní, špičkovou zátěž.</span>
              </div>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={400} duration={600} className="h-full">
              <div className="p-5 bg-white/40 dark:bg-[#07070C]/25 backdrop-blur-md border border-slate-200/40 dark:border-[#1F1F35]/20 rounded-2xl shadow-xs text-center md:text-left space-y-1 hover:border-tenant-primary/20 transition-all h-full relative group overflow-hidden">
                <div className="absolute top-0 right-0 h-10 w-10 bg-tenant-primary/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-tenant-primary to-indigo-500 block">100%</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Turniketové IoT</span>
                <span className="text-[9.5px] text-slate-400 dark:text-zinc-500 block leading-tight">Ověřená kompatibilita s RFID/QR čtečkami.</span>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* VERTICAL SECTOR SEGMENTS */}
        <section id="verticals" className="py-20 lg:py-28 border-b border-slate-200/30 dark:border-[#1F1F35]/30 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary text-[10px] font-black uppercase tracking-widest shadow-xs select-none">
                Podporované segmenty
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Pokrýváme všechny typy rezervací z jednoho místa</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl mx-auto">
                Zapomeňte na provozování několika jednoúčelových kalendářů. ReSys je modulární jádro navržený tak, aby se přizpůsobilo libovolnému odvětví.
              </p>
            </div>
 
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Sports */}
              <ScrollReveal animation="fade-up" delay={100} duration={800} className="h-full">
                <div className="p-6 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35]/30 rounded-3xl hover:border-tenant-primary/30 hover:shadow-md transition-all duration-300 space-y-4 group h-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-tenant-gradient opacity-10 group-hover:opacity-100 transition-opacity" />
                  <div className="h-10 w-10 rounded-xl bg-tenant-primary/10 text-tenant-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Activity size={18} />
                  </div>
                  <h3 className="font-extrabold text-base text-foreground">Sportoviště & Haly</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Časové sítě pro kurty a hřiště, dělení ploch na sektory, dynamické ceníky za osvětlení a přímé napojení na turnikety pro vstup bez obsluhy.
                  </p>
                </div>
              </ScrollReveal>
 
              {/* Card 2: Education */}
              <ScrollReveal animation="fade-up" delay={200} duration={800} className="h-full">
                <div className="p-6 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35]/30 rounded-3xl hover:border-tenant-primary/30 hover:shadow-md transition-all duration-300 space-y-4 group h-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-tenant-gradient opacity-10 group-hover:opacity-100 transition-opacity" />
                  <div className="h-10 w-10 rounded-xl bg-tenant-primary/10 text-tenant-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Building size={18} />
                  </div>
                  <h3 className="font-extrabold text-base text-foreground">Vzdělávání & Laboratoře</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Rezervace drahých přístrojů a chemických laboratoří, kapacitní limity pro kurzy, schvalovací procesy správcem a přihlášení studentů přes SSO.
                  </p>
                </div>
              </ScrollReveal>
 
              {/* Card 3: Wellness */}
              <ScrollReveal animation="fade-up" delay={300} duration={800} className="h-full">
                <div className="p-6 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35]/30 rounded-3xl hover:border-tenant-primary/30 hover:shadow-md transition-all duration-300 space-y-4 group h-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-tenant-gradient opacity-10 group-hover:opacity-100 transition-opacity" />
                  <div className="h-10 w-10 rounded-xl bg-tenant-primary/10 text-tenant-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Smartphone size={18} />
                  </div>
                  <h3 className="font-extrabold text-base text-foreground">Wellness & Fitness</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Správa kapacit saunových zón a masáží. Integrace s platebními bránami, permanentky pro stálé zákazníky a automatické hlídání skříněk.
                  </p>
                </div>
              </ScrollReveal>
 
              {/* Card 4: Event Ticketing */}
              <ScrollReveal animation="fade-up" delay={400} duration={800} className="h-full">
                <div className="p-6 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35]/30 rounded-3xl hover:border-tenant-primary/30 hover:shadow-md transition-all duration-300 space-y-4 group h-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-tenant-gradient opacity-10 group-hover:opacity-100 transition-opacity" />
                  <div className="h-10 w-10 rounded-xl bg-tenant-primary/10 text-tenant-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Globe size={18} />
                  </div>
                  <h3 className="font-extrabold text-base text-foreground">Ticketing & Eventy</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Jednorázové akce s prodejem vstupenek. Rychlé generování PDF lístků s unikátním QR kódem pro snadné odbavení u vstupní brány.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* PRICING CALCULATOR SECTION */}
        <div id="pricing">
          <PricingCalculator />
        </div>

        {/* AI ASSISTANT SHOWCASE */}
        <AIShowcase />

        {/* DEMO PORTALS / SANDBOX SHOWCASE */}
        <section id="sandbox" className="py-20 lg:py-28 border-b border-slate-200/30 dark:border-[#1F1F35]/30 relative">
          <div className="max-w-7xl mx-auto px-6">
            
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Vertical cards and portal switches */}
              <ScrollReveal animation="fade-right" duration={1000} className="lg:col-span-7 space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary text-[10px] font-black uppercase tracking-widest shadow-xs select-none">
                    Unifikovaný plánovací engine
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mt-2">Více portálů, jedno univerzální jádro</h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                    ReSys funguje jako robustní multi-tenant platforma. Libovolné množství klientských portálů je napájeno naprosto shodnými datovými strukturami a přihlašovacím systémem OneiD, ale liší se vzhledem, ceníky a kapacitním typem.
                  </p>
                </div>
 
                <div className="grid sm:grid-cols-2 gap-6">
                  {tenants.map((t) => {
                    const portalUrl = isLocal ? `http://${t.id}.localhost:3000` : `/tenants/${t.id}`;
                    const attrs = (t.attributes as any) || {};
                    const tagline = attrs.tagline || (t.vertical === "SPORTS_GROUND" 
                      ? "Pronájem časových slotů na hřišti, dělení plochy na sektory a vazba na hardware turniketů."
                      : "Skupinové lekce, kapacitní kurzy a rezervace výukových laboratoří.");
                    
                    const verticalLabel = 
                      t.vertical === "SPORTS_GROUND" ? "Sportoviště / Časový grid" :
                      t.vertical === "EDUCATIONAL_COURSE" ? "Kapacitní model / Výuka" :
                      t.vertical === "CAPACITY_CLASS" ? "Kapacitní model / Lekce" : "Eventy / Ticketing";
 
                    return (
                      <div key={t.id} className="p-6 bg-white/45 dark:bg-[#07070C]/35 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35]/30 rounded-3xl shadow-xs hover:border-tenant-primary/30 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-tenant-primary/10 group-hover:bg-tenant-primary transition-colors" />
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-tenant-primary/10 text-tenant-primary border-tenant-primary/20 uppercase tracking-wide">{verticalLabel}</span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase font-mono">ID: {t.id}</span>
                          </div>
                          <h3 className="font-extrabold text-lg text-foreground group-hover:text-tenant-primary transition-colors">{t.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                            {tagline}
                          </p>
                        </div>
                        <div className="pt-6 mt-6 border-t border-slate-100/50 dark:border-[#1F1F35]/20">
                          <Link 
                            href={portalUrl}
                            className="w-full text-center py-2 px-4 rounded-xl text-xs font-bold bg-tenant-primary/10 hover:bg-tenant-gradient hover:text-white text-tenant-primary transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                          >
                            Otevřít portál {t.name}
                            <ArrowUpRight size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollReveal>

              {/* Right Column: User Booking App Mockup */}
              <div className="lg:col-span-5 relative flex justify-center">
                <ScrollReveal animation="fade-left" duration={1000} delay={200} className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-tenant-primary/10 to-indigo-500/15 blur-3xl opacity-50 -z-10 rounded-full scale-95" />
                  
                  <div className="p-2.5 bg-white/30 dark:bg-black/25 backdrop-blur-md border border-white/20 dark:border-zinc-800/60 rounded-[44px] shadow-2xl shadow-tenant-primary/5 max-w-[280px] sm:max-w-[320px] relative group hover:border-tenant-primary/25 transition-colors duration-300">
                    <div className="rounded-[36px] overflow-hidden bg-black/40 border border-black/80">
                      <img 
                        src="/resys-booking-interface.png" 
                        alt="ReSys SaaS Mobile Booking Timeline Schedule" 
                        className="w-full h-auto object-cover select-none group-hover:scale-[1.01] transition-transform duration-500"
                      />
                    </div>
                  </div>
                </ScrollReveal>
              </div>

            </div>

          </div>
        </section>

        {/* IoT ACCESS CONTROL & TURNSTILE APIs */}
        <section id="iot" className="py-20 lg:py-28 bg-slate-50/20 dark:bg-[#08080F]/30 border-b border-slate-200/30 dark:border-[#1F1F35]/30">
          <div className="max-w-7xl mx-auto px-6">
            
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Reception scan image mockup */}
              <ScrollReveal animation="fade-right" duration={1000} className="lg:col-span-6 relative">
                <div className="absolute inset-0 bg-gradient-to-bl from-tenant-primary/15 to-purple-500/15 blur-3xl opacity-50 -z-10 rounded-full scale-95" />
                
                <div className="p-2.5 bg-white/30 dark:bg-black/25 backdrop-blur-md border border-white/20 dark:border-zinc-800/60 rounded-[32px] shadow-2xl shadow-tenant-primary/5 relative group hover:border-tenant-primary/25 transition-colors duration-300">
                  {/* Mock Window Controls Header */}
                  <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/10 dark:border-zinc-800/40 bg-white/10 dark:bg-black/10 rounded-t-[22px] select-none">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono font-semibold ml-2 select-none tracking-wider uppercase">resys-iot-scanner-gate.png</span>
                  </div>
                  
                  <div className="rounded-b-[22px] overflow-hidden bg-black/40">
                    <img 
                      src="/resys-iot-checkin.png" 
                      alt="ReSys SaaS turnstile scanner checkin gateway" 
                      className="w-full h-auto object-cover select-none group-hover:scale-[1.01] transition-transform duration-500"
                    />
                  </div>
                </div>
              </ScrollReveal>

              {/* Right Column: Code block & spec sheet */}
              <ScrollReveal animation="fade-left" duration={1000} delay={200} className="lg:col-span-6 space-y-6 text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary text-[10px] font-black uppercase tracking-widest shadow-xs select-none">
                  Hardware Integration
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">Zabezpečený přístup. Bez lidské obsluhy.</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Systém ReSys obsahuje vestavěné rozhraní pro fyzické čtečky a brány. Turnikety u vchodů nebo recepční tablety ověřují platnost kódů ze smartphonu v reálném čase.
                </p>

                <IoTSimulator />

                <div className="grid sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-600 dark:text-zinc-350 select-none pt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-md bg-tenant-primary/15 flex items-center justify-center text-tenant-primary">
                      <Check size={12} />
                    </div>
                    Ověření časového okna rezervace
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-md bg-tenant-primary/15 flex items-center justify-center text-tenant-primary">
                      <Check size={12} />
                    </div>
                    Ochrana proti duplicitním vstupům
                  </div>
                </div>
              </ScrollReveal>

            </div>

          </div>
        </section>

        {/* SECURITY & ARCHITECTURE */}
        <section id="features" className="py-20 lg:py-28 max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary text-[10px] font-black uppercase tracking-widest shadow-xs select-none">
              Infrastruktura & Zabezpečení
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Architektura postavená na důvěře a stabilitě</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl mx-auto">
              ReSys spojuje špičkovou bezpečnost OneiD identity s robustním relačním plánováním na úrovni databáze.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: SVG Interactive-Looking Flow Diagram */}
            <ScrollReveal animation="fade-right" duration={1000} className="lg:col-span-6 relative p-6 bg-white/40 dark:bg-[#07070C]/35 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35]/30 rounded-3xl overflow-hidden shadow-xl">
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
                    Zjednodušte ověřování partnerů. Žádné lokální ukládání hesel, standardní JWT tokeny a plná integrace se státní či partnerskou identitou.
                  </p>
                </div>
              </div>
 
              {/* Pillar 2 */}
              <div className="flex gap-4 p-5 rounded-2xl border border-slate-200/40 dark:border-[#1F1F35]/20 hover:border-tenant-primary/20 dark:hover:border-tenant-primary/25 bg-white/40 dark:bg-[#07070C]/35 backdrop-blur-md shadow-xs transition-all relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-tenant-primary/10 group-hover:bg-tenant-primary transition-colors" />
                <div className="h-10 w-10 shrink-0 rounded-xl bg-tenant-primary/10 text-tenant-primary flex items-center justify-center relative z-10"><Layers size={18} /></div>
                <div className="space-y-1 text-left relative z-10">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">02 • Multi-Resource Konfliktní Zámky</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Systém automaticky blokuje překrývající se rezervace. Pronájem celé haly automaticky zneaktivní sloty pro dílčí badmintonové kurty.
                  </p>
                </div>
              </div>
 
              {/* Pillar 3 */}
              <div className="flex gap-4 p-5 rounded-2xl border border-slate-200/40 dark:border-[#1F1F35]/20 hover:border-tenant-primary/20 dark:hover:border-tenant-primary/25 bg-white/40 dark:bg-[#07070C]/35 backdrop-blur-md shadow-xs transition-all relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-tenant-primary/10 group-hover:bg-tenant-primary transition-colors" />
                <div className="h-10 w-10 shrink-0 rounded-xl bg-tenant-primary/10 text-tenant-primary flex items-center justify-center relative z-10"><Database size={18} /></div>
                <div className="space-y-1 text-left relative z-10">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">03 • PostgreSQL Transakce</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Eliminuje riziko dvojí rezervace (race conditions). Všechny rezervace a zápisy do tabulky logů jsou spouštěny v izolované databázové transakci.
                  </p>
                </div>
              </div>
 
            </ScrollReveal>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/40 dark:border-[#1F1F35]/40 py-12 bg-white/20 dark:bg-[#07070C]/30 text-slate-500 dark:text-zinc-500 text-xs transition-colors backdrop-blur-md select-none">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-slate-200">
                Re<span className="text-tenant-primary">Sys</span>
              </span>
              <span className="text-[9px] bg-tenant-primary/10 border border-tenant-primary/25 text-tenant-primary px-2 py-0.5 rounded font-bold uppercase select-none">SaaS</span>
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
              <li><a href="#iot" className="hover:text-tenant-primary transition-colors">Specifikace IoT Čteček</a></li>
              <li><a href="#iot" className="hover:text-tenant-primary transition-colors">REST API Dokumentace</a></li>
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
