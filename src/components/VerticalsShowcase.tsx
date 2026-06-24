"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Activity, Building, Smartphone, Globe, Check, ArrowRight, ShieldCheck, RefreshCw, X } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  vertical: string;
}

interface VerticalsShowcaseProps {
  tenants: Tenant[];
  isLocal: boolean;
}

interface VerticalInfo {
  id: string;
  label: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: { title: string; desc: string }[];
  matchingVertical: string;
  sampleMockup: React.ReactNode;
}

export default function VerticalsShowcase({ tenants, isLocal }: VerticalsShowcaseProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  const verticals: VerticalInfo[] = [
    {
      id: "sports",
      label: "Sportoviště",
      icon: <Activity size={16} />,
      title: "Automatizovaná správa kurtů a hal bez personálu",
      description: "Časové kalendáře pro tenisové, badmintonové či víceúčelové haly. Systém sám hlídá obsazenost, automaticky zapíná osvětlení pro konkrétní rezervace a odemyká vstupní dveře přes QR kódy.",
      features: [
        { title: "Chytrá tvorba cen", desc: "Automatická změna cen v závislosti na denní době, svátcích či atraktivitě hodin." },
        { title: "Ochrana před překryvem", desc: "Pronájem celé haly automaticky zablokuje možnost rezervovat jednotlivé kurty." },
        { title: "Automatické příplatky za osvětlení", desc: "Osvětlení, vytápění nebo jiné tehcnické příplatky se automaticky přidávají k ceně rezervace." },
        { title: "Samoobslužný příchod", desc: "Zákazníci u vchodu jednoduše naskenují kód ze svého mobilu a systém je vpustí dovnitř." }
      ],
      matchingVertical: "SPORTS_GROUND",
      sampleMockup: (
        <div className="p-5 bg-white dark:bg-[#090910] border border-slate-200/60 dark:border-[#1F1F35]/30 rounded-none space-y-4 shadow-sm text-left">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1F1F35]/25 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-tenant-primary">Badmintonová Hala</span>
            <span className="text-[9px] font-mono border-l-2 border-tenant-primary text-tenant-primary pl-1.5 font-bold uppercase select-none">Automatický provoz</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-555 dark:text-zinc-400">
              <span>Kurty 1-4 (Celá hala)</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">Obsazeno (16:00 - 18:00)</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-[#131322] h-2 rounded-none overflow-hidden">
              <div className="bg-tenant-gradient h-full w-full" />
            </div>
            <div className="p-2.5 rounded-none bg-amber-500/[0.04] border border-amber-500/15 text-[9.5px] text-amber-600 dark:text-amber-400 leading-normal font-medium flex items-start gap-1.5">
              <X size={12} className="shrink-0 mt-0.5 text-amber-500" />
              <span>
                <strong>Zablokováno:</strong> Kurty 1 až 4 nelze rezervovat samostatně kvůli pronájmu celé haly.
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "education",
      label: "Vzdělávání",
      icon: <Building size={16} />,
      title: "Rezervace učeben, laboratoří a drahého vybavení",
      description: "Systém pro akademické učebny, laboratoře, sportovní zázemí vysokých škol či sdílenou techniku. Umožňuje bezpečné přihlášení studentů na jedno kliknutí a možnost schvalování rezervací vyučujícími.",
      features: [
        { title: "Přihlášení na jedno kliknutí", desc: "Ověření totožnosti studenta či partnera bez nutnosti zakládat a pamatovat si nová hesla." },
        { title: "Kontrola oprávnění", desc: "Možnost povolit rezervaci drahých přístrojů a strojů pouze studentům po absolvování školení." },
        { title: "Schvalovací proces", desc: "Rezervace specifických prostor nebo pomůcek může podléhat schválení odpovědným správcem." },
        { title: "Statistiky využitelnosti", desc: "Kompletní přehled o tom, jak jsou prostory a přístroje vytěženy a kdo je nejvíce využívá." }
      ],
      matchingVertical: "EDUCATIONAL_COURSE",
      sampleMockup: (
        <div className="p-5 bg-white dark:bg-[#090910] border border-slate-200/60 dark:border-[#1F1F35]/30 rounded-none space-y-4 shadow-sm text-left">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1F1F35]/25 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-tenant-primary">Výuková Laboratoř A</span>
            <span className="text-[9px] font-mono border-l-2 border-tenant-primary text-tenant-primary pl-1.5 font-bold uppercase select-none">Vyžaduje schválení</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Student:</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">Tomáš Novotný (ISIC)</span>
            </div>
            <div className="p-2.5 rounded-none bg-tenant-primary/5 border border-tenant-primary/10 text-[9.5px] text-tenant-primary leading-normal flex items-start gap-2">
              <ShieldCheck size={14} className="shrink-0 mt-0.5" />
              <span>Bezpečnostní školení ověřeno. Rezervace laboratoře byla schválena.</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "wellness",
      label: "Wellness",
      icon: <Smartphone size={16} />,
      title: "Jednoduchá správa kapacit, lekcí a permanentek",
      description: "Vhodné pro saunové světy, bazény, fitness centra a skupinové lekce. ReSys automaticky kontroluje obsazenost zón v reálném čase, spravuje kredity a přiřazuje šatní skříňky přímo u vstupu.",
      features: [
        { title: "Hlídání kapacity zón", desc: "Automatické zastavení vstupů, pokud je sauna či bazén zaplněn, pro zachování komfortu." },
        { title: "Předplatné a storno poplatky", desc: "Jednoduché dobíjení kreditů, správa permanentek a automatické hlídání náhradníků." },
        { title: "Automatické přidělení skříňky", desc: "Turniket u vstupu přiřadí volnou skříňku na náramek zákazníka zcela bez pomoci recepce." },
        { title: "Rychlý nákup bez registrace", desc: "Možnost okamžitého nákupu jednorázového vstupu online platební kartou na tři kliknutí." }
      ],
      matchingVertical: "CAPACITY_CLASS",
      sampleMockup: (
        <div className="p-5 bg-white dark:bg-[#090910] border border-slate-200/60 dark:border-[#1F1F35]/30 rounded-none space-y-4 shadow-sm text-left">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1F1F35]/25 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-tenant-primary">Finská Sauna</span>
            <span className="text-[9px] font-mono border-l-2 border-tenant-primary text-tenant-primary pl-1.5 font-bold uppercase select-none">Obsazenost 18 / 20</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-555">
              <span>Aktuálně volná místa:</span>
              <span className="font-bold text-tenant-primary">2 místa</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-[#131322] h-2.5 rounded-none overflow-hidden">
              <div className="bg-tenant-gradient h-full w-[90%]" />
            </div>
            <p className="text-[9.5px] text-slate-400 dark:text-zinc-550 leading-normal">
              Jakmile bude kapacita Finské sauny plná, čtečka u vstupu dočasně nepustí dovnitř další návštěvníky bez předchozí rezervace.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "ticketing",
      label: "Eventy",
      icon: <Globe size={16} />,
      title: "Rychlý prodej lístků a odbavení jednorázových akcí",
      description: "Prodej vstupenek na kulturní, společenské či firemní akce. Zákazníci obdrží lístky s unikátním kódem, který u vstupu spolehlivě a okamžitě ověříte i pomocí běžného mobilu.",
      features: [
        { title: "Lístky přímo do mobilu", desc: "Zasílání přehledných vstupenek na e-mail s možností přidat je do peněženek Apple/Google Wallet." },
        { title: "Plynulý příchod bez front", desc: "Ověření platnosti lístku na čtečce trvá zlomky sekundy, což zrychluje odbavování." },
        { title: "Ochrana proti zneužití", desc: "Každou vstupenku lze použít pouze jednou, systém okamžitě rozpozná zkopírované lístky." },
        { title: "Skenování běžným mobilem", desc: "Personálu u vstupu stačí k ověřování lístků otevřít čtečku na jakémkoliv chytrém telefonu." }
      ],
      matchingVertical: "TICKETING_EVENT",
      sampleMockup: (
        <div className="p-5 bg-white dark:bg-[#090910] border border-slate-200/60 dark:border-[#1F1F35]/30 rounded-none space-y-4 shadow-sm text-left">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1F1F35]/25 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-tenant-primary">Konference Meetup</span>
            <span className="text-[9px] font-mono border-l-2 border-tenant-primary text-tenant-primary pl-1.5 font-bold uppercase select-none">Odbavení aktivní</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Odbaveno lístků:</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">342 / 500</span>
            </div>
            <div className="p-2.5 rounded-none bg-tenant-primary/5 border border-tenant-primary/10 text-[9.5px] text-tenant-primary leading-normal flex items-start gap-2">
              <RefreshCw size={14} className="shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '4s' }} />
              <span>Průměrná rychlost odbavení je 0.8 s na osobu. Nalezeno 0 neplatných kódů.</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const activeVertical = verticals[activeIdx];
  
  // Find matching tenant for the active vertical, to display a sandbox link
  const matchingTenant = tenants.find(t => t.vertical === activeVertical.matchingVertical) || tenants[0];
  const portalUrl = matchingTenant 
    ? (isLocal ? `http://${matchingTenant.id}.localhost:3000` : `/tenants/${matchingTenant.id}`)
    : "#";

  return (
    <div className="space-y-10">
      <div className="flex justify-center select-none w-full">
        <div className="flex items-center bg-slate-200/50 dark:bg-black/60 border border-slate-300 dark:border-zinc-700 divide-x divide-slate-300 dark:divide-zinc-700 rounded-none w-fit max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shadow-sm">
          {verticals.map((vert, idx) => (
            <button
              key={vert.id}
              onClick={() => setActiveIdx(idx)}
              className={`flex items-center gap-2.5 py-3 px-6 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 cursor-pointer whitespace-nowrap rounded-none ${
                activeIdx === idx
                  ? "bg-tenant-primary/15 text-tenant-primary font-black shadow-[inset_0_-2px_0_0_var(--tenant-primary)]"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/5 dark:hover:bg-white/5"
              }`}
            >
              {vert.icon}
              <span>{vert.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Segment Content Details */}
      <div className="grid lg:grid-cols-12 gap-10 items-center bg-white/45 dark:bg-[#07070C]/35 border border-slate-200/50 dark:border-[#1F1F35]/30 p-8 rounded-none backdrop-blur-xl shadow-md">
        
        {/* Left Column: Feature Specifications */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="space-y-4">
            <div className="border-l-2 border-tenant-primary pl-3.5 select-none">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-tenant-primary block leading-none">
                {activeVertical.label}
              </span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-3xl md:text-4.5xl font-black text-foreground tracking-tighter leading-none">
                {activeVertical.title}
              </h3>
              <span className="text-[9.5px] font-black text-slate-400 dark:text-zinc-550 uppercase tracking-widest block">
                MODULÁRNÍ RESYS PLATFORMA
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-555 dark:text-zinc-400 leading-relaxed">
              {activeVertical.description}
            </p>
          </div>

          {/* Redesigned 1-column list of key features (removing redundant columns for typical problems) */}
          <div className="space-y-3.5 pt-4 border-t border-slate-200/10 dark:border-white/5">
            {activeVertical.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs leading-normal">
                <div className="h-5 w-5 rounded-none bg-tenant-primary/10 text-tenant-primary flex items-center justify-center shrink-0 mt-0.5 border border-tenant-primary/20">
                  <Check size={11} strokeWidth={2.5} />
                </div>
                <div className="space-y-0.5 text-left">
                  <strong className="text-foreground text-slate-800 dark:text-zinc-200 block font-bold">{feature.title}</strong>
                  <span className="text-slate-500 dark:text-zinc-450 block text-[11px]">{feature.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {matchingTenant && (
            <div className="pt-4 border-t border-slate-200/10 dark:border-white/5 flex flex-wrap items-center gap-4">
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Vyzkoušejte připravené demo:</span>
              <Link 
                href={portalUrl}
                className="group inline-flex items-center gap-1.5 bg-tenant-primary/10 hover:bg-tenant-gradient text-tenant-primary hover:text-white border border-tenant-primary/20 border-l-[3px] border-l-tenant-primary text-[10px] py-2 px-4 rounded-none font-extrabold uppercase tracking-widest transition-all duration-300 cursor-pointer shadow-sm shadow-tenant-primary/5"
              >
                Otevřít portál {matchingTenant.name}
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Visual Sandbox Mockup */}
        <div className="lg:col-span-5 relative w-full">
          <div className="absolute inset-0 bg-gradient-to-tr from-tenant-primary/15 to-indigo-500/20 blur-3xl opacity-60 rounded-none scale-95" />
          <div className="relative p-2 bg-slate-100/40 dark:bg-black/30 border border-slate-200/20 dark:border-[#1F1F35]/40 rounded-none shadow-lg">
            {activeVertical.sampleMockup}
          </div>
        </div>

      </div>
    </div>
  );
}
