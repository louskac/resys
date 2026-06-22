"use client";

import React, { useState } from "react";
import { 
  Plus, Edit, Trash, CreditCard, Users, FileText, 
  DollarSign, ArrowRight, Eye, Check, X, ShieldAlert, 
  BadgePercent, Search, UserPlus, Building, Trash2, 
  Mail, Phone, ShieldCheck, MapPin, Sparkles, Ban,
  Loader2, CheckCircle2, XCircle
} from "lucide-react";
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
  partnerEmail?: string;
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

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressZip: string | null;
  addressCountry: string | null;
  organization: string | null;
  partnerId: string | null;
  partnerName: string | null;
  partnerDiscount: number;
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
  users: UserRecord[];
  router: any;
  theme: any;
  onModalToggle?: (open: boolean) => void;
}

export default function BillingTab({ 
  tenant, 
  partners, 
  invoices, 
  bookings, 
  users, 
  router, 
  theme, 
  onModalToggle 
}: BillingTabProps) {
  const [subTab, setSubTab] = useState<"users" | "partners" | "transactions" | "invoices">("users");

  // Search & Filter States
  const [userSearch, setUserSearch] = useState("");
  const [txnSearch, setTxnSearch] = useState("");
  const [txnTypeFilter, setTxnTypeFilter] = useState<"all" | "direct" | "partner">("all");
  const [txnStatusFilter, setTxnStatusFilter] = useState<"all" | "confirmed" | "pending" | "cancelled">("all");

  // Drag & Drop visual indicator state
  const [isDragOver, setIsDragOver] = useState(false);

  // Partner Form Modal State
  const [partnerModal, setPartnerModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data: Partial<Partner>;
  }>({
    open: false,
    mode: "add",
    data: {},
  });

  // Promote User Modal State
  const [promoteModal, setPromoteModal] = useState<{
    open: boolean;
    user: UserRecord | null;
    promotionType: "new" | "existing";
    selectedPartnerId: string;
    partnerName: string;
    partnerEmail: string;
    discount: number;
  }>({
    open: false,
    user: null,
    promotionType: "new",
    selectedPartnerId: "",
    partnerName: "",
    partnerEmail: "",
    discount: 0,
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

  const [emailSendingStatus, setEmailSendingStatus] = useState<{
    invoiceId: string | null;
    status: "idle" | "sending" | "success" | "error";
    message: string | null;
  }>({ invoiceId: null, status: "idle", message: null });

  // Notify parent when any modal opens/closes
  React.useEffect(() => {
    onModalToggle?.(partnerModal.open || promoteModal.open || invoiceWizard.open);
  }, [partnerModal.open, promoteModal.open, invoiceWizard.open, onModalToggle]);

  // Handle Drag & Drop Promotion trigger
  const handleDragStart = (e: React.DragEvent, user: UserRecord) => {
    e.dataTransfer.setData("text/plain", user.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const userId = e.dataTransfer.getData("text/plain");
    const draggedUser = users.find(u => u.id === userId);
    if (draggedUser) {
      triggerPromotionModal(draggedUser);
    }
  };

  const triggerPromotionModal = (user: UserRecord) => {
    // Check if user is already a partner
    if (user.partnerId) {
      alert(`Uživatel ${user.name} již je přiřazen k partnerovi.`);
      return;
    }

    setPromoteModal({
      open: true,
      user,
      promotionType: "new",
      selectedPartnerId: partners[0]?.id || "",
      partnerName: user.organization || user.name,
      partnerEmail: user.email,
      discount: 10, // Default 10%
    });
  };

  // Submit Promotion Form
  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { user, promotionType, selectedPartnerId, partnerName, partnerEmail, discount } = promoteModal;
    if (!user) return;

    try {
      let finalPartnerId = selectedPartnerId;

      // Case A: Create a brand new partner
      if (promotionType === "new") {
        if (!partnerName || !partnerEmail) {
          alert("Název firmy a email jsou povinné.");
          return;
        }

        const newPartnerRes = await fetch("/api/admin/partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: tenant.id,
            name: partnerName,
            email: partnerEmail,
            discount,
            active: true,
          }),
        });

        if (!newPartnerRes.ok) {
          throw new Error("Nepodařilo se vytvořit partnera.");
        }

        const newPartnerData = await newPartnerRes.json();
        finalPartnerId = newPartnerData.partner.id;
      }

      // Case B: Link user to the resolved partner ID
      if (!finalPartnerId) {
        alert("Vyberte prosím partnera k přiřazení.");
        return;
      }

      const linkUserRes = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          tenantId: tenant.id,
          partnerId: finalPartnerId,
        }),
      });

      if (linkUserRes.ok) {
        setPromoteModal({
          open: false,
          user: null,
          promotionType: "new",
          selectedPartnerId: "",
          partnerName: "",
          partnerEmail: "",
          discount: 0,
        });
        router.refresh();
      } else {
        alert("Nepodařilo se přiřadit uživatele k partnerovi.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Během ukládání došlo k chybě.");
    }
  };

  // Demote/Unlink User from Partner
  const handleDemoteUser = async (userId: string) => {
    if (!confirm("Opravdu chcete odebrat partnerství tomuto uživateli? Sleva mu již nebude automaticky uplatňována.")) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          tenantId: tenant.id,
          partnerId: null, // unlink
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

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
    if (!confirm("Opravdu chcete tohoto partnera deaktivovat? Budoucí automatická fakturace bude pozastavena a uživatelé ztratí automatickou slevu.")) return;
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

  // Simulate sending invoice PDF/details by email to partner
  const handleSendInvoiceByEmail = async (inv: Invoice) => {
    const partnerEmail = inv.partnerEmail || "info@partner.cz";
    setEmailSendingStatus({
      invoiceId: inv.id,
      status: "sending",
      message: `Odesílám fakturu ${inv.number} partnerovi ${inv.partnerName} na e-mail ${partnerEmail}...`
    });

    try {
      // Simulate network latency for sending email
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Actually update the invoice status to SENT in the backend
      const res = await fetch("/api/admin/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: inv.id,
          tenantId: tenant.id,
          status: "SENT",
        }),
      });

      if (res.ok) {
        setEmailSendingStatus({
          invoiceId: inv.id,
          status: "success",
          message: `Faktura ${inv.number} byla úspěšně odeslána na e-mail ${partnerEmail}.`
        });
        router.refresh();

        // Auto-close after 3.5 seconds
        setTimeout(() => {
          setEmailSendingStatus({ invoiceId: null, status: "idle", message: null });
        }, 3500);
      } else {
        const data = await res.json();
        setEmailSendingStatus({
          invoiceId: inv.id,
          status: "error",
          message: data.message || "Nepodařilo se aktualizovat stav faktury na serveru."
        });
      }
    } catch (err) {
      console.error(err);
      setEmailSendingStatus({
        invoiceId: inv.id,
        status: "error",
        message: "Chyba při komunikaci se serverem."
      });
    }
  };

  const activePartners = partners.filter(p => p.active);

  // Filters
  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const filteredTxns = bookings.filter(b => {
    const q = txnSearch.toLowerCase();
    const matchesQuery = b.userName.toLowerCase().includes(q) || b.userEmail.toLowerCase().includes(q) || b.resourceName.toLowerCase().includes(q);
    
    let matchesType = true;
    if (txnTypeFilter === "direct") {
      matchesType = !b.partnerId;
    } else if (txnTypeFilter === "partner") {
      matchesType = !!b.partnerId;
    }

    let matchesStatus = true;
    if (txnStatusFilter === "confirmed") {
      matchesStatus = b.status === "CONFIRMED" || b.status === "ATTENDED";
    } else if (txnStatusFilter === "pending") {
      matchesStatus = b.status === "PENDING_PAYMENT";
    } else if (txnStatusFilter === "cancelled") {
      matchesStatus = b.status === "CANCELLED";
    }

    return matchesQuery && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 text-xs font-sans">
      {/* Floating email sending simulation toast */}
      {emailSendingStatus.status !== "idle" && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-6 duration-300 max-w-sm w-full select-none pointer-events-auto">
          <div className={`p-4 rounded-2xl backdrop-blur-xl border shadow-xl flex items-center gap-3 ${
            emailSendingStatus.status === "sending"
              ? "bg-[#090915]/90 border-sky-500/35 text-white"
              : emailSendingStatus.status === "success"
                ? "bg-[#090915]/90 border-emerald-500/35 text-white"
                : "bg-[#090915]/90 border-rose-500/35 text-white"
          }`}>
            {emailSendingStatus.status === "sending" ? (
              <Loader2 className="animate-spin text-sky-400 shrink-0" size={16} />
            ) : emailSendingStatus.status === "success" ? (
              <CheckCircle2 className="text-emerald-400 shrink-0" size={16} />
            ) : (
              <XCircle className="text-rose-500 shrink-0" size={16} />
            )}
            <div className="flex-1 text-[11px] leading-tight font-medium">
              {emailSendingStatus.message}
            </div>
            {emailSendingStatus.status !== "sending" && (
              <button
                onClick={() => setEmailSendingStatus({ invoiceId: null, status: "idle", message: null })}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* SubTab Navigation header */}
      <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none bg-white/60 dark:bg-[#080810]/50 backdrop-blur-xl border border-slate-200/40 dark:border-white/5 p-1.5 rounded-2xl w-full md:w-fit select-none gap-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
        <button
          onClick={() => setSubTab("users")}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 ${
            subTab === "users" 
              ? "bg-tenant-gradient text-white shadow-sm font-extrabold" 
              : "bg-transparent text-slate-500 dark:text-zinc-400 hover:text-tenant-primary hover:bg-slate-100/30 dark:hover:bg-white/[0.02]"
          }`}
        >
          <Users size={14} />
          Uživatelé a Registrovaní
        </button>
        <button
          onClick={() => setSubTab("partners")}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 ${
            subTab === "partners" 
              ? "bg-tenant-gradient text-white shadow-sm font-extrabold" 
              : "bg-transparent text-slate-500 dark:text-zinc-400 hover:text-tenant-primary hover:bg-slate-100/30 dark:hover:bg-white/[0.02]"
          }`}
        >
          <Building size={14} />
          Partneři a Slevy ({activePartners.length})
        </button>
        <button
          onClick={() => setSubTab("transactions")}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 ${
            subTab === "transactions" 
              ? "bg-tenant-gradient text-white shadow-sm font-extrabold" 
              : "bg-transparent text-slate-500 dark:text-zinc-400 hover:text-tenant-primary hover:bg-slate-100/30 dark:hover:bg-white/[0.02]"
          }`}
        >
          <CreditCard size={14} />
          Kniha transakcí ({bookings.length})
        </button>
        <button
          onClick={() => setSubTab("invoices")}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 ${
            subTab === "invoices" 
              ? "bg-tenant-gradient text-white shadow-sm font-extrabold" 
              : "bg-transparent text-slate-500 dark:text-zinc-400 hover:text-tenant-primary hover:bg-slate-100/30 dark:hover:bg-white/[0.02]"
          }`}
        >
          <FileText size={14} />
          Faktury a Vyúčtování ({invoices.length})
        </button>
      </div>

      {/* SUBTAB 1: USERS & DIRECTORY (With Drag & Drop Promotion) */}
      {subTab === "users" && (
        <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Draggable Users Directory */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div>
                <h3 className="font-extrabold text-sm text-foreground">Registrovaní zákazníci a uživatelé</h3>
                <p className="text-[11px] text-slate-400">Přetáhněte libovolného uživatele doprava pro promování na stálého partnera.</p>
              </div>
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Hledat jméno nebo e-mail..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-white/45 dark:bg-black/20 border border-slate-200/50 dark:border-[#1F1F35] rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-foreground focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-zinc-450 border border-slate-200/50 dark:border-[#1F1F35] bg-white/45 dark:bg-[#0D0D15]/40 rounded-3xl font-mono">
                Nenašli jsme žádné registrované uživatele odpovídající vyhledávání.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredUsers.map(user => {
                  const isUserPartner = !!user.partnerId;
                  return (
                    <div
                      key={user.id}
                      draggable={!isUserPartner}
                      onDragStart={(e) => handleDragStart(e, user)}
                      className={`p-4 bg-white/45 dark:bg-[#0D0D15]/45 border rounded-2xl flex flex-col justify-between transition-all duration-300 group shadow-sm select-none ${
                        isUserPartner 
                          ? "border-emerald-500/20 bg-emerald-500/[0.01] hover:scale-[1.01]" 
                          : "border-slate-200/50 dark:border-[#1F1F35] cursor-grab active:cursor-grabbing hover:scale-[1.01] hover:border-tenant-primary/30 hover:shadow-md"
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-tenant-primary/10 text-tenant-primary flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
                              ) : (
                                user.name.slice(0, 2)
                              )}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-xs text-foreground leading-tight">{user.name}</h4>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{user.email}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 text-slate-500 text-[10.5px] leading-relaxed">
                          {user.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone size={10} className="text-slate-400" />
                              <span>{user.phone}</span>
                            </p>
                          )}
                          {user.organization && (
                            <p className="flex items-center gap-1.5">
                              <Building size={10} className="text-slate-400" />
                              <span>{user.organization}</span>
                            </p>
                          )}
                          <p className="text-[9px] text-slate-400 mt-1">Registrace: {new Date(user.createdAt).toLocaleDateString("cs-CZ")}</p>
                        </div>
                      </div>

                      {/* Partner Connection Badge or Action */}
                      <div className="border-t border-slate-100 dark:border-white/[0.04] pt-3 mt-3 flex justify-between items-center">
                        {isUserPartner ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 uppercase tracking-widest shadow-sm">
                              <ShieldCheck size={10} />
                              Partner ({user.partnerDiscount}%)
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold truncate max-w-28" title={user.partnerName || ""}>
                              {user.partnerName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 flex items-center gap-1 font-semibold italic">
                            <Sparkles size={10} className="text-tenant-primary" />
                            Přetáhněte pro promování
                          </span>
                        )}

                        <div className="flex gap-1.5">
                          {isUserPartner ? (
                            <button
                              onClick={() => handleDemoteUser(user.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 rounded-lg transition-all cursor-pointer"
                              title="Zrušit partnerství"
                            >
                              <Ban size={12} />
                            </button>
                          ) : (
                            <button
                              onClick={() => triggerPromotionModal(user)}
                              className="p-1 px-2 bg-tenant-primary/10 hover:bg-tenant-primary text-tenant-primary hover:text-white border border-tenant-primary/20 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title="Promovat na partnera"
                            >
                              <UserPlus size={10} />
                              Promovat
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Promotion Drop Zone Panel */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="font-extrabold text-sm text-foreground">Promování partnerů</h3>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center gap-4 min-h-60 transition-all duration-300 ${
                isDragOver 
                  ? "border-tenant-primary bg-tenant-primary/10 scale-[1.02] shadow-lg shadow-tenant-primary/5 text-tenant-primary" 
                  : "border-slate-350 dark:border-white/10 bg-white/20 dark:bg-black/10 text-slate-400"
              }`}
            >
              <div className={`p-4 rounded-full transition-colors ${isDragOver ? "bg-tenant-primary/10 text-tenant-primary" : "bg-slate-100 dark:bg-white/5"}`}>
                <UserPlus size={32} className={isDragOver ? "animate-bounce" : ""} />
              </div>
              <div>
                <h4 className={`font-extrabold text-xs transition-colors ${isDragOver ? "text-tenant-primary" : "text-foreground"}`}>
                  {isDragOver ? "Pusťte pro promování!" : "Přetáhněte sem uživatele"}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 max-w-[200px] leading-relaxed">
                  Pusťte kartu běžného uživatele do této zóny a otevře se dialog k rychlému nastavení slevy a zařazení mezi partnery.
                </p>
              </div>
            </div>

            {/* Partner Program FAQ Card */}
            <div className="p-5 bg-white/45 dark:bg-[#0D0D15]/40 border border-slate-200/50 dark:border-[#1F1F35] rounded-3xl space-y-3.5">
              <h4 className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                <BadgePercent size={14} className="text-tenant-primary" />
                Jak funguje partnerský účet?
              </h4>
              <div className="space-y-2.5 text-[10.5px] text-slate-500 leading-relaxed">
                <p>
                  <strong className="text-foreground">1. Automatické uplatnění:</strong> Když uživatele promujete, jakékoliv rezervace, které udělá ve frontendovém rezervačním portálu, budou mít automaticky odečtenou jeho smluvní slevu. Zákazník vidí pouze konečnou sníženou cenu.
                </p>
                <p>
                  <strong className="text-foreground">2. Rezervace bez okamžité platby:</strong> Partnerské rezervace nepotřebují uhradit online kartou. Jsou okamžitě schváleny a uloženy pro měsíční vyúčtování.
                </p>
                <p>
                  <strong className="text-foreground">3. Hromadné faktury:</strong> Na konci měsíce admin otevře fakturační tab a vygeneruje souhrnnou fakturu za všechny rezervace partnera.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PARTNERS LIST */}
      {subTab === "partners" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-foreground">Seznam korporátních partnerů ({activePartners.length})</h3>
              <p className="text-[11px] text-slate-400">Přehled firemních partnerů a nastavených slev.</p>
            </div>
            <button
              onClick={() => setPartnerModal({
                open: true,
                mode: "add",
                data: { name: "", email: "", phone: "", companyId: "", vatId: "", discount: 0, active: true }
              })}
              className="flex bg-tenant-gradient hover:opacity-95 active:scale-95 transition-all text-white text-xs py-2.5 px-4 rounded-xl font-bold shadow-md shadow-tenant-primary/10 items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              Zaregistrovat partnera
            </button>
          </div>

          {activePartners.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-zinc-450 border border-slate-200/50 dark:border-[#1F1F35] bg-white/45 dark:bg-[#0D0D15]/40 rounded-3xl font-mono">
              Zatím nejsou registrováni žádní partneři. Promujte uživatele nebo registrujte nového partnera.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {activePartners.map(partner => {
                const partnerBookings = bookings.filter(b => b.partnerId === partner.id);
                const uninvoiced = partnerBookings.filter(b => !b.invoiceId);
                const linkedUsers = users.filter(u => u.partnerId === partner.id);

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
                      
                      <div>
                        <h4 className="font-extrabold text-base text-foreground leading-tight">{partner.name}</h4>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mt-1 flex-wrap">
                          <span>{linkedUsers.length} propojených uživatelů</span>
                          {linkedUsers.length > 0 && (
                            <span className="text-slate-500">({linkedUsers.map(u => u.name).join(", ")})</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-slate-500 text-[11px] leading-relaxed">
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
                        className="bg-tenant-primary/10 text-tenant-primary hover:bg-tenant-primary hover:text-white transition-all text-xs font-bold py-2 px-3 rounded-xl border border-tenant-primary/20 flex items-center gap-1 cursor-pointer"
                        disabled={uninvoiced.length === 0}
                        title={uninvoiced.length === 0 ? "Žádné nevyfakturované lekce" : "Fakturovat lekce"}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Vyfakturovat
                      </button>
                      <button
                        onClick={() => setPartnerModal({
                          open: true,
                          mode: "edit",
                          data: partner
                        })}
                        className="p-2 bg-slate-200/35 hover:bg-slate-200/50 dark:bg-[#131322]/40 dark:hover:bg-[#1F1F35]/65 text-slate-600 dark:text-zinc-300 border border-slate-200/50 dark:border-[#1F1F35] rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title="Upravit profil partnera"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handlePartnerDeactivate(partner.id)}
                        className="p-2 bg-slate-200/35 hover:bg-red-500/10 dark:bg-[#131322]/40 dark:hover:bg-red-500/15 text-rose-500 border border-slate-200/50 dark:border-[#1F1F35] rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title="Deaktivovat partnera"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: TRANSACTIONS LOG */}
      {subTab === "transactions" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h3 className="font-bold text-sm text-foreground">Kniha všech transakcí a rezervací</h3>
              <p className="text-[11px] text-slate-400">Přehled všech plateb a rezervací v systému.</p>
            </div>
            
            <div className="flex gap-2 flex-wrap items-center w-full sm:w-auto">
              {/* Type Filter */}
              <select
                value={txnTypeFilter}
                onChange={(e: any) => setTxnTypeFilter(e.target.value)}
                className="bg-white/45 dark:bg-[#0D0D15]/45 border border-slate-200/50 dark:border-[#1F1F35] rounded-xl py-2 px-3 text-xs font-semibold text-foreground focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
              >
                <option value="all">Všechny typy</option>
                <option value="direct">Přímé platby</option>
                <option value="partner">Na fakturu partnera</option>
              </select>

              {/* Status Filter */}
              <select
                value={txnStatusFilter}
                onChange={(e: any) => setTxnStatusFilter(e.target.value)}
                className="bg-white/45 dark:bg-[#0D0D15]/45 border border-slate-200/50 dark:border-[#1F1F35] rounded-xl py-2 px-3 text-xs font-semibold text-foreground focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
              >
                <option value="all">Všechny stavy</option>
                <option value="confirmed">Potvrzené/Uhrazené</option>
                <option value="pending">Čekající na platbu</option>
                <option value="cancelled">Stornované</option>
              </select>

              {/* Search input */}
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={12} />
                <input
                  type="text"
                  placeholder="Hledat..."
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  className="w-full bg-white/45 dark:bg-black/20 border border-slate-200/50 dark:border-[#1F1F35] rounded-xl py-2 pl-8 pr-3 text-xs font-semibold text-foreground focus:outline-none focus:border-tenant-primary transition-all"
                />
              </div>
            </div>
          </div>

          {filteredTxns.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-zinc-450 border border-slate-200/50 dark:border-[#1F1F35] bg-white/45 dark:bg-[#0D0D15]/40 rounded-3xl font-mono">
              Nebyly nalezeny žádné transakce odpovídající vybraným filtrům.
            </div>
          ) : (
            <div className="border border-slate-200/40 dark:border-[#1F1F35]/40 bg-white/30 dark:bg-black/15 rounded-2xl overflow-x-auto scrollbar-none shadow-sm">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-200/35 dark:bg-[#08080E]/70 border-b border-slate-200/50 dark:border-[#1F1F35] text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">
                    <th className="p-4">Datum transakce</th>
                    <th className="p-4">Zákazník</th>
                    <th className="p-4">Zdroj/Místo</th>
                    <th className="p-4">Termín rezervace</th>
                    <th className="p-4 text-right">Částka</th>
                    <th className="p-4">Typ vyúčtování</th>
                    <th className="p-4">Stav</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/20 dark:divide-[#1F1F35]/35 text-[11px]">
                  {filteredTxns.map(txn => {
                    const fromDate = new Date(txn.reservedFrom);
                    const toDate = new Date(txn.reservedTo);
                    const isPartner = !!txn.partnerId;

                    return (
                      <tr key={txn.id} className="hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 text-slate-500 dark:text-zinc-400 font-mono">
                          {new Date(txn.createdAt).toLocaleDateString("cs-CZ")} {new Date(txn.createdAt).toLocaleTimeString("cs-CZ", {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="p-4 font-semibold text-foreground">
                          <div>{txn.userName}</div>
                          <div className="text-[9.5px] text-slate-400 font-normal">{txn.userEmail}</div>
                        </td>
                        <td className="p-4 font-medium text-foreground">{txn.resourceName}</td>
                        <td className="p-4 text-slate-700 dark:text-slate-350">
                          {fromDate.toLocaleDateString("cs-CZ")} | {fromDate.getUTCHours().toString().padStart(2, "0")}:{fromDate.getUTCMinutes().toString().padStart(2, "0")} – {toDate.getUTCHours().toString().padStart(2, "0")}:{toDate.getUTCMinutes().toString().padStart(2, "0")} (UTC)
                        </td>
                        <td className="p-4 font-black text-right text-foreground">
                          {parseFloat(txn.price).toLocaleString("cs-CZ")} Kč
                        </td>
                        <td className="p-4">
                          {isPartner ? (
                            <span className="flex flex-col gap-0.5">
                              <span className="text-[9.5px] font-bold text-tenant-primary uppercase tracking-wider">Faktura (Partner)</span>
                              <span className="text-[9px] text-slate-400 font-mono truncate max-w-32" title={txn.partnerName || ""}>
                                {txn.partnerName} {txn.invoiceId ? `(Fakturováno)` : `(K vyúčtování)`}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                              {parseFloat(txn.price) === 0 ? "Bezplatné" : "Přímá online platba"}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            txn.status === "CONFIRMED" || txn.status === "ATTENDED"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : txn.status === "PENDING_PAYMENT"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          }`}>
                            {txn.status === "CONFIRMED" ? "Schváleno" : txn.status === "ATTENDED" ? "Odbaveno" : txn.status === "PENDING_PAYMENT" ? "Čeká na platbu" : "Zrušeno"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: INVOICES LIST */}
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
              <div className="hidden md:block border border-slate-200/40 dark:border-[#1F1F35]/40 bg-white/30 dark:bg-black/15 rounded-2xl overflow-x-auto scrollbar-none shadow-sm">
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
                  <tbody className="divide-y divide-slate-200/20 dark:divide-[#1F1F35]/35 text-[11px]">
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
                          {inv.status === "DRAFT" ? (
                            <button
                              onClick={() => handleSendInvoiceByEmail(inv)}
                              className="p-1 px-2 bg-sky-500/10 hover:bg-sky-500 text-sky-500 hover:text-white border border-sky-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Odeslat fakturu partnerovi na e-mail"
                            >
                              <Mail size={10} />
                              Poslat na e-mail
                            </button>
                          ) : inv.status === "SENT" ? (
                            <button
                              onClick={() => handleSendInvoiceByEmail(inv)}
                              className="p-1 px-2 bg-slate-500/10 hover:bg-slate-600 text-slate-550 hover:text-white border border-slate-200 dark:border-white/5 rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Znovu poslat fakturu partnerovi na e-mail"
                            >
                              <Mail size={10} />
                              Poslat znovu
                            </button>
                          ) : null}
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
                          className="inline-flex p-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#131322]/40 dark:hover:bg-[#1F1F35] text-slate-600 dark:text-zinc-300 border border-slate-200/50 dark:border-white/5 rounded-lg transition-all"
                          title="Zobrazit fakturu"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        {inv.status === "DRAFT" ? (
                          <button
                            onClick={() => handleSendInvoiceByEmail(inv)}
                            className="py-1.5 px-3 bg-sky-500/10 hover:bg-sky-500 text-sky-500 hover:text-white border border-sky-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Poslat na e-mail
                          </button>
                        ) : inv.status === "SENT" ? (
                          <button
                            onClick={() => handleSendInvoiceByEmail(inv)}
                            className="py-1.5 px-3 bg-slate-500/10 hover:bg-slate-500 text-slate-500 hover:text-white border border-slate-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Poslat znovu
                          </button>
                        ) : null}
                        {(inv.status === "SENT" || inv.status === "DRAFT") && (
                          <button
                            onClick={() => handleUpdateInvoiceStatus(inv.id, "PAID")}
                            className="py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Uhradit
                          </button>
                        )}
                        {inv.status !== "CANCELLED" && (
                          <button
                            onClick={() => handleUpdateInvoiceStatus(inv.id, "CANCELLED")}
                            className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
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

      {/* 1. Promote User to Partner Modal */}
      {promoteModal.open && promoteModal.user && (
        <div className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex md:items-center md:justify-center p-0 md:p-4 z-50 animate-fade-in select-none">
          <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-white/10 p-6 rounded-none md:rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(112,0,255,0.12)] space-y-5 relative overflow-y-auto scrollbar-none">
            <button
              onClick={() => setPromoteModal({ ...promoteModal, open: false, user: null })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-1.5">
                <UserPlus size={16} className="text-tenant-primary" />
                Promování uživatele: {promoteModal.user.name}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Vytvořte novou partnerskou firmu nebo uživatele přiřaďte k existující.</p>
            </div>

            <form onSubmit={handlePromoteSubmit} className="space-y-4">
              
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100/50 dark:bg-black/40 p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setPromoteModal({ ...promoteModal, promotionType: "new" })}
                  className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    promoteModal.promotionType === "new" 
                      ? "bg-tenant-gradient text-white shadow-sm" 
                      : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Nová firma (Partner)
                </button>
                <button
                  type="button"
                  onClick={() => setPromoteModal({ ...promoteModal, promotionType: "existing" })}
                  className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    promoteModal.promotionType === "existing" 
                      ? "bg-tenant-gradient text-white shadow-sm" 
                      : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                  disabled={partners.length === 0}
                >
                  Přiřadit k existující firmě
                </button>
              </div>

              {promoteModal.promotionType === "new" ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Název partnerské společnosti</label>
                    <input
                      type="text"
                      required
                      value={promoteModal.partnerName}
                      onChange={e => setPromoteModal({ ...promoteModal, partnerName: e.target.value })}
                      placeholder="Např. ACME Corp s.r.o."
                      className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-450"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Billing E-mail pro faktury</label>
                    <input
                      type="email"
                      required
                      value={promoteModal.partnerEmail}
                      onChange={e => setPromoteModal({ ...promoteModal, partnerEmail: e.target.value })}
                      placeholder="faktury@acme.cz"
                      className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-450"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Smluvní sleva (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={promoteModal.discount}
                      onChange={e => setPromoteModal({ ...promoteModal, discount: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1 animate-fade-in">
                  <label className="block text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Vyberte partnera</label>
                  <select
                    value={promoteModal.selectedPartnerId}
                    onChange={e => setPromoteModal({ ...promoteModal, selectedPartnerId: e.target.value })}
                    className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                  >
                    {partners.map(p => (
                      <option key={p.id} value={p.id} className="text-slate-800 dark:text-slate-200 bg-white dark:bg-[#0D0D15]">
                        {p.name} (Sleva {p.discount}%)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-tenant-gradient hover:opacity-95 text-white font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-md mt-4 cursor-pointer"
              >
                Uložit partnerství
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Partner Edit/Add Modal */}
      {partnerModal.open && (
        <div className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex md:items-center md:justify-center p-0 md:p-4 z-50 animate-fade-in select-none">
          <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-white/10 p-5 sm:p-6 rounded-none md:rounded-3xl w-full max-w-lg h-full md:h-auto max-h-full md:max-h-[90vh] shadow-[0_20px_50px_rgba(112,0,255,0.12)] space-y-5 relative overflow-y-auto scrollbar-none">
            <button
              onClick={() => setPartnerModal({ open: false, mode: "add", data: {} })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-white">
                {partnerModal.mode === "add" ? "Registrovat nového partnera" : "Upravit profil partnera"}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Konfigurujte detaily a zúčtování pro korporátního partnera.</p>
            </div>

            <form onSubmit={handlePartnerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Název společnosti / Jméno</label>
                  <input
                    type="text"
                    required
                    value={partnerModal.data.name || ""}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, name: e.target.value } })}
                    placeholder="Např. ACME Corp s.r.o."
                    className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-450"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Billing E-mail</label>
                  <input
                    type="email"
                    required
                    value={partnerModal.data.email || ""}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, email: e.target.value } })}
                    placeholder="faktury@acme.cz"
                    className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-450"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Telefon</label>
                  <input
                    type="text"
                    value={partnerModal.data.phone || ""}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, phone: e.target.value } })}
                    placeholder="+420 123 456 789"
                    className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-450"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">IČO</label>
                  <input
                    type="text"
                    value={partnerModal.data.companyId || ""}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, companyId: e.target.value } })}
                    placeholder="12345678"
                    className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all font-mono placeholder:text-slate-450"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">DIČ</label>
                  <input
                    type="text"
                    value={partnerModal.data.vatId || ""}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, vatId: e.target.value } })}
                    placeholder="CZ12345678"
                    className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all font-mono placeholder:text-slate-450"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-200/40 dark:border-white/5 pt-3">
                <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Fakturační adresa</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Ulice a č.p.</label>
                    <input
                      type="text"
                      value={partnerModal.data.addressStreet || ""}
                      onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, addressStreet: e.target.value } })}
                      placeholder="Komenského 123"
                      className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-450"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Město</label>
                    <input
                      type="text"
                      value={partnerModal.data.addressCity || ""}
                      onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, addressCity: e.target.value } })}
                      placeholder="Pardubice"
                      className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-450"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">PSČ</label>
                    <input
                      type="text"
                      value={partnerModal.data.addressZip || ""}
                      onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, addressZip: e.target.value } })}
                      placeholder="530 02"
                      className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-450"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Země</label>
                    <input
                      type="text"
                      value={partnerModal.data.addressCountry || "Česká republika"}
                      onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, addressCountry: e.target.value } })}
                      placeholder="Česká republika"
                      className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all placeholder:text-slate-450"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200/40 dark:border-white/5 pt-3">
                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    Smluvní sleva (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={partnerModal.data.discount || 0}
                    onChange={e => setPartnerModal({ ...partnerModal, data: { ...partnerModal.data, discount: parseInt(e.target.value, 10) || 0 } })}
                    className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
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

      {/* 3. Generate Invoice Wizard Modal */}
      {invoiceWizard.open && (
        <div className="fixed inset-0 bg-[#07070C]/60 dark:bg-black/75 backdrop-blur-md flex md:items-center md:justify-center p-0 md:p-4 z-50 animate-fade-in select-none">
          <div className="bg-white/95 dark:bg-[#0D0D15]/90 backdrop-blur-2xl border border-slate-200/60 dark:border-white/10 p-6 rounded-none md:rounded-3xl w-full max-w-2xl h-full md:h-auto max-h-full md:max-h-[85vh] shadow-[0_20px_50px_rgba(112,0,255,0.12)] space-y-5 relative overflow-y-auto scrollbar-none">
            <button
              onClick={() => setInvoiceWizard(prev => ({ ...prev, open: false }))}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-white">Vystavení zúčtovací faktury</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Vyberte období pro načtení rezervací partnera <strong>{partners.find(p => p.id === invoiceWizard.partnerId)?.name}</strong>.
              </p>
            </div>

            {invoiceWizard.error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-[11px] flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0" />
                {invoiceWizard.error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-black/25 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 text-xs">
              <div className="space-y-1">
                <label className="block text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Počáteční datum</label>
                <input
                  type="date"
                  value={invoiceWizard.startDate}
                  onChange={e => setInvoiceWizard({ ...invoiceWizard, startDate: e.target.value })}
                  className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Koncové datum</label>
                <input
                  type="date"
                  value={invoiceWizard.endDate}
                  onChange={e => setInvoiceWizard({ ...invoiceWizard, endDate: e.target.value })}
                  className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl py-2 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-tenant-primary focus:ring-1 focus:ring-tenant-primary/20 transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleFetchUninvoicedBookings}
                className="col-span-2 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                Načíst nevyfakturované lekce
                <ArrowRight size={12} />
              </button>
            </div>

            {invoiceWizard.previewBookings.length > 0 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    Nalezené rezervace ({invoiceWizard.previewBookings.length})
                  </span>
                  <div className="max-h-40 overflow-y-auto border border-slate-200/60 dark:border-white/5 rounded-xl divide-y divide-slate-150 dark:divide-white/5">
                    {invoiceWizard.previewBookings.map(b => (
                      <div key={b.id} className="p-3 bg-slate-50/30 dark:bg-black/15 flex justify-between items-center text-[10.5px]">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-850 dark:text-white">{b.resourceName}</span>
                          <span className="text-slate-400 dark:text-slate-500 block text-[9px]">
                            {new Date(b.reservedFrom).toLocaleDateString("cs-CZ")} | {new Date(b.reservedFrom).toLocaleTimeString("cs-CZ", {hour: '2-digit', minute:'2-digit'})} (UTC)
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-800 dark:text-white">{parseFloat(b.price).toLocaleString("cs-CZ")} Kč</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200/40 dark:border-white/5 pt-4 flex justify-between items-center bg-tenant-primary/5 dark:bg-tenant-primary/10 p-4 rounded-2xl border border-tenant-primary/20 dark:border-tenant-primary/10">
                  <div>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Celková částka k fakturaci (vč. DPH a slevy)</span>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                      Smluvní sleva partnera: {partners.find(p => p.id === invoiceWizard.partnerId)?.discount}%
                    </span>
                  </div>
                  <span className="text-lg font-black text-slate-850 dark:text-white">
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
