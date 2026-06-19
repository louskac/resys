import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

interface InvoicePageProps {
  params: Promise<{
    tenantId: string;
    invoiceId: string;
  }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { tenantId, invoiceId } = await params;
  const session = await getServerSession(authOptions);

  // Fetch tenant and target invoice
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      invoices: {
        where: { id: invoiceId },
        include: {
          partner: true,
          bookings: {
            include: {
              resource: true,
            },
            orderBy: {
              reservedFrom: "asc",
            },
          },
        },
      },
    },
  });

  if (!tenant || tenant.invoices.length === 0) {
    return notFound();
  }

  const invoice = tenant.invoices[0];

  // Enforce authentication
  if (!session || !session.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 text-slate-800 font-sans">
        <p className="mb-4 font-semibold text-sm">Pro přístup k této stránce se musíte přihlásit.</p>
        <Link
          href={`/tenants/${tenantId}/admin`}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
        >
          Přihlásit se
        </Link>
      </div>
    );
  }

  // Enforce administrator authorization
  const attributes = (tenant.attributes as Record<string, any>) || {};
  const adminEmails = attributes.adminEmails || [];
  const userEmail = session.user.email || "";
  const userRole = (session.user as any).role;
  const userTenantId = (session.user as any).tenantId;

  const isAuthorized =
    (userRole === "ADMIN" && userTenantId === tenantId) ||
    adminEmails.includes(userEmail);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 text-slate-800 font-sans">
        <p className="mb-4 font-semibold text-sm">Nemáte oprávnění k zobrazení této stránky.</p>
        <Link
          href={`/tenants/${tenantId}/admin`}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
        >
          Zpět do administrace
        </Link>
      </div>
    );
  }

  const partner = invoice.partner;

  // Czech date formatting helper
  const formatCzechDate = (date: Date) => {
    return new Intl.DateTimeFormat("cs-CZ", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).format(date);
  };

  const formatCzechTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  };

  // Calculate invoice subtotal and VAT
  const amountToPay = parseFloat(invoice.amount.toString());
  // Let's assume standard 21% VAT
  const vatRate = 0.21;
  const subtotal = amountToPay / (1 + vatRate);
  const vatAmount = amountToPay - subtotal;

  // Supplier default fallback attributes for school
  const supplierName = tenant.name;
  const supplierStreet = attributes.supplierStreet || "Komenského 12";
  const supplierCity = attributes.supplierCity || "Komenského město";
  const supplierZip = attributes.supplierZip || "123 45";
  const supplierCountry = attributes.supplierCountry || "Česká republika";
  const supplierCompanyId = attributes.supplierCompanyId || "12345678"; // IČO
  const supplierVatId = attributes.supplierVatId || "CZ12345678"; // DIČ
  const supplierBankAccount = attributes.supplierBankAccount || "19-1234567890/0100";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:py-0 print:px-0 text-slate-800 dark:text-slate-100 print:text-black">
      {/* Print Hide Actions Header */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link
          href={`/tenants/${tenantId}/admin`}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Zpět do administrace
        </Link>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.print();
            }
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2"
        >
          <Printer size={15} />
          Vytisknout / Uložit PDF
        </button>
      </div>

      {/* Invoice Sheet */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-950 print:bg-white print:dark:bg-white dark:border-zinc-800 border border-slate-200 rounded-3xl print:border-0 print:rounded-none shadow-xl print:shadow-none p-8 md:p-12 font-sans select-text">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-200/80 dark:border-zinc-800 pb-8 gap-6">
          <div className="space-y-1.5">
            <h1 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider print:text-black">
              FAKTURA - DAŇOVÝ DOKLAD
            </h1>
            <p className="text-sm font-bold text-slate-500 dark:text-zinc-400">
              Číslo faktury: <span className="text-slate-850 dark:text-slate-100 print:text-black font-mono">{invoice.number}</span>
            </p>
            <div className="inline-block mt-1">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  invoice.status === "PAID"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                    : invoice.status === "SENT"
                    ? "bg-blue-500/10 text-blue-500 border-blue-500/25"
                    : invoice.status === "CANCELLED"
                    ? "bg-red-500/10 text-red-500 border-red-500/25"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/25"
                } print:hidden`}
              >
                {invoice.status === "PAID"
                  ? "Zaplaceno"
                  : invoice.status === "SENT"
                  ? "Odesláno"
                  : invoice.status === "CANCELLED"
                  ? "Stornováno"
                  : "Návrh"}
              </span>
            </div>
          </div>

          <div className="text-right md:text-left space-y-1">
            <div className="text-sm font-bold text-slate-700 dark:text-slate-250 print:text-black">
              {supplierName}
            </div>
            <div className="text-xs text-slate-500 dark:text-zinc-400 print:text-slate-600">
              {supplierStreet}
            </div>
            <div className="text-xs text-slate-500 dark:text-zinc-400 print:text-slate-600">
              {supplierZip} {supplierCity}
            </div>
            <div className="text-xs text-slate-500 dark:text-zinc-400 print:text-slate-600">
              {supplierCountry}
            </div>
          </div>
        </div>

        {/* Address and Info Grid */}
        <div className="grid md:grid-cols-2 gap-8 py-8 border-b border-slate-200/85 dark:border-zinc-800">
          {/* Supplier Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dodavatel</h3>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black">{supplierName}</p>
              <p className="text-slate-500 dark:text-zinc-400 print:text-slate-600">{supplierStreet}</p>
              <p className="text-slate-500 dark:text-zinc-400 print:text-slate-600">{supplierZip} {supplierCity}</p>
              <p className="text-slate-500 dark:text-zinc-400 print:text-slate-600">{supplierCountry}</p>
              <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-slate-100/50 dark:border-zinc-900 mt-2">
                <div>
                  <span className="text-slate-400">IČO:</span> <span className="text-slate-700 dark:text-slate-350 print:text-black">{supplierCompanyId}</span>
                </div>
                <div>
                  <span className="text-slate-400">DIČ:</span> <span className="text-slate-700 dark:text-slate-350 print:text-black">{supplierVatId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-4 bg-slate-50/50 dark:bg-zinc-900/40 print:bg-transparent p-5 rounded-2xl border border-slate-100 dark:border-zinc-900 print:border-0 print:p-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Odběratel</h3>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black">{partner.name}</p>
              <p className="text-slate-500 dark:text-zinc-400 print:text-slate-600">
                {partner.addressStreet || "-"}
              </p>
              <p className="text-slate-500 dark:text-zinc-400 print:text-slate-600">
                {partner.addressZip || ""} {partner.addressCity || ""}
              </p>
              <p className="text-slate-500 dark:text-zinc-400 print:text-slate-600">
                {partner.addressCountry || "Česká republika"}
              </p>
              <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-slate-200/30 dark:border-zinc-800 mt-2">
                <div>
                  <span className="text-slate-400">IČO:</span> <span className="text-slate-700 dark:text-slate-350 print:text-black">{partner.companyId || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400">DIČ:</span> <span className="text-slate-700 dark:text-slate-350 print:text-black">{partner.vatId || "-"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-6 border-b border-slate-200/85 dark:border-zinc-800 text-xs">
          <div>
            <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Datum vystavení</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{formatCzechDate(invoice.issueDate)}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Datum splatnosti</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{formatCzechDate(invoice.dueDate)}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Platební metoda</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">Bankovní převod</span>
          </div>
          <div>
            <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Bankovní účet</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black font-mono">{supplierBankAccount}</span>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-8">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Vyúčtované položky (Rezervace)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase font-bold text-[9px] tracking-wider">
                  <th className="pb-3">Datum</th>
                  <th className="pb-3">Rezervovaný zdroj</th>
                  <th className="pb-3">Čas slotu</th>
                  <th className="pb-3 text-right">Cena</th>
                </tr>
              </thead>
              <tbody>
                {invoice.bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-slate-100 dark:border-zinc-900/60 hover:bg-slate-50/20 dark:hover:bg-zinc-900/10 text-slate-700 dark:text-slate-300 print:text-black"
                  >
                    <td className="py-3 font-mono">{formatCzechDate(booking.reservedFrom)}</td>
                    <td className="py-3 font-semibold">{booking.resource.name}</td>
                    <td className="py-3">
                      {formatCzechTime(booking.reservedFrom.toISOString())} -{" "}
                      {formatCzechTime(booking.reservedTo.toISOString())}
                    </td>
                    <td className="py-3 text-right font-semibold font-mono">
                      {parseFloat(booking.price.toString()).toLocaleString("cs-CZ")} Kč
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Summary block */}
        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="w-full sm:w-72 space-y-2.5 text-xs text-right">
            <div className="flex justify-between text-slate-500 dark:text-zinc-400 print:text-slate-600">
              <span>Základ daně (bez DPH):</span>
              <span className="font-semibold font-mono">{subtotal.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-zinc-400 print:text-slate-600">
              <span>Sazba DPH:</span>
              <span className="font-semibold">21 %</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-zinc-400 print:text-slate-600">
              <span>Výše DPH (21%):</span>
              <span className="font-semibold font-mono">{vatAmount.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč</span>
            </div>
            
            {partner.discount > 0 && (
              <div className="flex justify-between text-indigo-650 dark:text-indigo-400 print:text-black font-semibold">
                <span>Partnerská sleva ({partner.discount}%):</span>
                <span>Uplatněno</span>
              </div>
            )}

            <div className="flex justify-between text-base font-extrabold text-slate-800 dark:text-white print:text-black border-t border-slate-200 dark:border-zinc-800 pt-3 mt-1 select-none">
              <span>Celkem k úhradě:</span>
              <span className="text-indigo-600 dark:text-indigo-400 print:text-black font-mono">
                {amountToPay.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
              </span>
            </div>
          </div>
        </div>

        {/* Footer message / Sign box */}
        <div className="mt-16 pt-8 border-t border-slate-200/50 dark:border-zinc-900 grid grid-cols-2 text-xs text-slate-400">
          <div className="space-y-1.5">
            <p className="font-bold text-slate-500 dark:text-zinc-400">Doplňující informace:</p>
            <p>Jsme plátci DPH.</p>
            <p>Faktura slouží zároveň jako dodací list.</p>
            <p>Při platbě bankovním převodem uveďte jako variabilní symbol číslo faktury.</p>
          </div>
          <div className="flex flex-col items-end justify-end space-y-2 select-none">
            <div className="h-16 w-32 border-b border-dashed border-slate-300 dark:border-zinc-800"></div>
            <p className="text-[9px] uppercase tracking-wider text-slate-450 text-right pr-4">Razítko a podpis dodavatele</p>
          </div>
        </div>
      </div>
    </div>
  );
}
