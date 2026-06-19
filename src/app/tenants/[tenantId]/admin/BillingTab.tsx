"use client";

import React, { useState } from "react";
import { Plus, Edit, Trash, CreditCard, Users, FileText, Calendar, Clock, DollarSign, ArrowRight, Eye, Check, X, ShieldAlert, BadgePercent } from "lucide-react";
import Link from "next/link";

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  companyId: string | null;
  vatId: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressZip: string | null;
  addressCountry: string | null;
  discount: number;
  active: boolean;
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  amount: string;
  partnerName: string;
  partnerId: string;
  bookingsCount: number;
}

interface Booking {
  id: string;
  resourceId: string;
  resourceName: string;
  userName: string;
  userEmail: string;
  reservedFrom: string;
  reservedTo: string;
  status: string;
  price: string;
  partnerId: string | null;
  partnerName: string | null;
  invoiceId: string | null;
  createdAt: string;
}

interface BillingTabProps {
  tenant: {
    id: string;
    name: string;
    vertical: string;
  };
  partners: Partner[];
  invoices: Invoice[];
  bookings: Booking[];
  router: any;
  theme: any;
  onModalToggle?: (open: boolean) => void;
}

export default function BillingTab({ tenant, partners, invoices, bookings, router, theme, onModalToggle }: BillingTabProps) {
  const [subTab, setSubTab] = useState<"overview" | "partners" | "invoices">("overview");

  // Partner Form State
  const [partnerModal, setPartnerModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data: Partial<Partner>;
  }>({
    open: false,
    mode: "add",
    data: {},
  });

  // Invoice Wizard State
  const [invoiceWizard, setInvoiceWizard] = useState<{
    open: boolean;
    partnerId: string;
    startDate: string;
    endDate: string;
    previewBookings: Booking[];
    calculatedTotal: number;
    error: string | null;
    loading: boolean;
  }>({
    open: false,
    partnerId: "",
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    previewBookings: [],
    calculatedTotal: 0,
    error: null,
    loading: false,
  });

  // Notify parent when any modal opens/closes
  React.useEffect(() => {
    onModalToggle?.(partnerModal.open || invoiceWizard.open);
  }, [partnerModal.open, invoiceWizard.open, onModalToggle]);

  // Calculate stats
  const totalInvoiced = invoices
    .filter(i => i.status !== "CANCELLED")
    .reduce((sum, i) => sum + parseFloat(i.amount), 0);

  const totalPaid = invoices
    .filter(i => i.status === "PAID")
    .reduce((sum, i) => sum + parseFloat(i.amount), 0);

  const totalUnpaid = invoices
    .filter(i => i.status === "SENT" || i.status === "DRAFT")
    .reduce((sum, i) => sum + parseFloat(i.amount), 0);

  // Handle Partner Form Submission
  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = partnerModal.data;
    if (!data.name || !data.email) return;

    try {
      const isAdd = partnerModal.mode === "add";
      const url = "/api/admin/partners";
      const method = isAdd ? "POST" : "PATCH";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          tenantId: tenant.id,
          discount: parseInt(String(data.discount || "0"), 10),
        }),
      });

      if (res.ok) {
        setPartnerModal({ open: false, mode: "add", data: {} });
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Deactivate Partner
  const handlePartnerDeactivate = async (id: string) => {
    if (!confirm("Opravdu chcete tohoto partnera deaktivovat? Budoucí automatická fakturace bude pozastavena.")) return;
    try {
      const res = await fetch(`/api/admin/partners?id=${id}&tenantId=${tenant.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Preview bookings for invoicing
  const handleFetchUninvoicedBookings = () => {
    const { partnerId, startDate, endDate } = invoiceWizard;
    if (!partnerId || !startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate + "T23:59:59.999Z");

    const filtered = bookings.filter(b => {
      return (
        b.partnerId === partnerId &&
        !b.invoiceId &&
        (b.status === "CONFIRMED" || b.status === "ATTENDED") &&
        new Date(b.reservedFrom) >= start &&
        new Date(b.reservedFrom) <= end
      );
    });

    const partnerObj = partners.find(p => p.id === partnerId);
    const discountPercent = partnerObj?.discount || 0;

    const total = filtered.reduce((sum, b) => sum + parseFloat(b.price), 0);

    setInvoiceWizard(prev => ({
      ...prev,
      previewBookings: filtered,
      calculatedTotal: total,
      error: filtered.length === 0 ? "Nebyly nalezeny žádné nevyfakturované rezervace ve vybraném období." : null,
    }));
  };

  // Generate Invoice
  const handleGenerateInvoice = async () => {
    const { partnerId, startDate, endDate, previewBookings } = invoiceWizard;
    if (previewBookings.length === 0) return;

    setInvoiceWizard(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant.id,
          partnerId,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate + "T23:59:59.999Z").toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInvoiceWizard(prev => ({ ...prev, error: data.message || "Fakturu se nepodařilo vygenerovat.", loading: false }));
        return;
      }

      setInvoiceWizard({
        open: false,
        partnerId: "",
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        previewBookings: [],
        calculatedTotal: 0,
        error: null,
        loading: false,
      });

      router.refresh();
      setSubTab("invoices");
    } catch (err) {
      console.error(err);
      setInvoiceWizard(prev => ({ ...prev, error: "Chyba připojení k serveru.", loading: false }));
    }
  };

  // Update Invoice Status
  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoiceId,
          tenantId: tenant.id,
          status: newStatus,
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activePartners = partners.filter(p => p.active);

  return (
    <div className="space-y-6 text-xs">
      
      {/* Tab Navigation header */}
      <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none bg-white/5 p-1 rounded-2xl w-full md:w-fit select-none gap-1 border-b border-slate-200/20">
        <button
          onClick={() => setSubTab("overview")}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
            subTab === "overview" ? "bg-tenant-gradient text-white shadow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Přehled financí
        </button>
        <button
          onClick={() => setSubTab("partners")}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
            subTab === "partners" ? "bg-tenant-gradient text-white shadow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Korporátní partneři ({activePartners.length})
        </button>
        <button
          onClick={() => setSubTab("invoices")}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
            subTab === "invoices" ? "bg-tenant-gradient text-white shadow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Faktury a Invoicing ({invoices.length})
        </button>
      </div>

      {/* SUBTAB 1: OVERVIEW */}
      {subTab === "overview" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-5">
            <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block">Fakturováno celkem</span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight mt-1 block">
                  {totalInvoiced.toLocaleString("cs-CZ")} Kč
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-tenant-primary/10 text-tenant-primary">
                <FileText size={20} />
              </div>
            </div>

            <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block">Uhrazeno</span>
                <span className="text-2xl font-black text-emerald-500 tracking-tight mt-1 block">
                  {totalPaid.toLocaleString("cs-CZ")} Kč
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Check size={20} />
              </div>
            </div>

            <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 backdrop-blur-xl border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider block">K úhradě (Draft/Odeslané)</span>
                <span className="text-2xl font-black text-amber-500 tracking-tight mt-1 block">
                  {totalUnpaid.toLocaleString("cs-CZ")} Kč
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500">
                <DollarSign size={20} />
              </div>
            </div>
          </div>

          {/* Quick Info card */}
          <div className="p-6 bg-white/45 dark:bg-[#0D0D15]/40 border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl space-y-4">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <CreditCard className="text-tenant-primary" size={16} />
              Jak funguje partnerství a fakturace
            </h4>
            <div className="grid md:grid-cols-3 gap-6 text-slate-500 dark:text-zinc-400 leading-relaxed text-[11px]">
              <div className="space-y-1">
                <h5 className="font-bold text-foreground">1. Registrace a sleva</h5>
                <p>Zaregistrujte firmu jako partnera a nastavte jí smluvní slevu v %. Rezervace provedené pod tímto partnerem budou automaticky poníženy o slevu.</p>
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-foreground">2. Rezervace bez plateb</h5>
                <p>Rezervace provedené administrátorem pro partnera nebo rezervace prováděné přes partnerský účet jsou ihned schváleny bez nutnosti okamžité online platby kartou.</p>
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-foreground">3. Měsíční fakturace</h5>
                <p>Na konci období vyberte partnera, zadejte rozsah (např. celý měsíc) a jedním kliknutím vygenerujte zúčtovací fakturu. Všechny rezervace se uzamknou pod danou fakturou.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PARTNERS LIST */}
      {subTab === "partners" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-foreground">Seznam korporátních partnerů ({activePartners.length})</h3>
            <button
              onClick={() => setPartnerModal({
                open: true,
                mode: "add",
                data: { name: "", email: "", phone: "", companyId: "", vatId: "", discount: 0, active: true }
              })}
              className="hidden md:flex bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-xs py-2.5 px-4 rounded-xl font-bold shadow-md shadow-tenant-primary/10 items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              Zaregistrovat partnera
            </button>
            <button
              onClick={() => setPartnerModal({
                open: true,
                mode: "add",
                data: { name: "", email: "", phone: "", companyId: "", vatId: "", discount: 0, active: true }
              })}
              className="flex md:hidden p-2.5 bg-tenant-primary/10 text-tenant-primary border border-tenant-primary/20 rounded-xl active:scale-95 transition-all cursor-pointer items-center justify-center shadow-sm"
              title="Zaregistrovat partnera"
            >
              <Plus size={16} />
            </button>
          </div>

          {activePartners.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-zinc-450 border border-slate-200/50 dark:border-[#1F1F35] bg-white/45 dark:bg-[#0D0D15]/40 rounded-3xl font-mono">
              Zatím nejsou registrováni žádní partneři. Klikněte na tlačítko výše pro registraci prvního partnera.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {activePartners.map(partner => {
                const partnerBookings = bookings.filter(b => b.partnerId === partner.id);
                const uninvoiced = partnerBookings.filter(b => !b.invoiceId);
                return (
                  <div key={partner.id} className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 border border-slate-200/50 dark:border-[#1F1F35] border-l-[4px] border-l-tenant-primary rounded-2xl flex flex-col justify-between group shadow-sm hover:scale-[1.01] hover:border-tenant-primary/20 hover:shadow-md transition-all duration-300">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold uppercase tracking-wider">
                          Aktivní
                        </span>
                        {partner.discount > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary font-extrabold flex items-center gap-1">
                            <BadgePercent size={12} />
                            Sleva {partner.discount}%
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-base text-foreground leading-tight">{partner.name}</h4>
                      
                      <div className="space-y-1 text-slate-500 dark:text-zinc-450 text-[11px] leading-relaxed">
                        <p>E-mail pro fakturaci: <strong className="text-foreground">{partner.email}</strong></p>
                        {partner.phone && <p>Telefon: <span className="text-foreground">{partner.phone}</span></p>}
                        {(partner.companyId || partner.vatId) && (
                          <p className="font-mono text-[10px]">
                            {partner.companyId && `IČO: ${partner.companyId}`}
                            {partner.companyId && partner.vatId && " | "}
                            {partner.vatId && `DIČ: ${partner.vatId}`}
                          </p>
                        )}
                        {partner.addressStreet && (
                          <p>Adresa: <span className="text-foreground">{partner.addressStreet}, {partner.addressCity} ({partner.addressZip})</span></p>
                        )}
                      </div>

                      <div className="bg-slate-200/10 dark:bg-black/10 p-3 rounded-xl grid grid-cols-2 gap-4 border border-slate-200/30 dark:border-[#1F1F35]/20 mt-2">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase font-bold block">Celkem rezervací</span>
                          <span className="text-sm font-black text-foreground">{partnerBookings.length}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase font-bold block">K fakturaci</span>
                          <span className="text-sm font-black text-amber-500">{uninvoiced.length} rezervací</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-200/30 dark:border-[#1F1F35]/30 pt-4 mt-4 select-none">
                      <button
                        onClick={() => setInvoiceWizard({
                          open: true,
                          partnerId: partner.id,
                          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                          endDate: new Date().toISOString().split("T")[0],
                          previewBookings: [],
                          calculatedTotal: 0,
                          error: null,
                          loading: false,
                        })}
                        className="bg-tenant-primary/10 text-tenant-primary hover:bg-tenant-primary hover:text-white transition-all text-xs font-bold py-2.5 px-3.5 md:text-[11px] md:px-3 md:py-1.5 rounded-xl border border-tenant-primary/20 flex items-center gap-1.5 cursor-pointer"
                        disabled={uninvoiced.length === 0}
                        title={uninvoiced.length === 0 ? "Žádné nevyfakturované lekce" : "Fakturovat lekce"}
                      >
                        <FileText className="h-4 w-4 md:h-3.5 md:w-3.5" />
                        Vyfakturovat
                      </button>
                      <button
                        onClick={() => setPartnerModal({
                          open: true,
                          mode: "edit",
                          data: partner
                        })}
                        className="p-3 md:p-2 bg-slate-200/35 hover:bg-slate-200/50 dark:bg-[#131322]/40 dark:hover:bg-[#1F1F35]/65 text-slate-600 dark:text-zinc-300 border border-slate-200/50 dark:border-[#1F1F35] rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title="Upravit profil partnera"
                      >
                        <Edit className="h-4 w-4 md:h-3 md:w-3" />
                      </button>
                      <button
                        onClick={() => handlePartnerDeactivate(partner.id)}
                        className="p-3 md:p-2 bg-slate-200/35 hover:bg-red-500/10 dark:bg-[#131322]/40 dark:hover:bg-red-500/15 text-rose-500 border border-slate-200/50 dark:border-[#1F1F35] rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title="Deaktivovat partnera"
                      >
                        <Trash className="h-4 w-4 md:h-3 md:w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: INVOICES LIST */}
      {subTab === "invoices" && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="font-bold text-sm text-foreground">Vystavené faktury a zúčtování ({invoices.length})</h3>

          {invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-zinc-450 border border-slate-200/50 dark:border-[#1F1F35] bg-white/45 dark:bg-[#0D0D15]/40 rounded-3xl font-mono">
              Zatím nebyly vystaveny žádné faktury. Vygenerujte fakturu pro některého z partnerů.
            </div>
          ) : (
            <div>
              {/* Desktop View Table */}
              <div className="hidden md:block border border-slate-200/40 dark:border-[#1F1F35]/40 bg-white/30 dark:bg-black/15 rounded-2xl overflow-x-auto scrollbar-none">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-200/35 dark:bg-[#08080E]/70 border-b border-slate-200/50 dark:border-[#1F1F35] text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">
                      <th className="p-4">Číslo faktury</th>
                      <th className="p-4">Partner</th>
                      <th className="p-4">Datum vystavení</th>
                      <th className="p-4">Splatnost</th>
                      <th className="p-4">Počet lekcí</th>
                      <th className="p-4">Celková částka</th>
                      <th className="p-4">Stav</th>
                      <th className="p-4 text-right">Akce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/20 dark:divide-[#1F1F35]/35">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono font-bold text-foreground">{inv.number}</td>
                        <td className="p-4 font-semibold text-foreground">{inv.partnerName}</td>
                        <td className="p-4 text-slate-500 dark:text-zinc-400">{new Date(inv.issueDate).toLocaleDateString("cs-CZ")}</td>
                        <td className="p-4 text-slate-500 dark:text-zinc-400">{new Date(inv.dueDate).toLocaleDateString("cs-CZ")}</td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-300">{inv.bookingsCount}</td>
                        <td className="p-4 font-black text-foreground">{parseFloat(inv.amount).toLocaleString("cs-CZ")} Kč</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            inv.status === "PAID" 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : inv.status === "SENT"
                              ? "bg-sky-500/10 text-sky-500 border-sky-500/20"
                              : inv.status === "CANCELLED"
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}>
                            {inv.status === "PAID" ? "Uhrazeno" : inv.status === "SENT" ? "Odesláno" : inv.status === "CANCELLED" ? "Zrušeno" : "Návrh (Draft)"}
                          </span>
                        </td>
                        <td className="p-4 text-right select-none space-x-1.5">
                          <Link
                            href={`/tenants/${tenant.id}/admin/invoices/${inv.id}`}
                            target="_blank"
                            className="inline-flex p-1.5 bg-slate-200/40 hover:bg-slate-200/80 dark:bg-[#131322]/40 dark:hover:bg-[#1F1F35] text-slate-700 dark:text-zinc-300 border border-slate-200/50 dark:border-[#1F1F35] rounded-lg transition-all"
                            title="Zobrazit fakturu pro tisk"
                          >
                            <Eye size={12} />
                          </Link>
                          {inv.status === "DRAFT" && (
                            <button
                              onClick={() => handleUpdateInvoiceStatus(inv.id, "SENT")}
                              className="p-1 px-2 bg-sky-500/10 hover:bg-sky-500 text-sky-500 hover:text-white border border-sky-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Odeslat
                            </button>
                          )}
                          {(inv.status === "SENT" || inv.status === "DRAFT") && (
                            <button
                              onClick={() => handleUpdateInvoiceStatus(inv.id, "PAID")}
                              className="p-1 px-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Uhradit
                            </button>
                          )}
                          {inv.status !== "CANCELLED" && (
                            <button
                              onClick={() => handleUpdateInvoiceStatus(inv.id, "CANCELLED")}
                              className="p-1 px-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Stornovat
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View List */}
              <div className="block md:hidden space-y-3">
                {invoices.map(inv => (
                  <div key={inv.id} className="p-4 bg-white/45 dark:bg-[#0D0D15]/40 border border-slate-200/50 dark:border-[#1F1F35] rounded-2xl space-y-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold block">Číslo faktury</span>
                        <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{inv.number}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        inv.status === "PAID" 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : inv.status === "SENT"
                          ? "bg-sky-500/10 text-sky-500 border-sky-500/20"
                          : inv.status === "CANCELLED"
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}>
                        {inv.status === "PAID" ? "Uhrazeno" : inv.status === "SENT" ? "Odesláno" : inv.status === "CANCELLED" ? "Zrušeno" : "Draft"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold block">Partner</span>
                      <div className="text-xs font-bold text-slate-700 dark:text-zinc-300">{inv.partnerName}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] border-t border-slate-100 dark:border-white/[0.04] pt-2.5">
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold block">Vystaveno</span>
                        <span className="text-slate-700 dark:text-zinc-300 font-medium">{new Date(inv.issueDate).toLocaleDateString("cs-CZ")}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold block">Splatnost</span>
                        <span className="text-slate-700 dark:text-zinc-300 font-medium">{new Date(inv.dueDate).toLocaleDateString("cs-CZ")}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold block">Lekce</span>
                        <span className="text-slate-700 dark:text-zinc-300 font-bold">{inv.bookingsCount}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-white/[0.04] pt-2.5 mt-1 select-none">
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold block">Celkem</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">{parseFloat(inv.amount).toLocaleString("cs-CZ")} Kč</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/tenants/${tenant.id}/admin/invoices/${inv.id}`}
                          target="_blank"
                          className="inline-flex p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#131322]/40 dark:hover:bg-[#1F1F35] text-slate-600 dark:text-zinc-300 border border-slate-200/50 dark:border-white/5 rounded-lg transition-all"
                          title="Zobrazit fakturu"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {inv.status === "DRAFT" && (
                          <button
                            onClick={() => handleUpdateInvoiceStatus(inv.id, "SENT")}
                            className="py-2 px-3.5 bg-sky-500/10 hover:bg-sky-500 text-sky-500 hover:text-white border border-sky-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            Odeslat
                          </button>
                        )}
                        {(inv.status === "SENT" || inv.status === "DRAFT") && (
                          <button
                            onClick={() => handleUpdateInvoiceStatus(inv.id, "PAID")}
                            className="py-2 px-3.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            Uhradit
                          </button>
                        )}
                        {inv.status !== "CANCELLED" && (
                          <button
                            onClick={() => handleUpdateInvoiceStatus(inv.id, "CANCELLED")}
                            className="py-2 px-3.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            Stornovat
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Partner Register Modal */}
      {partnerModal.open && (
        <div className="fixed inset-0 bg-[#05050A]/70 backdrop-blur-md flex md:items-center md:justify-center p-0 md:p-4 z-50 animate-fade-in select-none">
          <div className="bg-[#0D0D15] border-0 md:border border-white/10 p-5 sm:p-6 rounded-none md:rounded-3xl w-full max-w-lg h-full md:h-auto max-h-full md:max-h-[90vh] shadow-2xl space-y-5 relative overflow-y-auto scrollbar-none">
            <button
              onClick={() => setPartnerModal({ open: false, mode: "add", data: {} })}
              className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-sm font-bold text-white">
                {partnerModal.mode === "add" ? "Registrovat nového partnera" : "Upravit profil partnera"}
              </h3>
              <p className="text-slate-400 text-[11px] mt-0.5">Konfigurujte detaily a zúčtování pro korporátního partnera.</p>
            </div>

            <form onSubmit={handlePartnerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Název společnosti / Jméno</label>
                  <input
                    type="text"
                    required
                    value={partnerModal.data.name || ""}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, name: e.target.value } })}
                    placeholder="Např. ACME Corp s.r.o."
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Billing E-mail</label>
                  <input
                    type="email"
                    required
                    value={partnerModal.data.email || ""}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, email: e.target.value } })}
                    placeholder="faktury@acme.cz"
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Telefon</label>
                  <input
                    type="text"
                    value={partnerModal.data.phone || ""}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, phone: e.target.value } })}
                    placeholder="+420 123 456 789"
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">IČO</label>
                  <input
                    type="text"
                    value={partnerModal.data.companyId || ""}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, companyId: e.target.value } })}
                    placeholder="12345678"
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">DIČ</label>
                  <input
                    type="text"
                    value={partnerModal.data.vatId || ""}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, vatId: e.target.value } })}
                    placeholder="CZ12345678"
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-white/5 pt-3">
                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Fakturační adresa</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">Ulice a č.p.</label>
                    <input
                      type="text"
                      value={partnerModal.data.addressStreet || ""}
                      onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, addressStreet: e.target.value } })}
                      placeholder="Komenského 123"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">Město</label>
                    <input
                      type="text"
                      value={partnerModal.data.addressCity || ""}
                      onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, addressCity: e.target.value } })}
                      placeholder="Pardubice"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">PSČ</label>
                    <input
                      type="text"
                      value={partnerModal.data.addressZip || ""}
                      onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, addressZip: e.target.value } })}
                      placeholder="530 02"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">Země</label>
                    <input
                      type="text"
                      value={partnerModal.data.addressCountry || "Česká republika"}
                      onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, addressCountry: e.target.value } })}
                      placeholder="Česká republika"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-3">
                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    Smluvní sleva (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={partnerModal.data.discount || 0}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, discount: parseInt(e.target.value, 10) || 0 } })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-tenant-gradient hover:opacity-95 text-white font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-md mt-4 cursor-pointer"
              >
                {partnerModal.mode === "add" ? "Registrovat partnera" : "Uložit změny"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Generate Invoice Wizard Modal */}
      {invoiceWizard.open && (
        <div className="fixed inset-0 bg-[#05050A]/70 backdrop-blur-md flex md:items-center md:justify-center p-0 md:p-4 z-50 animate-fade-in select-none">
          <div className="bg-[#0D0D15] border-0 md:border border-white/10 p-6 rounded-none md:rounded-3xl w-full max-w-2xl h-full md:h-auto max-h-full md:max-h-[85vh] shadow-2xl space-y-5 relative overflow-y-auto">
            <button
              onClick={() => setInvoiceWizard(prev => ({ ...prev, open: false }))}
              className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-sm font-bold text-white">Vystavení zúčtovací faktury</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Vyberte období pro načtení rezervací partnera <strong>{partners.find(p => p.id === invoiceWizard.partnerId)?.name}</strong>.
              </p>
            </div>

            {invoiceWizard.error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0" />
                {invoiceWizard.error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/25 p-4 rounded-2xl border border-white/5">
              <div className="space-y-1">
                <label className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Počáteční datum</label>
                <input
                  type="date"
                  value={invoiceWizard.startDate}
                  onChange={e => setInvoiceWizard({ ...invoiceWizard, startDate: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Koncové datum</label>
                <input
                  type="date"
                  value={invoiceWizard.endDate}
                  onChange={e => setInvoiceWizard({ ...invoiceWizard, endDate: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 md:py-2 px-4 text-xs font-semibold text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleFetchUninvoicedBookings}
                className="col-span-2 py-3 md:py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                Načíst nevyfakturované lekce
                <ArrowRight size={12} />
              </button>
            </div>

            {invoiceWizard.previewBookings.length > 0 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Nalezené rezervace ({invoiceWizard.previewBookings.length})
                  </span>
                  <div className="max-h-40 overflow-y-auto border border-white/5 rounded-xl divide-y divide-white/5">
                    {invoiceWizard.previewBookings.map(b => (
                      <div key={b.id} className="p-3 bg-black/15 flex justify-between items-center text-[10.5px]">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white">{b.resourceName}</span>
                          <span className="text-slate-500 block text-[9px]">
                            {new Date(b.reservedFrom).toLocaleDateString("cs-CZ")} | {new Date(b.reservedFrom).toLocaleTimeString("cs-CZ", {hour: '2-digit', minute:'2-digit'})} (UTC)
                          </span>
                        </div>
                        <span className="font-mono font-bold text-foreground">{parseFloat(b.price).toLocaleString("cs-CZ")} Kč</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 flex justify-between items-center bg-tenant-primary/5 p-4 rounded-2xl border border-tenant-primary/10">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Celková částka k fakturaci (vč. DPH a slevy)</span>
                    <span className="text-slate-400 text-[10px]">
                      Smluvní sleva partnera: {partners.find(p => p.id === invoiceWizard.partnerId)?.discount}%
                    </span>
                  </div>
                  <span className="text-lg font-black text-white">
                    {invoiceWizard.calculatedTotal.toLocaleString("cs-CZ")} Kč
                  </span>
                </div>

                <button
                  type="button"
                  disabled={invoiceWizard.loading}
                  onClick={handleGenerateInvoice}
                  className="w-full py-3 bg-tenant-gradient hover:opacity-95 text-white font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {invoiceWizard.loading ? "Vytvářím fakturu..." : "Vygenerovat fakturu"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
