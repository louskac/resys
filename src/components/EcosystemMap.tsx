"use client";

import React, { useState } from "react";
import { 
  ArrowRight, 
  Database, 
  Users, 
  ShieldCheck, 
  Cpu,
  Smartphone,
  Server,
  Network,
  Lock,
  Layers,
  Mail,
  Ticket,
  Globe,
  Activity,
  Key,
  UserCheck
} from "lucide-react";

type PlatformNode = "resys" | "relatoo" | "enigoo" | "oneid";

interface NodeDetail {
  category: string;
  title: string;
  tagline: string;
  description: string;
  role: string;
  features: string[];
  btnText: string;
  btnLink: string;
}

const nodeDetails: Record<PlatformNode, NodeDetail> = {
  resys: {
    category: "REZERVAČNÍ JÁDRO & IOT",
    title: "ReSys Engine",
    tagline: "Pro lokální areály a menší sportoviště",
    description: "Chytré rezervační jádro navržené pro sportovní kluby, kurty, tělocvičny a menší haly. Plně automatizuje rezervace, online platby a pomocí IoT přímo spíná technické vybavení na místě (osvětlení, vytápění, dveřní zámky).",
    role: "Určeno pro provozy, kde by byla implementace robustního ticketingu ENIGOO administrativně i finančně zbytečným overkillem.",
    features: [
      "Plně bezobslužný samoobslužný provoz",
      "IoT spínání hardwaru (světla, šatny, turnikety)",
      "Zprovoznění během několika minut s nulovými fixními náklady"
    ],
    btnText: "Spustit Sandbox Setup",
    btnLink: "#sandbox"
  },
  relatoo: {
    category: "CRM & MARKETING AUTOMATION",
    title: "relatoo CRM",
    tagline: "Centralizace zákazníků & věrnostní programy",
    description: "Věrnostní systém a CRM platforma skupiny DEEP VISION. Automaticky agreguje kontakty, platební historii a chování uživatelů jak z ReSys, tak z velkých ticketingů ENIGOO, a vytváří unifikované profily pro cílené kampaně.",
    role: "Propojuje provozní a transakční data z celé sítě sportovišť. Umožňuje sdílet marketingové segmenty a podporovat cross-selling.",
    features: [
      "Jednotná zákaznická databáze (CDP)",
      "Automatizované e-mailové a SMS kampaně",
      "Pokročilé marketingové segmentace a analytika"
    ],
    btnText: "Více o platformě relatoo",
    btnLink: "https://relatoo.cz"
  },
  enigoo: {
    category: "ENTERPRISE TICKETING",
    title: "ENIGOO Platforma",
    tagline: "Transakční systém pro stadiony a velké areály",
    description: "Robustní enterprise ticketing a rezervační platforma pro masové akce, prvoligové kluby, multifunkční arény, aquaparky a zoologické zahrady. Zvládá vysoký nápor transakcí, grafické mapy sedadel a integrace velkých turniketů.",
    role: "Konečný bod růstu klienta. Jakmile sportoviště vyroste do profesionálních měřítek, může hladce přejít ze systému ReSys na ENIGOO.",
    features: [
      "Vysokokapacitní prodej vstupenek a permanentek",
      "Grafická schémata a 3D vizualizace sedadel",
      "Pokladní systémy a profesionální přístupové brány"
    ],
    btnText: "Přejít na web ENIGOO",
    btnLink: "https://enigoo.cz"
  },
  oneid: {
    category: "JEDNOTNÁ IDENTITA",
    title: "OneiD SSO",
    tagline: "Společný přihlašovací hub sítě",
    description: "Centralizovaná federovaná identita (SSO), která spojuje uživatelské účty napříč všemi sportovišti a ticketingovými systémy. Hráč se registruje pouze jednou a se stejným profilem a kartou platí na libovolném místě.",
    role: "Snižuje bariéru vstupu pro koncové uživatele. Umožňuje přelévání zákazníků mezi lokálními kluby a velkými stadiony.",
    features: [
      "Přihlášení a registrace na jedno kliknutí",
      "Sdílené bezpečné uložení platebních údajů",
      "Zvýšení konverze při rezervacích napříč sítěmi"
    ],
    btnText: "Vyzkoušet OneiD v sandboxu",
    btnLink: "#sandbox"
  }
};

// Technology flow nodes definitions for each growth phase
const activeFlows: Record<PlatformNode, { icon: React.ComponentType<any>; title: string; desc: string }[]> = {
  resys: [
    { icon: Smartphone, title: "1. Mobilní Aplikace", desc: "Hráč provede platbu a zarezervuje kurt online" },
    { icon: Server, title: "2. ReSys Core Engine", desc: "API zkontroluje slot a zapíše transakci do DB" },
    { icon: Network, title: "3. MQTT Gateway Broker", desc: "Zprostředkuje šifrovaný pokyn hardwaru na místě" },
    { icon: Lock, title: "4. IoT Relé & Smart Lock", desc: "Fyzické sepnutí osvětlení a odemčení vstupu" }
  ],
  relatoo: [
    { icon: Database, title: "1. Sběr Transakcí", desc: "Příjem provozních dat z ReSys i turniketů ENIGOO" },
    { icon: Users, title: "2. relatoo CDP Databáze", desc: "Sloučení dat do jednoho profilu zákazníka" },
    { icon: Layers, title: "3. Segmentační Engine", desc: "Rozdělení hráčů podle frekvence hraní a útraty" },
    { icon: Mail, title: "4. Marketing Automation", desc: "Rozeslání automatizovaných e-mailů s bonusy" }
  ],
  enigoo: [
    { icon: Ticket, title: "1. Prodej Vstupenek", desc: "Distribuce kódů a permanentek online i offline" },
    { icon: Globe, title: "2. 3D Schéma Arény", desc: "Interaktivní výběr sedadel z 3D mapy sektoru" },
    { icon: Server, title: "3. ENIGOO API Server", desc: "Rychlé odbavení a validace šifrovaných tokenů" },
    { icon: Activity, title: "4. RFID Turniketové Brány", desc: "Fyzické odbavení tisíců návštěvníků na stadionu" }
  ],
  oneid: [
    { icon: UserCheck, title: "1. Jeden Profil", desc: "Zákazník má jednu identitu pro celou síť DeepVision" },
    { icon: Key, title: "2. OneiD SSO Brána", desc: "Ověření uživatele přes JWT / OAuth2 a OpenID Connect" },
    { icon: Database, title: "3. Platební Karta", desc: "Sdílené uložení platebních údajů pro rychlý checkout" },
    { icon: Globe, title: "4. Bezpečné Přihlášení", desc: "Přístup na weby areálů i stadionů jedním kliknutím" }
  ]
};

export default function EcosystemMap() {
  const [activeNode, setActiveNode] = useState<PlatformNode>("resys");

  const active = nodeDetails[activeNode];
  const flow = activeFlows[activeNode];

  return (
    <div className="space-y-8 select-none">
      
      {/* Horizontal Tab Switcher matching VerticalsShowcase style */}
      <div className="flex justify-center select-none w-full">
        <div className="flex items-center bg-slate-200/50 dark:bg-black/60 border border-slate-300 dark:border-zinc-700 divide-x divide-slate-300 dark:divide-zinc-700 rounded-none w-fit max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shadow-sm">
          
          {/* Tab 1: ReSys */}
          <button
            onClick={() => setActiveNode("resys")}
            className={`flex items-center gap-2.5 py-3 px-6 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 cursor-pointer whitespace-nowrap rounded-none ${
              activeNode === "resys"
                ? "bg-tenant-primary/15 text-tenant-primary font-black shadow-[inset_0_-2px_0_0_var(--tenant-primary)]"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/5 dark:hover:bg-white/5"
            }`}
          >
            <Cpu size={14} />
            <span>ReSys Engine</span>
          </button>

          {/* Tab 2: relatoo */}
          <button
            onClick={() => setActiveNode("relatoo")}
            className={`flex items-center gap-2.5 py-3 px-6 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 cursor-pointer whitespace-nowrap rounded-none ${
              activeNode === "relatoo"
                ? "bg-tenant-primary/15 text-tenant-primary font-black shadow-[inset_0_-2px_0_0_var(--tenant-primary)]"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/5 dark:hover:bg-white/5"
            }`}
          >
            <Users size={14} />
            <span>relatoo CRM</span>
          </button>

          {/* Tab 3: ENIGOO */}
          <button
            onClick={() => setActiveNode("enigoo")}
            className={`flex items-center gap-2.5 py-3 px-6 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 cursor-pointer whitespace-nowrap rounded-none ${
              activeNode === "enigoo"
                ? "bg-tenant-primary/15 text-tenant-primary font-black shadow-[inset_0_-2px_0_0_var(--tenant-primary)]"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/5 dark:hover:bg-white/5"
            }`}
          >
            <ShieldCheck size={14} />
            <span>ENIGOO Platforma</span>
          </button>

          {/* Tab 4: OneiD */}
          <button
            onClick={() => setActiveNode("oneid")}
            className={`flex items-center gap-2.5 py-3 px-6 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 cursor-pointer whitespace-nowrap rounded-none ${
              activeNode === "oneid"
                ? "bg-tenant-primary/15 text-tenant-primary font-black shadow-[inset_0_-2px_0_0_var(--tenant-primary)]"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/5 dark:hover:bg-white/5"
            }`}
          >
            <Database size={14} />
            <span>OneiD Identity</span>
          </button>

        </div>
      </div>

      {/* Main Contents Panel (2 Columns) */}
      <div className="grid lg:grid-cols-12 gap-8 items-stretch bg-white/45 dark:bg-[#07070C]/35 border border-slate-200/50 dark:border-[#1F1F35]/30 p-6 md:p-8 rounded-none backdrop-blur-xl shadow-md">
        
        {/* Left Column: Compact Visual Data Flow Simulator (Span 6) */}
        <div key={`flow-${activeNode}`} className="lg:col-span-6 p-6 bg-slate-50/50 dark:bg-black/35 border border-slate-200/60 dark:border-zinc-800/40 rounded-none flex flex-col justify-center min-h-[300px] relative overflow-hidden animate-fade-in-up">
          
          {/* Vertical animated connector line */}
          <svg className="absolute left-[34px] top-8 bottom-8 w-[2px] h-[calc(100%-4rem)] z-0" overflow="visible">
            <line 
              x1="0" 
              y1="0" 
              x2="0" 
              y2="100%" 
              stroke="var(--tenant-primary)" 
              strokeWidth="1.5" 
              strokeDasharray="4,6" 
              className="animate-flow-dash"
              opacity="0.3"
            />
          </svg>
          
          <div className="flex flex-col gap-5 relative z-10">
            {flow.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex gap-4 items-center animate-fadeIn">
                  {/* Icon with purple border wrapper */}
                  <div className="h-9 w-9 flex items-center justify-center rounded-none bg-white dark:bg-[#0A0A14] border border-tenant-primary/45 text-tenant-primary shrink-0 relative shadow-sm">
                    <Icon size={16} className="animate-pulse" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 bg-tenant-primary rounded-full animate-ping" />
                  </div>
                  
                  {/* Text */}
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white leading-tight">
                      {item.title}
                    </span>
                    <span className="text-[9.5px] text-slate-455 dark:text-zinc-500 font-medium leading-normal mt-0.5">
                      {item.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column: Clean Details Card (Span 6) */}
        <div key={`details-${activeNode}`} className="lg:col-span-6 flex flex-col justify-between border border-slate-200/60 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-[#09090F]/45 p-6 md:p-8 rounded-none shadow-sm transition-colors duration-300 min-h-[300px] animate-fade-in-up">
          
          <div className="space-y-6 text-left">
            
            {/* Header Area */}
            <div className="border-l-2 border-tenant-primary pl-3 select-none">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-tenant-primary block leading-none">
                {active.category}
              </span>
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-2.5xl font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none">
                {active.title}
              </h3>
              <p className="text-[10px] text-slate-450 dark:text-zinc-500 font-bold uppercase tracking-wider">
                {active.tagline}
              </p>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-555 dark:text-zinc-400 leading-relaxed">
              {active.description}
            </p>

            {/* Role Box */}
            <div className="p-4 bg-tenant-primary/[0.03] border-l-[3px] border-l-tenant-primary border-y border-r border-slate-200/50 dark:border-zinc-800/40 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
              <strong>Strategická role v koncernu: </strong> {active.role}
            </div>

            {/* Features checkmarks */}
            <div className="space-y-3.5 pt-2">
              <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                Hlavní specifikace:
              </span>
              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-zinc-300">
                {active.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="h-4 w-4 flex items-center justify-center rounded-none bg-tenant-primary/10 text-tenant-primary shrink-0 mt-0.5 border border-tenant-primary/20 text-[9px] font-bold">
                      ✓
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Steer Action Button */}
          <div className="pt-6 border-t border-slate-200 dark:border-zinc-800/60 mt-8">
            <a 
              href={active.btnLink} 
              target={active.btnLink.startsWith("http") ? "_blank" : undefined}
              rel={active.btnLink.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group w-full border border-tenant-primary/20 border-l-[3px] border-l-tenant-primary bg-tenant-primary/10 hover:bg-tenant-primary text-tenant-primary hover:text-white text-xs py-3 px-5 rounded-none font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {active.btnText}
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

        </div>

      </div>

      {/* Explanatory subtitle */}
      <div className="text-[10px] text-center text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider pt-2 select-none">
        KLIKNUTÍM NA JEDNOTLIVÉ TABY ZOBRAZÍTE PODROBNÝ TOK DAT V TECHNOLOGICKÉM STACKU
      </div>

    </div>
  );
}
