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
import EcosystemMap from "@/components/EcosystemMap";

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
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] pointer-events-none select-none -z-10 bg-parallax-blob-1">
        <div className="w-full h-full rounded-full bg-tenant-primary/10 dark:bg-tenant-primary/5 blur-[100px]" />
      </div>
      <div className="absolute bottom-[15%] right-[-5%] w-[55%] h-[55%] pointer-events-none select-none -z-10 bg-parallax-blob-2">
        <div className="w-full h-full rounded-full bg-[#7000FF]/10 dark:bg-[#7000FF]/5 blur-[120px]" />
      </div>
      <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] pointer-events-none select-none -z-10 bg-parallax-blob-3">
        <div className="w-full h-full rounded-full bg-[#7000FF]/8 dark:bg-[#7000FF]/4 blur-[110px]" />
      </div>

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 select-none text-white header-scroll-animate">
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
                  <stop offset="100%" stopColor="#7000FF" />
                </linearGradient>
                <linearGradient id="slotGradientInline" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7000FF" />
                  <stop offset="100%" stopColor="#7000FF" />
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
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-bold text-zinc-300">
            <a href="#verticals" className="relative hover:text-white text-zinc-300 py-2 px-3 transition-all uppercase tracking-widest text-[10.5px] font-extrabold group">
              Segmenty
              <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-tenant-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200" />
            </a>
            <a href="#journey" className="relative hover:text-white text-zinc-300 py-2 px-3 transition-all uppercase tracking-widest text-[10.5px] font-extrabold group">
              Jak to funguje
              <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-tenant-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200" />
            </a>
            <a href="#ecosystem" className="relative hover:text-white text-zinc-300 py-2 px-3 transition-all uppercase tracking-widest text-[10.5px] font-extrabold group">
              Ekosystém
              <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-tenant-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200" />
            </a>
            <a href="#pricing" className="relative hover:text-white text-zinc-300 py-2 px-3 transition-all uppercase tracking-widest text-[10.5px] font-extrabold group">
              Ceník
              <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-tenant-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200" />
            </a>
          </nav>
 
          {/* Actions & Theme */}
          <div className="flex items-center gap-3">
            <ThemeToggle className="p-2.5 rounded-none bg-zinc-900/30 text-zinc-400 hover:bg-zinc-800/40 hover:text-white border border-zinc-800/80 hover:border-zinc-700 hover:scale-105 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center" />
            <Link 
              href={hostConsoleUrl}
              className="border border-tenant-primary/20 border-l-[3px] border-l-tenant-primary bg-tenant-primary/10 hover:bg-tenant-primary text-white text-[11px] font-bold py-2 px-4 rounded-none flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-widest"
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
              <div className="border-t border-slate-200/60 dark:border-[#1F1F35]/40 pt-6 space-y-3 group transition-colors duration-300 metric-card-hover">
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
              <div className="border-t border-slate-200/60 dark:border-[#1F1F35]/40 pt-6 space-y-3 group transition-colors duration-300 metric-card-hover">
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
              <div className="border-t border-slate-200/60 dark:border-[#1F1F35]/40 pt-6 space-y-3 group transition-colors duration-300 metric-card-hover">
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
              <div className="border-t border-slate-200/60 dark:border-[#1F1F35]/40 pt-6 space-y-3 group transition-colors duration-300 metric-card-hover">
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
              <div className="text-[10px] font-black text-tenant-primary uppercase tracking-widest select-none flex items-center justify-center gap-1.5">
                <span className="text-tenant-primary font-bold">|</span> Podporované segmenty
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
              <div className="text-[10px] font-black text-tenant-primary uppercase tracking-widest select-none flex items-center justify-center gap-1.5">
                <span className="text-tenant-primary font-bold">|</span> Samoobslužný Průchod
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

        {/* DEEP VISION ECOSYSTEM INTEGRATION */}
        <section id="ecosystem" className="py-20 lg:py-28 border-b border-slate-200/30 dark:border-[#1F1F35]/30 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <div className="text-[10px] font-black text-tenant-primary uppercase tracking-widest select-none flex items-center justify-center gap-1.5">
                <span className="text-tenant-primary font-bold">|</span> Ekosystém DEEP VISION
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Škálovatelná architektura pro každou velikost projektu</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                ReSys je integrální součástí rodiny DEEP VISION. Poskytuje ideální automatizační rozhraní a transakční rezervační jádro pro menší sportovní a volnočasové areály, s možností plynulého růstu a napojení na robustní platformy ENIGOO a relatoo.
              </p>
            </div>

            <EcosystemMap />
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
            <span className="font-bold text-slate-700 dark:text-zinc-300 block mb-3 uppercase tracking-wider text-[10px]">Integrace</span>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#ecosystem" className="hover:text-tenant-primary transition-colors">DEEP VISION Platforma</a></li>
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
              SaaS Engine v provozu
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
