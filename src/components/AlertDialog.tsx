"use client";

import React, { useState } from "react";
import { Check, AlertCircle, Info, Copy } from "lucide-react";

interface AlertDialogProps {
  isOpen: boolean;
  type: "success" | "error" | "info" | "confirm";
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  okLabel?: string;
  cancelLabel?: string;
  copyText?: string;
}

export default function AlertDialog({
  isOpen,
  type,
  title: initialTitle,
  message: initialMessage,
  onClose,
  onConfirm,
  okLabel = "Rozumím",
  cancelLabel = "Zrušit",
  copyText
}: AlertDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const transformed = type === "success"
    ? getInterestingSuccessMessage(initialTitle, initialMessage)
    : { title: initialTitle, message: initialMessage };

  const title = transformed.title;
  const message = transformed.message;

  return (
    <div className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center z-[110] p-6 animate-in fade-in duration-200">
      <style>{`
        @keyframes draw-circle {
          0% { stroke-dashoffset: 188; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes draw-check {
          0% { stroke-dashoffset: 48; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes fade-glow {
          0% { 
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); 
            border-color: rgba(16, 185, 129, 0.05);
            background-color: rgba(16, 185, 129, 0.03);
          }
          100% { 
            box-shadow: 0 0 22px 0 rgba(16, 185, 129, 0.22); 
            border-color: rgba(16, 185, 129, 0.22);
            background-color: rgba(16, 185, 129, 0.08);
          }
        }
        @keyframes fade-glow-dark {
          0% { 
            box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); 
            border-color: rgba(52, 211, 153, 0.05);
            background-color: rgba(52, 211, 153, 0.03);
          }
          100% { 
            box-shadow: 0 0 25px 0 rgba(52, 211, 153, 0.25); 
            border-color: rgba(52, 211, 153, 0.25);
            background-color: rgba(52, 211, 153, 0.1);
          }
        }
        .animate-checkmark-circle {
          stroke-dasharray: 188;
          stroke-dashoffset: 188;
          animation: draw-circle 0.65s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          stroke: #10b981;
        }
        .animate-checkmark-check {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: draw-check 0.45s cubic-bezier(0.65, 0, 0.45, 1) 0.4s forwards;
          stroke: #10b981;
        }
        .animate-success-glow {
          animation: fade-glow 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .dark .animate-success-glow {
          animation: fade-glow-dark 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .dark .animate-checkmark-check {
          stroke: #34d399;
        }
        .dark .animate-checkmark-circle {
          stroke: #10b981;
        }
      `}</style>
 
      <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-[#1F1F35] max-w-sm w-full p-7 rounded-none shadow-[0_20px_50px_rgba(112,0,255,0.15)] relative transition-all duration-300 text-center flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
        
        {/* Animated Icon Circle */}
        <div className="flex items-center justify-center">
          {type === "success" ? (
            <div className="h-16 w-16 rounded-none flex items-center justify-center border border-transparent animate-success-glow relative overflow-visible">
              <svg className="w-16 h-16" viewBox="0 0 52 52">
                <rect 
                  className="animate-checkmark-circle fill-none stroke-[2.5]" 
                  x="2.5" 
                  y="2.5" 
                  width="47" 
                  height="47" 
                />
                <path 
                  className="animate-checkmark-check fill-none stroke-[3] stroke-linecap-round stroke-linejoin-round" 
                  d="M14.1 27.2l7.1 7.2 16.7-16.8" 
                />
              </svg>
            </div>
          ) : type === "error" ? (
            <div className="h-14 w-14 rounded-none bg-rose-500/10 dark:bg-rose-500/15 flex items-center justify-center animate-[shake_0.5s_ease-in-out_infinite] shadow-[0_0_20px_rgba(244,63,94,0.2)] border border-rose-500/20">
              <AlertCircle className="text-rose-550 dark:text-rose-450" size={26} />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-none bg-purple-500/10 dark:bg-purple-500/15 flex items-center justify-center shadow-[0_0_20px_rgba(112,0,255,0.2)] border border-purple-500/20">
              <Info className="text-purple-550 dark:text-purple-400" size={26} />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 tracking-tight select-none">
          {title}
        </h3>

        {/* Description Message */}
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-xs font-semibold whitespace-pre-line -mt-1 max-w-[90%]">
          {message}
        </p>

        {/* Copy Box (if provided) */}
        {copyText && (
          <div className="w-full mt-2 text-left bg-slate-50/80 dark:bg-[#131322]/80 border border-slate-200/60 dark:border-[#1F1F35] rounded-none p-3.5 flex flex-col gap-2 relative group overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-200/40 dark:border-[#1F1F35]/40 pb-2 mb-1 select-none">
              <span className="text-[9px] text-muted-foreground font-extrabold uppercase tracking-widest">Credentials</span>
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-none transition-all cursor-pointer border text-[10px] font-bold ${
                  copied
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                    : "bg-white dark:bg-[#1C1C30] border-slate-200 dark:border-[#2E2E4A] hover:bg-slate-50 dark:hover:bg-[#25253D] text-slate-500 dark:text-slate-350 hover:text-slate-700 dark:hover:text-white shadow-sm"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={11} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="font-mono text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-350 whitespace-pre-wrap select-all font-semibold">
              {copyText}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        {onConfirm ? (
          <div className="flex gap-3 w-full mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-50 hover:bg-slate-100 dark:bg-[#131322]/50 dark:hover:bg-[#1C1C30]/50 border border-slate-200/80 dark:border-[#2A2A40] border-l-2 border-l-slate-400 dark:border-l-zinc-550 hover:border-l-tenant-primary text-slate-700 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white text-[10.5px] py-2.5 rounded-none font-extrabold uppercase tracking-widest transition-all duration-300"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 bg-tenant-primary/15 hover:bg-tenant-gradient border border-tenant-primary/30 border-l-[3px] border-l-tenant-primary text-tenant-primary dark:text-white hover:text-white text-[10.5px] py-2.5 rounded-none font-extrabold uppercase tracking-widest transition-all duration-300 shadow-md shadow-tenant-primary/10"
            >
              {okLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 bg-tenant-primary/15 hover:bg-tenant-gradient border border-tenant-primary/30 border-l-[3px] border-l-tenant-primary text-tenant-primary dark:text-white hover:text-white text-[10.5px] py-2.5 rounded-none font-extrabold uppercase tracking-widest transition-all duration-300 shadow-md shadow-tenant-primary/10"
          >
            {okLabel}
          </button>
        )}
      </div>
    </div>
  );
}

interface TransformedMessage {
  title: string;
  message: string;
}

function getInterestingSuccessMessage(title: string, message: string): TransformedMessage {
  const t = title.trim();
  const m = message.trim();

  // 1. Plan upgrades
  if (t.includes("Předplatné aktivováno") || t.includes("Předplatné")) {
    return {
      title: "Předplatné je úspěšně aktivováno",
      message: m.replace(
        /Váš plán byl úspěšně aktualizován na (.*?)(?:\!|\.|$)/,
        "Skvělá volba! Váš plán byl úspěšně povýšen na $1. Nové funkce jsou připraveny k okamžitému použití."
      )
    };
  }

  // 2. Device configuration / creation
  if (t.includes("Zařízení nakonfigurováno") || m.includes("token pro konfiguraci turniketu")) {
    const tokenMatch = m.match(/Token:\s*([^\s]+)/);
    const tokenStr = tokenMatch ? `\n\nToken: ${tokenMatch[1]}` : "";
    return {
      title: "Turniket hlásí připravenost",
      message: "Zařízení bylo úspěšně připojeno do sítě a spárováno. Nezapomeňte si bezpečně uložit tento konfigurační token:" + tokenStr
    };
  }

  // 3. Device settings update / general device success
  if (t === "Úspěch" && m.includes("Nastavení zařízení byla úspěšně uložena")) {
    return {
      title: "Zařízení šlape jako hodinky",
      message: "Veškerá nastavení odbavovacích bran a čteček byla úspěšně uložena a synchronizována."
    };
  }

  // 4. Device deleted
  if (t.includes("Zařízení smazáno") || m.includes("odbavovacího zařízení byla úspěšně odebrána")) {
    return {
      title: "Zařízení úspěšně odebráno",
      message: "Registrace zařízení byla odebrána ze systému a odpojena."
    };
  }

  // 5. Portal settings saved
  if (t.includes("Nastavení portálu uloženo") || (t.includes("Nastavení") && m.includes("portálu"))) {
    return {
      title: "Portál vyladěn k dokonalosti",
      message: "Vaše úpravy vzhledu a nastavení byly úspěšně uloženy. Změny se ihned projevily."
    };
  }

  // 6. Operating hours saved
  if (t.includes("Provozní doba uložena") || m.includes("Provozní doba byla úspěšně uložena")) {
    return {
      title: "Časový řád nastolen",
      message: "Nová provozní doba byla zapsána do systému. Návštěvníci teď přesně vědí, kdy mají dveře otevřené."
    };
  }

  // 7. Booking cancellation
  if (t.includes("Rezervace zrušena") || m.includes("stornována")) {
    const isSeries = m.includes("série") || m.includes("Celá");
    return {
      title: isSeries ? "Série zrušena & peníze vráceny" : "Rezervace zrušena & peníze vráceny",
      message: isSeries 
        ? "Celá série rezervací byla úspěšně stornována. Veškeré platby byly odeslány zpět na vaši kartu a kalendář má opět volné kapacity."
        : "Rezervace byla úspěšně stornována. Platba byla odeslána zpět na vaši kartu a částka by se měla na vašem účtu objevit během několika dní."
    };
  }

  // 8. Onboarding finished
  if (t.includes("Průvodce dokončen") || m.includes("rezervační portál byl úspěšně spuštěn")) {
    return {
      title: "Průvodce úspěšně dokončen",
      message: "Úvodní nastavení je kompletní. Váš zbrusu nový rezervační portál je oficiálně online a připraven na první zákazníky!"
    };
  }

  // 9. Profile updated
  if (t.includes("Profil aktualizován") || m.includes("Profil byl úspěšně aktualizován")) {
    return {
      title: "Vypadá to skvěle",
      message: "Vaše profilové údaje a heslo byly úspěšně uloženy. Nová vizitka je na světě."
    };
  }

  // 10. Resource saved
  if (t.includes("Zdroj uložen") || m.includes("Detaily zdroje byly úspěšně uloženy")) {
    return {
      title: "Zdroj připraven k akci",
      message: "Všechny detaily a parametry zdroje byly bezpečně uloženy. Zákazníci se už mohou začít rezervovat!"
    };
  }

  // 11. Resource deleted
  if (t.includes("Zdroj smazán") || m.includes("pravidla byla úspěšně smazána")) {
    return {
      title: "Zdroj odstraněn",
      message: "Zdroj i všechna jeho časová pravidla byla úspěšně smazána a uvolněna z databáze."
    };
  }

  // 12. Banner upload success
  if (t.includes("Nahrání úspěšné") || m.includes("obrázek banneru byl úspěšně nahrán")) {
    return {
      title: "Nový kabát pro váš portál",
      message: "Obrázek banneru byl úspěšně nahrán a okamžitě zdobí záhlaví vaší stránky."
    };
  }

  // English fallbacks for Host Dashboard
  if (t.includes("Database Re-seeded Successfully")) {
    return {
      title: "Test database refreshed",
      message: "All database tables have been re-seeded to factory defaults. Custom bookings and profiles reset."
    };
  }
  if (t.includes("Tenant Created Successfully")) {
    return {
      title: "A new tenant is born",
      message: "The tenant profile has been successfully generated and is ready for system onboarding."
    };
  }
  if (t.includes("Tenant Saved Successfully")) {
    return {
      title: "Tenant parameters locked in",
      message: "The tenant configurations have been successfully saved to the central registry."
    };
  }
  if (t.includes("Tenant Deleted")) {
    return {
      title: "Tenant completely erased",
      message: "The tenant and all associated data, settings, and bookings have been permanently removed."
    };
  }
  if (t.includes("User Account Saved")) {
    return {
      title: "System account updated",
      message: "The system user account credentials and roles have been successfully saved."
    };
  }
  if (t.includes("Account Deleted")) {
    return {
      title: "Account permanently removed",
      message: "The system account has been successfully deleted from the authentication table."
    };
  }
  if (t.includes("Billing Simulation Event Dispatched")) {
    return {
      title: "Simulation dispatched",
      message: message
    };
  }

  // If no match, add a touch of flavor anyway
  if (t === "Úspěch") {
    return {
      title: "Skvělá zpráva",
      message: message || "Vše proběhlo naprosto hladce a bez chybičky."
    };
  }

  return { title, message };
}

