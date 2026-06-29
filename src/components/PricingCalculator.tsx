"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, Check, Cpu, Database, Calculator, 
  ArrowRight, ShieldCheck, Zap, Activity, Building, 
  Smartphone, ChevronRight, X, Play, Settings, RefreshCw,
  Coins, Landmark, Timer, ClipboardList, QrCode
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

interface Plan {
  id: string;
  name: string;
  subname: string;
  priceMonthly: number;
  priceYearly: number;
  maxResources: number;
  maxDevices: number;
  features: string[];
  color: string;
  borderColor: string;
  badge?: string;
}

export default function PricingCalculator() {
  const [isYearly, setIsYearly] = useState(false);
  const [resources, setResources] = useState(2);
  const [devices, setDevices] = useState(1);
  const [avgPrice, setAvgPrice] = useState(400); // Czech crowns per hour
  const [activePlanId, setActivePlanId] = useState("FREE_TRIAL");
  
  // Sandbox Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [vertical, setVertical] = useState("SPORTS_GROUND");
  const [setupStep, setSetupStep] = useState(0); // 0: Form, 1: Progress, 2: Success
  const [progressText, setProgressText] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const plans: Plan[] = [
    {
      id: "FREE_TRIAL",
      name: "Free Trial",
      subname: "Základní testovací verze",
      priceMonthly: 0,
      priceYearly: 0,
      maxResources: 2,
      maxDevices: 1,
      features: [
        "Max 2 plochy / zdroje",
        "Max 1 automatický vstup",
        "Základní pravidla",
        "Bez partnerů a slev"
      ],
      color: "from-slate-400 to-slate-500",
      borderColor: "border-slate-200/60 dark:border-[#2A2A40]/40"
    },
    {
      id: "STARTER",
      name: "Starter",
      subname: "Pro menší a začínající kluby",
      priceMonthly: 490,
      priceYearly: 390,
      maxResources: 5,
      maxDevices: 3,
      features: [
        "Max 5 ploch / zdroje",
        "Max 3 automatické vstupy",
        "Pokročilá pravidla",
        "Lidé, slevy a faktury"
      ],
      color: "from-tenant-primary to-tenant-primary",
      borderColor: "border-slate-200/60 dark:border-[#2A2A40]/40"
    },
    {
      id: "PRO",
      name: "Pro",
      subname: "Pro aktivní sportovní centra",
      priceMonthly: 990,
      priceYearly: 790,
      maxResources: 15,
      maxDevices: 10,
      features: [
        "Max 15 ploch / zdrojů",
        "Max 10 automatických vstupů",
        "Prioritní podpora",
        "Právní logy a audity"
      ],
      color: "from-tenant-primary to-tenant-primary",
      borderColor: "border-slate-200/60 dark:border-[#2A2A40]/40",
      badge: "Nejpopulárnější"
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise",
      subname: "Neomezená firemní řešení",
      priceMonthly: 4990,
      priceYearly: 3990,
      maxResources: 99,
      maxDevices: 99,
      features: [
        "Max 99 ploch / zdrojů",
        "Max 99 automatických vstupů",
        "SLA & telefonní linka",
        "Správce účtu"
      ],
      color: "from-tenant-primary to-tenant-primary",
      borderColor: "border-slate-200/60 dark:border-[#2A2A40]/40"
    }
  ];

  // Dynamically determine the recommended plan based on slider adjustments
  useEffect(() => {
    let recommended = "FREE_TRIAL";
    if (resources > 15 || devices > 10) {
      recommended = "ENTERPRISE";
    } else if (resources > 5 || devices > 3) {
      recommended = "PRO";
    } else if (resources > 2 || devices > 1) {
      recommended = "STARTER";
    }
    setActivePlanId(recommended);
  }, [resources, devices]);

  // Handle autogenerating a clean Subdomain ID from name
  useEffect(() => {
    const cleanId = tenantName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]+/g, "-")      // replace non-alphanumeric characters with hyphens
      .replace(/^-+|-+$/g, "");        // trim leading/trailing hyphens
    setTenantId(cleanId);
  }, [tenantName]);

  const handleOpenSetup = (planName: string) => {
    setSelectedPlanName(planName);
    setTenantName("");
    setSetupStep(0);
    setCompletedSteps([]);
    setModalOpen(true);
  };

  const startSimulation = () => {
    if (!tenantName || !tenantId) return;
    
    setSetupStep(1);
    const steps = [
      "Vytvářím izolovanou databázovou strukturu...",
      "Konfiguruji OneiD SSO autentizaci...",
      "Nastavuji B2B fakturační pravidla pro " + selectedPlanName + "...",
      "Inicializuji výchozí zdroje a kalendář...",
      "Spouštím chytrý přístupový hub..."
    ];

    let current = 0;
    setProgressText(steps[0]);

    const interval = setInterval(() => {
      setCompletedSteps(prev => [...prev, steps[current]]);
      current += 1;
      
      if (current < steps.length) {
        setProgressText(steps[current]);
      } else {
        clearInterval(interval);
        setSetupStep(2);
      }
    }, 1200);
  };

  // --- ROI / Value Savings Calculation ---
  const activePlanPrice = isYearly 
    ? (plans.find(p => p.id === activePlanId)?.priceYearly || 0) 
    : (plans.find(p => p.id === activePlanId)?.priceMonthly || 0);

  // 1 resource = average 20 hours booked per week
  const monthlyBookingsRev = resources * 20 * 4.3 * avgPrice;
  // 1 automated door/turnstile = saves 4 hours of receptionist manual log-ins/wages per day
  const monthlyLaborHoursSaved = devices * 4 * 30;
  const monthlyLaborCostSaved = monthlyLaborHoursSaved * 200; // 200 Kč/hr minimum wage cost
  const totalFinancialBenefits = monthlyBookingsRev + monthlyLaborCostSaved;
  const netProfitBenefit = Math.max(0, totalFinancialBenefits - activePlanPrice);
  const roiRatio = activePlanPrice === 0 
    ? 99 // infinite/high representation
    : Math.round(totalFinancialBenefits / activePlanPrice);

  return (
    <section className="py-20 lg:py-28 max-w-7xl mx-auto px-6 border-b border-slate-200/30 dark:border-[#1F1F35]/30">
      
      {/* Section Header */}
      <div className="text-center mb-16 space-y-4">
        <div className="text-[10px] font-black text-tenant-primary uppercase tracking-widest select-none flex items-center justify-center gap-1.5">
          <span className="text-tenant-primary font-bold">|</span> Interaktivní kalkulátor
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
          Spočítejte si plán přesně pro vaše sportoviště či firmu
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Upravte parametry areálu a automatických vstupů. Systém doporučí vhodný plán a vyhodnotí finanční návratnost.
        </p>
      </div>

      {/* TOP: Premium Plan Info Header (Matches Admin Console Gradient styling) */}
      <div className="bg-gradient-to-r from-tenant-primary/10 to-transparent dark:from-tenant-primary/20 dark:to-transparent border-l-4 border-tenant-primary rounded-none p-6 shadow-sm flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-8 mb-10 max-w-7xl mx-auto">
        
        {/* Left Side: Plan Info display */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 select-none">
            <span className="text-[10px] font-bold text-tenant-primary uppercase tracking-widest bg-tenant-primary/10 dark:bg-tenant-primary/20 px-2.5 py-1 rounded-none">
              Předplatné systému
            </span>
            <span className="bg-tenant-primary/10 text-tenant-primary border border-tenant-primary/20 text-[9px] font-bold px-2 py-0.5 rounded-none select-none uppercase tracking-wider animate-pulse">
              Simulátor
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 select-none">
            Doporučený tarif: <span className="text-tenant-primary underline decoration-2 decoration-tenant-primary/45 font-black uppercase">{plans.find(p => p.id === activePlanId)?.name}</span>
          </h3>
          <p className="text-xs text-slate-550 dark:text-zinc-400 select-none">
            Na základě konfigurace: <strong className="text-foreground">{resources} ploch</strong> a <strong className="text-foreground">{devices} automatických vstupů</strong>.
          </p>
        </div>

        {/* Right Side: Slim Configurators inside the header */}
        <div className="bg-white/45 dark:bg-black/25 border border-slate-200/50 dark:border-[#2A2A40]/30 rounded-none p-4 flex-1 max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          
          {/* Billing Cycle */}
          <div className="space-y-1.5 select-none">
            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Účtování</span>
            <div className="flex bg-slate-100 dark:bg-black/40 p-0.5 rounded-none border border-slate-200/20 dark:border-white/5">
              <button 
                onClick={() => setIsYearly(false)}
                className={`flex-1 text-center py-1 text-[10.5px] font-bold rounded transition-all cursor-pointer ${
                  !isYearly 
                    ? "bg-white dark:bg-[#131322] text-[#7000FF] shadow-xs" 
                    : "text-slate-500"
                }`}
              >
                Měsíčně
              </button>
              <button 
                onClick={() => setIsYearly(true)}
                className={`flex-1 text-center py-1 text-[10.5px] font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  isYearly 
                    ? "bg-white dark:bg-[#131322] text-[#7000FF] shadow-xs" 
                    : "text-slate-500"
                }`}
              >
                Ročně
              </button>
            </div>
          </div>

          {/* Resources Input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 select-none">
              <span className="flex items-center gap-0.5"><ClipboardList size={10} className="text-slate-450" /> Plochy</span>
              <span className="font-mono text-slate-800 dark:text-white">{resources} / 25</span>
            </div>
            <input 
              type="range"
              min="1"
              max="25"
              value={resources}
              onChange={(e) => setResources(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200/80 dark:bg-zinc-800 rounded-none appearance-none cursor-pointer accent-tenant-primary focus:outline-none"
            />
          </div>

          {/* Devices Input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 select-none">
              <span className="flex items-center gap-0.5"><Cpu size={10} className="text-slate-455" /> Vstupy / dveře</span>
              <span className="font-mono text-slate-800 dark:text-white">{devices} / 15</span>
            </div>
            <input 
              type="range"
              min="0"
              max="15"
              value={devices}
              onChange={(e) => setDevices(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200/80 dark:bg-zinc-800 rounded-none appearance-none cursor-pointer accent-tenant-primary focus:outline-none"
            />
          </div>

        </div>

      </div>

      {/* GRID: Narrow Pricing Cards Grid on the Left (8 Columns), Creative ROI widget on the Right (4 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto items-stretch">
        
        {/* LEFT: 4 Pricing Cards (Span 8) - Narrow and compact styling */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between select-none">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-550">
              Dostupné plány a navýšení limitů
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 flex-1">
            {plans.map((p, index) => {
              const isRecommended = p.id === activePlanId;
              const price = isYearly ? p.priceYearly : p.priceMonthly;

              return (
                <ScrollReveal 
                  key={p.id}
                  animation="fade-down"
                  delay={index * 150}
                  duration={600}
                  className="flex flex-col h-full"
                >
                  <div 
                    className={`relative flex flex-col justify-between p-4.5 rounded-none border transition-all duration-300 h-full ${
                      isRecommended 
                        ? "border-tenant-primary bg-tenant-primary/[0.02] dark:bg-tenant-primary/[0.04] shadow-md shadow-tenant-primary/5 scale-[1.01]" 
                        : "border-slate-200/60 dark:border-[#2A2A40]/40 bg-white/40 dark:bg-[#0A0A10]/25 hover:border-slate-350 dark:hover:border-tenant-primary/35"
                    }`}
                  >
                    {/* Recommended Floating Badges */}
                    {isRecommended && (
                      <div className="absolute -top-2.5 right-3 bg-tenant-gradient text-white text-[8px] font-extrabold px-2 py-0.5 rounded-none shadow-sm uppercase tracking-wide select-none">
                        Doporučeno
                      </div>
                    )}

                    <div>
                      {/* Header with Title and Inline popularity badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="font-bold text-slate-805 dark:text-white text-xs">
                          {p.name}
                        </h5>
                        {p.badge && (
                          <span className="bg-amber-500 text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded-none uppercase tracking-wide select-none">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1.5 leading-tight">
                        {p.subname}
                      </p>
                      
                      <div className="mt-3 flex items-baseline gap-0.5 select-none">
                        <span className="text-xl font-black text-slate-800 dark:text-white font-mono">
                          {price.toLocaleString()} Kč
                        </span>
                        <span className="text-slate-400 dark:text-zinc-500 text-[9px]">
                          / měs.
                        </span>
                      </div>

                      {isYearly && price > 0 && (
                        <span className="block text-[8px] text-emerald-500 font-bold mt-0.5 select-none">
                          Roční platba
                        </span>
                      )}
                      
                      {/* Features List */}
                      <ul className="mt-4 space-y-2 text-[10px] text-slate-650 dark:text-zinc-350 border-t border-slate-200/50 dark:border-[#1F1F35]/40 pt-3">
                        {p.features.map((f, idx) => (
                          <li key={idx} className="flex items-center gap-1">
                            <Check size={10} className="text-tenant-primary shrink-0" />
                            <span className="truncate">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* CTA Button */}
                    <button
                      onClick={() => handleOpenSetup(p.name)}
                      className={`mt-5 w-full text-center text-[10.5px] py-2 px-3 rounded-none font-bold transition-all cursor-pointer select-none hover:scale-[1.02] active:scale-[0.98] ${
                        isRecommended
                          ? "bg-tenant-gradient text-white border border-transparent shadow-xs"
                          : "bg-white dark:bg-black/35 hover:bg-slate-5 border border-slate-250 dark:border-[#2A2A40] text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      Aktivovat
                    </button>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Creative ROI & Profit Benefits Widget (Span 4) */}
        <div className="lg:col-span-4 p-5 bg-gradient-to-br from-[#7000FF]/[0.03] to-[#7000FF]/[0.01] dark:from-[#7000FF]/[0.08] dark:to-[#7000FF]/[0.02] border border-tenant-primary/15 rounded-none space-y-5 shadow-sm flex flex-col justify-between">
          
          <div className="space-y-4">
            <div className="flex justify-between items-start border-b border-[#E2E8F0] dark:border-white/5 pb-3">
              <div className="space-y-1">
                <span className="text-[9px] text-tenant-primary font-black uppercase tracking-wider block select-none">Ekonomický simulátor</span>
                <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                  <Coins size={15} className="text-tenant-primary" />
                  Kalkulačka přínosů & ROI
                </h4>
              </div>
            </div>

            {/* Selector: Average Price per Booking */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-500 select-none">
                <span className="flex items-center gap-1"><Landmark size={12} /> Průměrná cena rezervace</span>
                <strong className="text-foreground font-mono">{avgPrice} Kč/hod</strong>
              </div>
              <input 
                type="range"
                min="200"
                max="1000"
                step="50"
                value={avgPrice}
                onChange={(e) => setAvgPrice(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200/85 dark:bg-zinc-800 rounded-none appearance-none cursor-pointer accent-tenant-primary focus:outline-none"
              />
              <div className="flex justify-between text-[8px] font-bold text-slate-400 select-none">
                <span>200 Kč</span>
                <span>1000 Kč</span>
              </div>
            </div>

            {/* Calculations logic description list */}
            <div className="space-y-2.5 text-[10.5px] text-slate-550 dark:text-zinc-400">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-[#1F1F35]/20">
                <span className="flex items-center gap-1"><ClipboardList size={11} className="text-slate-400" /> Měsíční obrat z ploch</span>
                <strong className="text-foreground font-mono text-slate-808 dark:text-white">
                  {Math.round(monthlyBookingsRev).toLocaleString()} Kč
                </strong>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-[#1F1F35]/20">
                <span className="flex items-center gap-1"><Timer size={11} className="text-slate-405" /> Úspora času personálu</span>
                <strong className="text-tenant-primary font-mono">
                  {monthlyLaborHoursSaved} hod / měs.
                </strong>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-[#1F1F35]/20">
                <span className="flex items-center gap-1"><Building size={11} className="text-slate-405" /> Mzdová úspora (vstupy)</span>
                <strong className="text-tenant-primary font-mono">
                  +{monthlyLaborCostSaved.toLocaleString()} Kč
                </strong>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Náklady na platformu:</span>
                <span className="text-slate-505 dark:text-zinc-400 font-mono font-bold">
                  -{activePlanPrice.toLocaleString()} Kč
                </span>
              </div>
            </div>
          </div>

          {/* NET VALUE OUTPUT (ROI highlighted box) */}
          <div className="p-4 bg-white/45 dark:bg-black/35 border border-tenant-primary/20 rounded-none space-y-2.5 select-none">
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Celkový měsíční přínos</span>
              <span key={roiRatio} className="text-[9px] bg-tenant-primary/10 text-tenant-primary border border-tenant-primary/15 px-2 py-0.5 rounded-none font-black font-mono animate-value-pop">
                {roiRatio}x ROI
              </span>
            </div>
            <div className="space-y-0.5">
              <strong key={netProfitBenefit} className="text-2xl font-black text-tenant-primary font-mono block animate-value-pop">
                +{Math.round(netProfitBenefit).toLocaleString()} Kč
              </strong>
              <span className="text-[9px] text-slate-450 dark:text-zinc-500 block leading-tight">
                Čisté navýšení profitu areálu za měsíc po odečtení nákladů za ReSys.
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* SANDBOX GENERATION MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-fade-in">
          
          <div className="bg-white dark:bg-[#09090F] border border-slate-200/80 dark:border-[#1F1F35]/70 rounded-none w-full max-w-md shadow-2xl relative overflow-hidden animate-scale-up p-6">
            <div className="absolute top-0 right-0 h-40 w-40 bg-tenant-primary/5 blur-2xl rounded-full -z-10" />

            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200/55 dark:border-white/5 pb-4 mb-4 select-none">
              <div className="flex items-center gap-2 text-tenant-primary">
                <Sparkles size={18} className="animate-spin" style={{ animationDuration: '3s' }} />
                <h4 className="font-extrabold text-sm text-foreground">SaaS Sandbox Aktivátor</h4>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-none hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 dark:text-zinc-50 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* PHASE 0: SETUP FORM */}
            {setupStep === 0 && (
              <div className="space-y-4">
                <div className="p-3 bg-tenant-primary/[0.02] border border-tenant-primary/15 rounded-none select-none text-[10.5px] text-slate-500 dark:text-zinc-450 leading-relaxed">
                  Vyberte si název a okamžitě zprovozníme váš testovací tenant na plánu <strong className="text-tenant-primary uppercase font-bold">{selectedPlanName}</strong>.
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
                    Název vaší haly / provozu
                  </label>
                  <input
                    type="text"
                    required
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Např. Arena Pardubice, Yoga Flow"
                    className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/70 dark:border-white/10 rounded-none py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
                    Subdoména portálu (ID)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      disabled
                      value={tenantId}
                      placeholder="arena-pardubice"
                      className="w-full bg-slate-100/50 dark:bg-black/50 text-slate-505 dark:text-zinc-50 border border-slate-200/70 dark:border-white/10 rounded-none py-2 px-4 text-xs font-mono font-bold outline-none"
                    />
                    <span className="absolute right-4 text-[10px] text-slate-400 font-mono select-none">
                      .localhost:3000
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
                    Segment podnikání (Vertikála)
                  </label>
                  <select
                    value={vertical}
                    onChange={(e) => setVertical(e.target.value)}
                    className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/70 dark:border-white/10 rounded-none py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all cursor-pointer"
                  >
                    <option value="SPORTS_GROUND">Sportoviště (Časový grid & kurty)</option>
                    <option value="EDUCATIONAL_COURSE">Vzdělávání (Kapacitní lekce)</option>
                    <option value="CAPACITY_CLASS">Wellness / Fitness (Kapacitní model)</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!tenantName}
                  onClick={startSimulation}
                  className="w-full mt-2 bg-tenant-gradient text-white text-xs font-bold py-2.5 px-4 rounded-none cursor-pointer hover:opacity-95 active:scale-95 transition-all shadow-md shadow-tenant-primary/10 flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Play size={13} fill="white" />
                  Spustit Sandbox Setup
                </button>
              </div>
            )}

            {/* PHASE 1: PROGRESS ANIMATION */}
            {setupStep === 1 && (
              <div className="space-y-5 py-3 text-center">
                <div className="flex justify-center">
                  <div className="h-10 w-10 rounded-none bg-tenant-primary/10 text-tenant-primary flex items-center justify-center animate-spin" style={{ animationDuration: '2.5s' }}>
                    <RefreshCw size={20} />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h5 className="font-extrabold text-xs text-foreground select-none">Provádím automatický provisioning...</h5>
                  <p className="text-[10px] text-tenant-primary font-mono font-bold animate-pulse">
                    {progressText}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-black/45 rounded-none border border-slate-200/30 dark:border-white/5 p-4 text-[10px] font-mono text-left space-y-1.5 h-36 overflow-y-auto">
                  {completedSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-slate-500 dark:text-zinc-400">
                      <span className="text-tenant-primary font-bold shrink-0">✔</span>
                      <span>{step}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 text-tenant-primary font-bold">
                    <span className="animate-ping shrink-0">•</span>
                    <span>{progressText}</span>
                  </div>
                </div>
              </div>
            )}

            {/* PHASE 2: SUCCESS DIALOG */}
            {setupStep === 2 && (
              <div className="space-y-6 text-center select-none">
                <div className="flex justify-center">
                  <div className="h-10 w-10 rounded-none bg-tenant-primary/10 text-tenant-primary flex items-center justify-center border border-tenant-primary/20">
                    <Check size={20} className="stroke-[3]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h5 className="font-black text-sm text-foreground">Sandbox je zprovozněn!</h5>
                  <p className="text-xs text-slate-500 dark:text-zinc-450 leading-relaxed">
                    Váš testovací portál <strong className="text-foreground">{tenantName}</strong> byl kompletně nakonfigurován a provázán s OneiD SSO a auditováním.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-black/45 p-4 rounded-none border border-slate-200/40 dark:border-white/5 space-y-2 text-left">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-slate-400">Klientský portál:</span>
                    <a 
                      href={`http://${tenantId}.localhost:3000`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-tenant-primary hover:underline font-mono font-bold flex items-center gap-0.5"
                    >
                      {tenantId}.localhost:3000
                      <ArrowRight size={10} />
                    </a>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-slate-400">Administrace portálu:</span>
                    <a 
                      href={`http://${tenantId}.localhost:3000/admin`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-tenant-primary hover:underline font-mono font-bold flex items-center gap-0.5"
                    >
                      /admin
                      <ArrowRight size={10} />
                    </a>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px] border-t border-slate-200/45 dark:border-white/5 pt-1.5 mt-1.5">
                    <span className="text-slate-400">Stav tarifu:</span>
                    <span className="text-tenant-primary font-extrabold uppercase text-[9.5px] tracking-wide bg-tenant-primary/10 border border-tenant-primary/15 px-2 py-0.5 rounded-none">
                      AKTIVNÍ / {selectedPlanName}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="btn-tenant flex-1 py-2 rounded-none text-xs font-bold transition-all cursor-pointer hover:opacity-90 active:scale-95"
                  >
                    Zavřít
                  </button>
                  <a
                    href={`http://${tenantId}.localhost:3000/admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-tenant-gradient text-white text-xs font-bold py-2 px-4 rounded-none cursor-pointer hover:opacity-95 active:scale-95 transition-all text-center flex items-center justify-center gap-1 flex-1 shadow-md shadow-tenant-primary/15"
                  >
                    Přejít do adminu
                    <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </section>
  );
}
