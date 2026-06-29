"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Calendar, Clock, User, Mail, ShieldCheck, ArrowLeft, Check, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/translations";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

let stripePromiseCache: any = null;
const getStripe = (publishableKey: string) => {
  if (!stripePromiseCache) {
    stripePromiseCache = loadStripe(publishableKey);
  }
  return stripePromiseCache;
};

interface SerializedBooking {
  id: string;
  resourceName: string;
  userName: string;
  userEmail: string;
  reservedFrom: string;
  reservedTo: string;
  status: string;
  price: string;
  rentedEquipment?: any[] | null;
}

interface CheckoutClientProps {
  tenantId: string;
  tenantName: string;
  booking: SerializedBooking;
  theme: any;
  locale?: string;
  currency?: string;
  initialStripeEnabled?: boolean;
  initialClientSecret?: string;
  initialPublishableKey?: string;
}

export default function CheckoutClient({ 
  tenantId, 
  tenantName, 
  booking, 
  theme, 
  locale = "cs-CZ", 
  currency = "CZK",
  initialStripeEnabled = false,
  initialClientSecret = "",
  initialPublishableKey = "",
}: CheckoutClientProps) {
  // Use server pre-fetched values if available to load Stripe Elements instantly
  const [stripeEnabled, setStripeEnabled] = useState<boolean | null>(
    initialClientSecret ? true : initialStripeEnabled ? true : null
  );
  const [clientSecret, setClientSecret] = useState<string>(initialClientSecret);
  const [publishableKey, setPublishableKey] = useState<string>(initialPublishableKey);
  const [isLoadingStripe, setIsLoadingStripe] = useState<boolean>(
    initialClientSecret ? false : (initialStripeEnabled === false ? false : true)
  );

  // Simulator state
  const [cardName, setCardName] = useState(booking.userName || "");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentStage, setPaymentStage] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch Stripe Intent client-side ONLY if it wasn't pre-created on the server
  useEffect(() => {
    if (initialClientSecret) {
      return;
    }

    async function initializePayment() {
      try {
        const response = await fetch("/api/bookings/pay/stripe-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.id }),
        });
        const data = await response.json();
        
        if (data.status === "error") {
          console.warn("Payment initialization warning (Stripe disabled):", data.message);
          setStripeEnabled(false);
          return;
        }
        
        if (data.stripeEnabled) {
          setStripeEnabled(true);
          setClientSecret(data.clientSecret);
          setPublishableKey(data.publishableKey);
        } else {
          setStripeEnabled(false);
        }
      } catch (e) {
        console.error("Failed to fetch stripe intent, falling back to simulator:", e);
        setStripeEnabled(false);
      } finally {
        setIsLoadingStripe(false);
      }
    }
    initializePayment();
  }, [booking.id, initialClientSecret]);

  const handleCancelAndBack = async () => {
    setIsCancelling(true);
    try {
      await fetch(`/api/bookings?bookingId=${booking.id}`, {
        method: "DELETE"
      });
    } catch (e) {
      console.error("Failed to cancel pending booking on back action:", e);
    }
    window.location.href = `/tenants/${tenantId}`;
  };

  // Auto-redirect if already paid
  useEffect(() => {
    if (booking.status === "CONFIRMED" || booking.status === "ATTENDED") {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = `/tenants/${tenantId}/dashboard`;
      }, 1500);
    }
  }, [booking.status, tenantId]);

  // Mask card number as XXXX XXXX XXXX XXXX
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.substring(0, 16);
    const matches = value.match(/\d{1,4}/g);
    const matchString = matches ? matches.join(" ") : "";
    setCardNumber(matchString);
  };

  // Mask expiry as MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.substring(0, 4);
    if (value.length > 2) {
      value = value.substring(0, 2) + "/" + value.substring(2);
    }
    setExpiry(value);
  };

  // Mask CVV as 3-digit
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").substring(0, 3);
    setCvv(value);
  };

  const handleSimulatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!cardName.trim() || !cardNumber || !expiry || !cvv) {
      setError("Vyplňte prosím všechny platební údaje.");
      setIsSubmitting(false);
      return;
    }

    if (cardNumber.replace(/\s/g, "").length < 15) {
      setError("Číslo platební karty musí mít alespoň 15 nebo 16 číslic.");
      setIsSubmitting(false);
      return;
    }

    if (expiry.length < 5) {
      setError("Neplatný formát data expirace (použijte MM/YY).");
      setIsSubmitting(false);
      return;
    }

    if (cvv.length < 3) {
      setError("Neplatný formát CVV (3 číslice).");
      setIsSubmitting(false);
      return;
    }

    try {
      setPaymentStage("Navazování zabezpečeného spojení...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      setPaymentStage("Autorizace platby u banky...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      setPaymentStage("Ověřování 3D Secure protokolu...");
      await new Promise((resolve) => setTimeout(resolve, 500));

      setPaymentStage("Dokončování transakce...");

      const res = await fetch("/api/bookings/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          cardName,
          cardNumber: cardNumber.replace(/\s/g, ""),
          expiry,
          cvv,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Platba se nezdařila. Zkontrolujte údaje.");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = `/tenants/${tenantId}/dashboard`;
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("Spojení se serverem selhalo. Zkuste to prosím znovu.");
      setIsSubmitting(false);
    }
  };

  const fromDate = new Date(booking.reservedFrom);
  const toDate = new Date(booking.reservedTo);

  const formattedDate = fromDate.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = `${String(fromDate.getUTCHours()).padStart(2, "0")}:${String(fromDate.getUTCMinutes()).padStart(2, "0")} – ${String(toDate.getUTCHours()).padStart(2, "0")}:${String(toDate.getUTCMinutes()).padStart(2, "0")}`;

  const stripeAppearance = {
    theme: 'flat' as const,
    variables: {
      colorPrimary: theme.primary,
      fontFamily: 'Inter, system-ui, sans-serif',
      borderRadius: '0px',
    },
  };

  if (success) {
    return (
      <div className="w-full max-w-md p-8 rounded-none bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-xl dark:shadow-2xl flex flex-col items-center justify-center text-center gap-6 animate-fade-in transition-colors duration-250">
        <div className="h-16 w-16 bg-emerald-500/10 rounded-none flex items-center justify-center border border-emerald-500/20 text-emerald-400">
          <Check size={36} className="animate-scale-in" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Platba byla úspěšná!</h2>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-2">Přesměrovávám vás na přehled vašich rezervací...</p>
        </div>
        <Loader2 className="animate-spin text-tenant-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in px-4">
      
      {/* HEADER SECTION (Full Width - Corrects misalignment) */}
      <div className="flex flex-col gap-4">
        <div>
          <button 
            onClick={handleCancelAndBack}
            disabled={isCancelling || isSubmitting}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors select-none group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            )}
            Zpět do kalendáře (zrušit rezervaci)
          </button>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-tenant-primary font-bold uppercase tracking-widest">{theme.verticalName}</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{tenantName}</h1>
          <p className="text-xs text-slate-550 dark:text-slate-400">{theme.tagline}</p>
        </div>
      </div>

      {/* GRID SECTION (Perfectly Aligned equal-height cards) */}
      <div className="grid md:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN: Booking Details Card */}
        <div className="md:col-span-5">
          <div className="h-full p-6 md:p-8 rounded-none bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-lg dark:shadow-xl space-y-6 transition-colors duration-250 flex flex-col justify-between">
            <div className="space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-550 dark:text-slate-450 border-b border-slate-150 dark:border-white/10 pb-2">
                Detaily rezervace
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Sparkles className="text-tenant-primary shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-medium">Zdroj / Místo</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{booking.resourceName}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Calendar className="text-tenant-primary shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-medium">Datum konání</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white capitalize">{formattedDate}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Clock className="text-tenant-primary shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-medium">Časový úsek</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{formattedTime} (UTC)</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <User className="text-tenant-primary shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-medium">Rezervováno na</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{booking.userName}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 flex items-center gap-1">
                      <Mail size={10} />
                      {booking.userEmail}
                    </span>
                  </div>
                </div>
                
                {booking.rentedEquipment && Array.isArray(booking.rentedEquipment) && booking.rentedEquipment.length > 0 && (
                  <div className="border-t border-slate-150 dark:border-white/10 pt-4 space-y-2">
                    <span className="text-[10px] text-slate-550 dark:text-slate-400 block uppercase font-medium">Zapůjčené vybavení</span>
                    <div className="space-y-1.5 pl-1">
                      {booking.rentedEquipment.map((eq: any) => (
                        <div key={eq.id} className="flex justify-between items-center text-xs">
                          <span className="text-slate-700 dark:text-slate-350">{eq.name} <span className="text-slate-400">({eq.quantity} ks)</span></span>
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {eq.category === "default" ? "V ceně" : `+${formatCurrency(eq.price * eq.quantity, currency, locale)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Row */}
            <div className="border-t border-slate-150 dark:border-white/10 pt-4 flex justify-between items-center mt-6">
              <span className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">Celkem k úhradě</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(booking.price, currency, locale)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Payment Form Card */}
        <div className="md:col-span-7">
          <div className="h-full p-6 md:p-8 rounded-none bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-lg dark:shadow-xl space-y-6 transition-colors duration-250 flex flex-col justify-center">
            
            {isLoadingStripe ? (
              <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 text-slate-500 dark:text-slate-400">
                <Loader2 className="animate-spin text-tenant-primary" size={32} />
                <span className="text-xs font-semibold">Příprava zabezpečeného platebního rozhraní...</span>
              </div>
            ) : stripeEnabled && clientSecret ? (
              // Render Stripe Checkout UI
              <Elements 
                stripe={getStripe(publishableKey)} 
                options={{ 
                  clientSecret, 
                  locale: locale.startsWith("cs") ? "cs" : "en", 
                  appearance: stripeAppearance 
                }}
              >
                <StripePaymentForm 
                  booking={booking} 
                  tenantId={tenantId}
                  currency={currency}
                  locale={locale}
                  setSuccess={setSuccess}
                />
              </Elements>
            ) : (
              // Fallback to legacy payment simulator
              <>
                <div className="flex justify-between items-center gap-4 border-b border-slate-150 dark:border-white/10 pb-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Platební brána</h2>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Bezpečná simulovaná platba platební kartou.</p>
                  </div>
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 dark:text-amber-400 font-extrabold uppercase tracking-wider px-2 py-1 border border-amber-500/20 select-none">
                    Simulator Mode
                  </span>
                </div>

                {/* Quick Simulator Auto-fill button */}
                <button
                  type="button"
                  onClick={() => {
                    setCardName(booking.userName || "Jakub Lustyk");
                    setCardNumber("4242 4242 4242 4242");
                    setExpiry("12/29");
                    setCvv("123");
                  }}
                  style={{ color: theme.primary, borderColor: `${theme.primary}40`, backgroundColor: `${theme.primary}08` }}
                  className="w-full py-2.5 hover:opacity-85 text-xs font-bold uppercase tracking-wider transition-all border rounded-none cursor-pointer flex items-center justify-center gap-2 select-none"
                >
                  <Sparkles size={14} className="animate-pulse" />
                  Automaticky vyplnit testovací kartu
                </button>

                {error && (
                  <div className="p-3 rounded-none bg-rose-500/10 border border-rose-500/20 text-rose-450 dark:text-rose-400 text-xs font-medium animate-in fade-in duration-200 flex items-center gap-2">
                    <AlertCircle size={14} className="text-rose-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSimulatorSubmit} className="space-y-4">
                  {/* Card Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Jméno na kartě</label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3.5 text-slate-400 dark:text-slate-500" size={16} />
                      <input
                        type="text"
                        required
                        name="ccname"
                        autoComplete="cc-name"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Jan Novák"
                        className="w-full bg-slate-50 dark:bg-[#0D0D15]/85 border border-slate-200 dark:border-white/10 rounded-none py-3 pl-11 pr-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-650"
                      />
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Číslo platební karty</label>
                    <div className="relative flex items-center">
                      <CreditCard className="absolute left-3.5 text-slate-400 dark:text-slate-500" size={16} />
                      <input
                        type="text"
                        required
                        name="cardnumber"
                        autoComplete="cc-number"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4242 4242 4242 4242"
                        className="w-full bg-slate-50 dark:bg-[#0D0D15]/85 border border-slate-200 dark:border-white/10 rounded-none py-3 pl-11 pr-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-650 font-mono tracking-widest"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Expiration Date */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Expirace</label>
                      <input
                        type="text"
                        required
                        name="ccexp"
                        autoComplete="cc-exp"
                        value={expiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full bg-slate-50 dark:bg-[#0D0D15]/85 border border-slate-200 dark:border-white/10 rounded-none py-3 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-650 font-mono text-center"
                      />
                    </div>

                    {/* CVV - Fixed autofill bug (using type="tel" and cc-csc autocomplete avoids credential manager hijack) */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">CVV / CVC</label>
                      <input
                        type="tel"
                        required
                        name="cvc"
                        autoComplete="cc-csc"
                        maxLength={3}
                        value={cvv}
                        onChange={handleCvvChange}
                        placeholder="•••"
                        className="w-full bg-slate-50 dark:bg-[#0D0D15]/85 border border-slate-200 dark:border-white/10 rounded-none py-3 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-650 font-mono text-center tracking-widest"
                      />
                    </div>
                  </div>

                  {/* Secure Badge */}
                  <div className="flex items-center gap-2 text-[10px] text-slate-550 dark:text-zinc-500 py-1.5 select-none">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span>Bezpečné spojení zajištěno standardem SSL.</span>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-tenant-gradient hover:opacity-95 text-white text-xs font-extrabold uppercase tracking-widest rounded-none transition-all shadow-md shadow-tenant-primary/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        {paymentStage}
                      </>
                    ) : (
                      <>
                        Zaplatit {formatCurrency(booking.price, currency, locale)}
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

interface StripePaymentFormProps {
  booking: SerializedBooking;
  tenantId: string;
  currency: string;
  locale: string;
  setSuccess: (success: boolean) => void;
}

function StripePaymentForm({ booking, tenantId, currency, locale, setSuccess }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStage, setPaymentStage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    try {
      setPaymentStage("Navazování zabezpečeného spojení...");
      // Elements submit triggers validation inside Stripe fields
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Chyba při validaci platebních údajů.");
        setIsSubmitting(false);
        return;
      }

      setPaymentStage("Zpracování platby bankou...");
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tenants/${tenantId}/dashboard?bookingId=${booking.id}&stripe_success=true`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Platba se nezdařila.");
        setIsSubmitting(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        setPaymentStage("Dokončování transakce...");
        setSuccess(true);
        setTimeout(() => {
          window.location.href = `/tenants/${tenantId}/dashboard?success=true`;
        }, 1500);
      } else {
        // Redirection will occur automatically for 3D Secure verification
        setPaymentStage("Přesměrovávání k ověření platby...");
      }
    } catch (err: any) {
      console.error("Stripe confirm error:", err);
      setError(err?.message || "Došlo k neočekávané chybě při placení.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center gap-4 border-b border-slate-150 dark:border-white/10 pb-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Platební brána</h2>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Bezpečné online placení platební kartou.</p>
        </div>
        <span className="text-[9px] bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-extrabold uppercase tracking-wider px-2 py-1 border border-emerald-500/20 select-none">
          Stripe Secured
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-none bg-rose-500/10 border border-rose-500/20 text-rose-450 dark:text-rose-400 text-xs font-medium animate-in fade-in duration-200 flex items-center gap-2">
          <AlertCircle size={14} className="text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stripe Payment Element container */}
      <div className="p-4 bg-slate-50 dark:bg-[#0D0D15]/85 border border-slate-200 dark:border-white/10 rounded-none">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-550 dark:text-zinc-500 py-1.5 select-none">
        <ShieldCheck size={14} className="text-emerald-500" />
        <span>Bezpečné spojení zajištěno šifrováním Stripe.</span>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !stripe}
        className="w-full py-3.5 bg-tenant-gradient hover:opacity-95 text-white text-xs font-extrabold uppercase tracking-widest rounded-none transition-all shadow-md shadow-tenant-primary/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" size={14} />
            {paymentStage}
          </>
        ) : (
          <>
            Zaplatit {formatCurrency(booking.price, currency, locale)}
          </>
        )}
      </button>
    </form>
  );
}
