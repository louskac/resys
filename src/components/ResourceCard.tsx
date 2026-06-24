import React from "react";
import { Clock, Users, CreditCard, Layers, Wrench, MapPin, User as UserIcon } from "lucide-react";

export interface ResourceRule {
  id: string;
  name: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  price: string | number;
  maxCapacity: number;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  maxCapacity: number;
  attributes: {
    instructor?: string;
    room?: string;
    surface?: string;
    equipment?: string;
    equipmentList?: any[];
    parentId?: string;
    price?: string | number;
  };
  scheduleRules: ResourceRule[];
}

interface ResourceCardProps {
  resource: Resource;
  vertical: string;
  openTime?: string;
  closeTime?: string;
  allResources?: Resource[];
  footer?: React.ReactNode;
  className?: string;
  partnerDiscount?: number;
}

// Simple mapping of resource type for Czech UI readability
const getResourceTypeName = (type: string, vertical: string, name: string, parentId: string | null, siblingsCount: number) => {
  switch (type) {
    case "SPACE": 
      const nameLower = name.toLowerCase();
      if (parentId !== null || nameLower.includes("sektor") || nameLower.includes("sector") || nameLower.includes("sektro") || nameLower.includes("1/2")) {
        if (siblingsCount === 3) return "Třetina plochy";
        if (siblingsCount === 2) return "Polovina plochy";
        return "Část plochy";
      }
      return "Celý prostor";
    case "SEAT": return "Místo k sezení";
    case "COURSE_PROGRAM": return "Trénink / Lekce / Program";
    default: return type;
  }
};

// Helper to format capacity count with correct Czech inflection
const formatCapacity = (capacity: number, vertical: string) => {
  if (capacity === 1) return "1 místo";
  if (capacity >= 2 && capacity <= 4) return `${capacity} místa`;
  return `${capacity} míst`;
};

export default function ResourceCard({
  resource,
  vertical,
  openTime = "08:00",
  closeTime = "22:00",
  allResources = [],
  footer,
  className = "",
  partnerDiscount = 0,
}: ResourceCardProps) {
  const firstRule = resource.scheduleRules?.[0];
  const resAttrs = resource.attributes || {};
  
  const basePriceVal = firstRule ? firstRule.price : resAttrs.price;

  const calculateDiscountedPrice = (priceVal: string | number | undefined) => {
    if (!priceVal) return null;
    const numeric = parseFloat(String(priceVal));
    if (isNaN(numeric)) return null;
    const discounted = numeric * (1 - partnerDiscount / 100);
    return Math.round((discounted + Number.EPSILON) * 100) / 100;
  };

  const discountedPrice = partnerDiscount > 0 ? calculateDiscountedPrice(basePriceVal) : null;

  const priceText = discountedPrice !== null
    ? `${discountedPrice} Kč`
    : basePriceVal 
      ? `${basePriceVal.toString()} Kč`
      : "Dle dohody";
  
  const timeText = firstRule 
    ? `${firstRule.startTime} - ${firstRule.endTime}` 
    : `${openTime} - ${closeTime}`;

  let parentName = "";
  const parentId = resAttrs.parentId;
  if (parentId && allResources.length > 0) {
    const parentRes = allResources.find(r => r.id === parentId);
    if (parentRes) {
      parentName = parentRes.name;
    }
  }

  const siblingsCount = (parentId && allResources.length > 0)
    ? allResources.filter(r => r.attributes?.parentId === parentId).length
    : 0;

  const typeLabel = getResourceTypeName(resource.type, vertical, resource.name, parentId || null, siblingsCount);
  const capacityLabel = formatCapacity(resource.maxCapacity, vertical);

  const priceLabel = "Cena pronájmu";
  const roomLabel = "Místnost / Učebna";
  const instructorLabel = "Trenér / Lektor";

  return (
    <div
      className={`p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] border-l-[4px] border-l-tenant-primary hover:border-tenant-primary/30 dark:hover:border-tenant-primary/25 hover:shadow-md hover:shadow-tenant-primary/5 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 rounded-none flex flex-col justify-between group shadow-sm shadow-slate-100/5 dark:shadow-black/5 content-visibility-auto w-full ${className}`}
    >
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary uppercase tracking-widest select-none shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.4)]">
            {typeLabel}
          </span>
          {parentName && (
            <span className="text-[9.5px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider select-none">
              • {parentName}
            </span>
          )}
        </div>
        <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-3.5 mb-3.5 group-hover:text-tenant-primary transition-colors tracking-tight">
          {resource.name}
        </h4>
        
        <div className="space-y-1.5 text-xs mb-4">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-200/30 dark:border-[#1F1F35]/20">
            <span className="flex items-center gap-2.5">
              <span className="h-6.5 w-6.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 flex items-center justify-center text-tenant-primary shrink-0 transition-colors group-hover:bg-tenant-primary group-hover:text-white">
                <Clock size={11} />
              </span>
              <span className="text-slate-500 dark:text-zinc-400 font-medium">Dostupný čas</span>
            </span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">{timeText}</span>
          </div>
          
          <div className="flex items-center justify-between py-1.5 border-b border-slate-200/30 dark:border-[#1F1F35]/20">
            <span className="flex items-center gap-2.5">
              <span className="h-6.5 w-6.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 flex items-center justify-center text-tenant-primary shrink-0 transition-colors group-hover:bg-tenant-primary group-hover:text-white">
                <Users size={11} />
              </span>
              <span className="text-slate-500 dark:text-zinc-400 font-medium">Kapacita</span>
            </span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">{capacityLabel}</span>
          </div>
          
          <div className="flex items-center justify-between py-1.5">
            <span className="flex items-center gap-2.5">
              <span className="h-6.5 w-6.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 flex items-center justify-center text-tenant-primary shrink-0 transition-colors group-hover:bg-tenant-primary group-hover:text-white">
                <CreditCard size={11} />
              </span>
              <span className="text-slate-500 dark:text-zinc-400 font-medium">{priceLabel}</span>
            </span>
            <div className="flex items-center gap-2">
              {discountedPrice !== null && basePriceVal && (
                <span className="text-[10px] text-slate-400 line-through">
                  {basePriceVal.toString()} Kč
                </span>
              )}
              <span className="text-tenant-primary font-bold flex items-center gap-1.5">
                {priceText}
                {discountedPrice !== null && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold shadow-sm select-none">
                    Sleva {partnerDiscount}%
                  </span>
                )}
              </span>
            </div>
          </div>

          {resAttrs.surface && (
            <div className="flex items-center justify-between py-1.5 border-t border-slate-200/40 dark:border-[#1F1F35]/30 mt-1.5 pt-1.5">
              <span className="flex items-center gap-2.5">
                <span className="h-6.5 w-6.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 flex items-center justify-center text-tenant-primary shrink-0 transition-colors group-hover:bg-tenant-primary group-hover:text-white">
                  <Layers size={11} />
                </span>
                <span className="text-slate-500 dark:text-zinc-400 font-medium">Povrch</span>
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold text-right">{resAttrs.surface}</span>
            </div>
          )}

          {resAttrs.equipmentList && Array.isArray(resAttrs.equipmentList) && resAttrs.equipmentList.length > 0 ? (
            <div className="flex flex-col py-1.5 border-t border-slate-200/30 dark:border-[#1F1F35]/20 mt-1.5 pt-1.5 gap-1">
              <span className="flex items-center gap-2.5">
                <span className="h-6.5 w-6.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 flex items-center justify-center text-tenant-primary shrink-0 transition-colors group-hover:bg-tenant-primary group-hover:text-white">
                  <Wrench size={11} />
                </span>
                <span className="text-slate-500 dark:text-zinc-400 font-medium">Vybavení k zapůjčení</span>
              </span>
              <div className="pl-9 space-y-1">
                {resAttrs.equipmentList.map((eq: any) => (
                  <div key={eq.id} className="flex justify-between items-center text-[10.5px]">
                    <span className="text-slate-700 dark:text-slate-350">{eq.name} <span className="text-slate-400">({eq.quantity} ks)</span></span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {eq.category === "default" ? "V ceně" : `+${eq.price} Kč`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : resAttrs.equipment ? (
            <div className="flex items-start justify-between py-1.5 border-t border-slate-200/30 dark:border-[#1F1F35]/20 mt-1.5 pt-1.5">
              <span className="flex items-center gap-2.5 shrink-0">
                <span className="h-6.5 w-6.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 flex items-center justify-center text-tenant-primary shrink-0 transition-colors group-hover:bg-tenant-primary group-hover:text-white">
                  <Wrench size={11} />
                </span>
                <span className="text-slate-500 dark:text-zinc-400 font-medium">Vybavení</span>
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold text-right leading-relaxed text-[11px] break-words pl-4 flex-1">{resAttrs.equipment}</span>
            </div>
          ) : null}

          {resAttrs.room && (
            <div className="flex items-center justify-between py-1.5 border-t border-slate-200/30 dark:border-[#1F1F35]/20 mt-1.5 pt-1.5">
              <span className="flex items-center gap-2.5">
                <span className="h-6.5 w-6.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 flex items-center justify-center text-tenant-primary shrink-0 transition-colors group-hover:bg-tenant-primary group-hover:text-white">
                  <MapPin size={11} />
                </span>
                <span className="text-slate-500 dark:text-zinc-400 font-medium">{roomLabel}</span>
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold text-right">{resAttrs.room}</span>
            </div>
          )}

          {resAttrs.instructor && (
            <div className="flex items-center justify-between py-1.5 border-t border-slate-200/30 dark:border-[#1F1F35]/20 mt-1.5 pt-1.5">
              <span className="flex items-center gap-2.5">
                <span className="h-6.5 w-6.5 rounded-none bg-tenant-primary/10 dark:bg-tenant-primary/15 flex items-center justify-center text-tenant-primary shrink-0 transition-colors group-hover:bg-tenant-primary group-hover:text-white">
                  <UserIcon size={11} />
                </span>
                <span className="text-slate-500 dark:text-zinc-400 font-medium">{instructorLabel}</span>
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold text-right">{resAttrs.instructor}</span>
            </div>
          )}
        </div>
      </div>

      {footer}
    </div>
  );
}
