import { useState, useEffect } from 'react';
import { Order, InvoiceTemplateId, InvoiceAccentColor } from '../types.ts';
import { useApp } from '../context/AppContext.tsx';
import { 
  Printer, 
  X, 
  FileText, 
  Layout, 
  Receipt, 
  QrCode, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  ShieldCheck, 
  Copy,
  ExternalLink
} from 'lucide-react';

interface InvoiceModalProps {
  order: Order | null;
  isOpen?: boolean;
  onClose: () => void;
  autoPrint?: boolean;
}

export function InvoiceModal({ order, isOpen = true, onClose, autoPrint = false }: InvoiceModalProps) {
  const { companyProfile } = useApp();
  
  if (!isOpen || !order) return null;

  // Design templates: 'gst_tax_invoice' | 'modern_minimalist' | 'compact_slip'
  const [template, setTemplate] = useState<InvoiceTemplateId>(
    order.orderType === 'wholesale' ? 'gst_tax_invoice' : 'modern_minimalist'
  );

  // Color accents: 'slate' | 'navy' | 'emerald' | 'crimson'
  const [accent, setAccent] = useState<InvoiceAccentColor>('slate');

  const [copiedNotification, setCopiedNotification] = useState(false);

  // Auto trigger print if requested
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  // Color accent mappings
  const accentStyles = {
    slate: {
      primaryBg: 'bg-black',
      primaryText: 'text-black',
      border: 'border-black',
      lightBg: 'bg-neutral-100',
      badgeBg: 'bg-neutral-900 text-white',
      ring: 'ring-black',
      highlightBorder: 'border-neutral-900',
    },
    navy: {
      primaryBg: 'bg-blue-900',
      primaryText: 'text-blue-950',
      border: 'border-blue-900',
      lightBg: 'bg-blue-50',
      badgeBg: 'bg-blue-900 text-white',
      ring: 'ring-blue-800',
      highlightBorder: 'border-blue-900',
    },
    emerald: {
      primaryBg: 'bg-emerald-800',
      primaryText: 'text-emerald-950',
      border: 'border-emerald-800',
      lightBg: 'bg-emerald-50',
      badgeBg: 'bg-emerald-800 text-white',
      ring: 'ring-emerald-700',
      highlightBorder: 'border-emerald-800',
    },
    crimson: {
      primaryBg: 'bg-rose-900',
      primaryText: 'text-rose-950',
      border: 'border-rose-900',
      lightBg: 'bg-rose-50',
      badgeBg: 'bg-rose-900 text-white',
      ring: 'ring-rose-800',
      highlightBorder: 'border-rose-900',
    },
  };

  const currentAccent = accentStyles[accent];

  // Invoice calculations
  const isWholesale = order.orderType === 'wholesale';
  const invoiceNum = order.invoiceNumber || order.id;
  const items = order.items || [];
  const rawSubtotal = items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
  
  // Tax calculations for GST: assumed GST 5% on foods or 18% on chemicals, split 50/50 CGST & SGST
  // For standard B2B FMCG invoice presentation:
  const gstRate = 5; // standard 5% on essential FMCG / edible oils / grains
  const taxableValue = Math.round((order.totalAmount / (1 + (gstRate / 100))) * 100) / 100;
  const totalTax = Math.round((order.totalAmount - taxableValue) * 100) / 100;
  const cgstAmount = Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;

  // Number to Indian words converter helper
  const convertNumberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const n = Math.floor(num);
    if (n === 0) return 'Zero Rupees Only';
    
    function inWords(nStr: number): string {
      if (nStr < 20) return a[nStr];
      const digit = nStr % 10;
      if (nStr < 100) return b[Math.floor(nStr / 10)] + (digit ? ' ' + a[digit] : '');
      if (nStr < 1000) return a[Math.floor(nStr / 100)] + 'Hundred ' + (nStr % 100 === 0 ? '' : 'and ' + inWords(nStr % 100));
      if (nStr < 100000) return inWords(Math.floor(nStr / 1000)) + 'Thousand ' + (nStr % 1000 !== 0 ? inWords(nStr % 1000) : '');
      if (nStr < 10000000) return inWords(Math.floor(nStr / 100000)) + 'Lakh ' + (nStr % 100000 !== 0 ? inWords(nStr % 100000) : '');
      return inWords(Math.floor(nStr / 10000000)) + 'Crore ' + (nStr % 10000000 !== 0 ? inWords(nStr % 10000000) : '');
    }

    return `${inWords(n).trim()} Rupees Only`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summary = `🧾 INVOICE #${invoiceNum}
Company: ${companyProfile.companyName} (GSTIN: ${companyProfile.gstin})
Customer: ${order.storeName}
Type: ${isWholesale ? 'Wholesale B2B' : 'Retail Direct'}
Total Amount: ₹${order.totalAmount.toLocaleString('en-IN')}
Status: ${order.paymentStatus} (${order.status})
Date: ${order.createdAt}
UPI: ${companyProfile.upiId}`;
    
    navigator.clipboard.writeText(summary);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  return (
    <div 
      id="invoice-modal-overlay" 
      className="fixed inset-0 z-50 bg-black/75 overflow-y-auto flex items-start justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto"
    >
      {/* Print-specific style overrides */}
      <style>{`
        @media print {
          @page {
            size: ${template === 'compact_slip' ? '80mm auto' : 'A4'};
            margin: ${template === 'compact_slip' ? '3mm' : '8mm 10mm'};
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #app-persistent-header,
          #header-system-bar,
          #app-footer,
          .print\\:hidden,
          #invoice-controls-panel {
            display: none !important;
          }
          #invoice-modal-overlay {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          #printable-invoice-container {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div 
        id="invoice-modal-wrapper" 
        className="w-full max-w-4xl bg-neutral-900 border-2 border-black shadow-2xl flex flex-col my-auto sm:my-6 print:border-none print:shadow-none print:my-0 print:bg-white"
      >
        {/* ========================================================================= */}
        {/* TOP CONTROL BAR (HIDDEN IN PRINT)                                          */}
        {/* ========================================================================= */}
        <div 
          id="invoice-controls-panel" 
          className="bg-black text-white p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-neutral-700 print:hidden"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-400 text-black flex items-center justify-center font-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">
                Billing System • Real-Time Invoicing
              </span>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Invoice {invoiceNum}
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                  isWholesale ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {isWholesale ? 'Wholesale B2B' : 'Retail Direct'}
                </span>
              </div>
            </div>
          </div>

          {/* Design Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
            {/* Template Selector */}
            <div className="flex items-center bg-neutral-800 p-1 border border-neutral-700">
              <span className="text-[10px] text-neutral-400 px-2 uppercase font-bold hidden sm:inline">Format:</span>
              <button
                type="button"
                id="btn-template-gst"
                onClick={() => setTemplate('gst_tax_invoice')}
                className={`px-2.5 py-1 text-xs font-bold uppercase transition-none cursor-pointer flex items-center gap-1 ${
                  template === 'gst_tax_invoice'
                    ? 'bg-white text-black'
                    : 'text-neutral-300 hover:text-white'
                }`}
                title="Detailed Indian GST Tax Invoice"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>GST Tax</span>
              </button>

              <button
                type="button"
                id="btn-template-minimal"
                onClick={() => setTemplate('modern_minimalist')}
                className={`px-2.5 py-1 text-xs font-bold uppercase transition-none cursor-pointer flex items-center gap-1 ${
                  template === 'modern_minimalist'
                    ? 'bg-white text-black'
                    : 'text-neutral-300 hover:text-white'
                }`}
                title="Clean modern border block invoice"
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Minimal</span>
              </button>

              <button
                type="button"
                id="btn-template-thermal"
                onClick={() => setTemplate('compact_slip')}
                className={`px-2.5 py-1 text-xs font-bold uppercase transition-none cursor-pointer flex items-center gap-1 ${
                  template === 'compact_slip'
                    ? 'bg-white text-black'
                    : 'text-neutral-300 hover:text-white'
                }`}
                title="Narrow thermal receipt slip"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Slip</span>
              </button>
            </div>

            {/* Accent Color Selector */}
            <div className="flex items-center gap-1 bg-neutral-800 p-1 border border-neutral-700">
              <span className="text-[10px] text-neutral-400 px-1 uppercase font-bold hidden md:inline">Accent:</span>
              <button
                type="button"
                onClick={() => setAccent('slate')}
                className={`w-5 h-5 rounded-none bg-neutral-900 border border-white cursor-pointer ${
                  accent === 'slate' ? 'ring-2 ring-amber-400 scale-110' : 'opacity-70'
                }`}
                title="Classic Slate / Black"
              />
              <button
                type="button"
                onClick={() => setAccent('navy')}
                className={`w-5 h-5 rounded-none bg-blue-900 border border-white cursor-pointer ${
                  accent === 'navy' ? 'ring-2 ring-amber-400 scale-110' : 'opacity-70'
                }`}
                title="Royal Navy"
              />
              <button
                type="button"
                onClick={() => setAccent('emerald')}
                className={`w-5 h-5 rounded-none bg-emerald-800 border border-white cursor-pointer ${
                  accent === 'emerald' ? 'ring-2 ring-amber-400 scale-110' : 'opacity-70'
                }`}
                title="Depot Emerald"
              />
              <button
                type="button"
                onClick={() => setAccent('crimson')}
                className={`w-5 h-5 rounded-none bg-rose-900 border border-white cursor-pointer ${
                  accent === 'crimson' ? 'ring-2 ring-amber-400 scale-110' : 'opacity-70'
                }`}
                title="Ruby Crimson"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                id="btn-copy-invoice-summary"
                onClick={handleCopySummary}
                className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 cursor-pointer"
                title="Copy text summary to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="btn-print-download-pdf"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs flex items-center gap-1.5 border border-black cursor-pointer shadow-sm active:translate-y-0.5"
                title="Download PDF or Print"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>

              <button
                type="button"
                id="btn-close-invoice-modal"
                onClick={onClose}
                className="p-1.5 bg-neutral-800 hover:bg-red-700 text-white border border-neutral-600 cursor-pointer"
                title="Close invoice modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Copy Notification Toast */}
        {copiedNotification && (
          <div className="bg-emerald-600 text-white text-xs font-mono py-1 px-4 text-center font-bold print:hidden">
            ✓ Invoice details copied to clipboard!
          </div>
        )}

        {/* ========================================================================= */}
        {/* INVOICE PAPER CANVAS (PRINTABLE)                                          */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-6 bg-neutral-200 overflow-x-auto flex justify-center print:p-0 print:bg-white">
          <div 
            id="printable-invoice-container" 
            className={`bg-white shadow-xl text-neutral-900 font-sans transition-all duration-150 ${
              template === 'compact_slip' ? 'w-[360px] p-4 text-xs' : 'w-full max-w-3xl p-6 sm:p-8'
            }`}
          >
            {/* --------------------------------------------------------------------- */}
            {/* TEMPLATE 1: GST TAX INVOICE (Detailed B2B Table)                      */}
            {/* --------------------------------------------------------------------- */}
            {template === 'gst_tax_invoice' && (
              <div id="invoice-template-gst" className="border-2 border-black text-xs font-mono leading-tight">
                {/* Title Header */}
                <div className={`p-2.5 text-center text-white font-black uppercase tracking-wider text-sm ${currentAccent.primaryBg}`}>
                  TAX INVOICE (RULE 46 OF CGST RULES, 2017)
                  <span className="block text-[10px] font-normal tracking-normal text-neutral-200 mt-0.5">
                    Original for Recipient • Triplicate for Transporter
                  </span>
                </div>

                {/* Company & Recipient Meta Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-black divide-y sm:divide-y-0 sm:divide-x-2 divide-black">
                  {/* Supplier Info */}
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      {companyProfile.logoUrl ? (
                        <img 
                          src={companyProfile.logoUrl} 
                          alt="Logo" 
                          referrerPolicy="no-referrer"
                          className="h-10 w-auto object-contain max-w-[120px]" 
                        />
                      ) : (
                        <div className={`w-8 h-8 ${currentAccent.primaryBg} text-white flex items-center justify-center font-black text-sm`}>
                          {companyProfile.companyName.slice(0, 1) || 'A'}
                        </div>
                      )}
                      <div>
                        <span className="font-black text-sm uppercase block text-black">
                          {companyProfile.companyName}
                        </span>
                        <span className="text-[10px] text-neutral-600 block">FMCG Super Stockist & Wholesale Depot</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-700 pt-1 space-y-0.5">
                      <p>📍 {companyProfile.businessAddress}</p>
                      <p>📞 Phone: {companyProfile.contactNumber} | ✉️ {companyProfile.email}</p>
                      <p className="font-bold text-black">
                        GSTIN / UIN: <span className="underline">{companyProfile.gstin}</span>
                      </p>
                      <p className="text-[10px] text-neutral-500">State: 07-Delhi (State Code: 07)</p>
                    </div>
                  </div>

                  {/* Invoice & Buyer Info */}
                  <div className="p-3 space-y-1.5 bg-neutral-50">
                    <div className="grid grid-cols-2 gap-2 pb-1 border-b border-neutral-300">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-neutral-500 block">Invoice Number:</span>
                        <span className="font-black text-black text-sm block">{invoiceNum}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-neutral-500 block">Invoice Date:</span>
                        <span className="font-bold text-black block">{order.createdAt}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">Bill To / Buyer:</span>
                      <span className="font-black text-black block text-xs">{order.storeName}</span>
                      {order.customerName && (
                        <span className="text-[10px] text-neutral-600 block">Attn: {order.customerName}</span>
                      )}
                      {order.customerMobile && (
                        <span className="text-[10px] text-neutral-600 block">Contact: {order.customerMobile}</span>
                      )}
                      {order.deliveryAddress && (
                        <span className="text-[10px] text-neutral-600 block">Delivery: {order.deliveryAddress}</span>
                      )}
                      <p className="font-bold text-black text-[10px] mt-0.5">
                        Buyer GSTIN: {order.retailerGstin || (isWholesale ? '07BBRPA1234D1Z2' : 'URP (Unregistered)')}
                      </p>
                      {order.salesmanName && (
                        <p className="text-[10px] text-blue-900 font-bold">
                          Assigned Rep: {order.salesmanName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border-b-2 border-black text-[11px]">
                    <thead>
                      <tr className={`${currentAccent.primaryBg} text-white font-bold uppercase select-none text-[10px]`}>
                        <th className="p-1.5 border-r border-neutral-600 text-center w-8">#</th>
                        <th className="p-1.5 border-r border-neutral-600">Description of Goods</th>
                        <th className="p-1.5 border-r border-neutral-600 text-center">HSN</th>
                        <th className="p-1.5 border-r border-neutral-600 text-center">Qty</th>
                        <th className="p-1.5 border-r border-neutral-600 text-right">Rate (₹)</th>
                        <th className="p-1.5 border-r border-neutral-600 text-right">Taxable (₹)</th>
                        <th className="p-1.5 border-r border-neutral-600 text-right">CGST (2.5%)</th>
                        <th className="p-1.5 border-r border-neutral-600 text-right">SGST (2.5%)</th>
                        <th className="p-1.5 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-300">
                      {items.map((it, idx) => {
                        const lineTaxable = Math.round((it.total / 1.05) * 100) / 100;
                        const lineCgst = Math.round(((it.total - lineTaxable) / 2) * 100) / 100;
                        const lineSgst = Math.round((it.total - lineTaxable - lineCgst) * 100) / 100;

                        return (
                          <tr key={idx} className="hover:bg-neutral-50">
                            <td className="p-1.5 border-r border-black text-center">{idx + 1}</td>
                            <td className="p-1.5 border-r border-black">
                              <span className="font-bold text-black block">{it.productName}</span>
                              {it.wholesaleScheme && (
                                <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 inline-block mt-0.5">
                                  Deal: {it.wholesaleScheme}
                                </span>
                              )}
                              {it.retailOffer && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-1 py-0.2 inline-block mt-0.5">
                                  Offer: {it.retailOffer}
                                </span>
                              )}
                            </td>
                            <td className="p-1.5 border-r border-black text-center text-neutral-600 font-mono">
                              {it.hsn || '2106'}
                            </td>
                            <td className="p-1.5 border-r border-black text-center font-bold">
                              {it.quantity}
                            </td>
                            <td className="p-1.5 border-r border-black text-right">
                              ₹{it.unitPrice.toFixed(2)}
                            </td>
                            <td className="p-1.5 border-r border-black text-right text-neutral-700">
                              ₹{lineTaxable.toFixed(2)}
                            </td>
                            <td className="p-1.5 border-r border-black text-right text-neutral-700">
                              ₹{lineCgst.toFixed(2)}
                            </td>
                            <td className="p-1.5 border-r border-black text-right text-neutral-700">
                              ₹{lineSgst.toFixed(2)}
                            </td>
                            <td className="p-1.5 text-right font-bold text-black">
                              ₹{it.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-neutral-100 font-bold border-t-2 border-black text-[11px]">
                        <td colSpan={3} className="p-2 border-r border-black text-right uppercase">
                          Total Invoice Value:
                        </td>
                        <td className="p-2 border-r border-black text-center">
                          {items.reduce((s, it) => s + it.quantity, 0)}
                        </td>
                        <td className="p-2 border-r border-black"></td>
                        <td className="p-2 border-r border-black text-right">
                          ₹{taxableValue.toFixed(2)}
                        </td>
                        <td className="p-2 border-r border-black text-right">
                          ₹{cgstAmount.toFixed(2)}
                        </td>
                        <td className="p-2 border-r border-black text-right">
                          ₹{sgstAmount.toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-black text-black text-xs">
                          ₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Amount in Words */}
                <div className="p-2.5 bg-neutral-50 border-b border-black text-[11px]">
                  <span className="font-bold uppercase text-neutral-600 mr-2">Amount in Words:</span>
                  <span className="font-black text-black underline">
                    {convertNumberToWords(order.totalAmount)}
                  </span>
                </div>

                {/* Bottom Section: Bank Details + Terms + Signatory */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-black">
                  {/* Left: Bank Info & Payment QR */}
                  <div className="p-3 space-y-2">
                    <div>
                      <span className="font-bold text-[10px] uppercase text-neutral-600 block">
                        Settlement & Bank Info:
                      </span>
                      <div className="mt-1 space-y-0.5 text-[10px] text-neutral-800">
                        <p>Bank: <strong className="text-black">{companyProfile.bankName}</strong></p>
                        <p>A/C No: <strong className="text-black font-mono">{companyProfile.accountNumber}</strong></p>
                        <p>IFSC: <strong className="text-black font-mono">{companyProfile.ifscCode}</strong></p>
                        <p>UPI ID: <strong className="text-black font-mono">{companyProfile.upiId}</strong></p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-300">
                      <span className="font-bold text-[9px] uppercase text-neutral-500 block">
                        Terms & Conditions:
                      </span>
                      <p className="text-[9px] text-neutral-600 whitespace-pre-line mt-0.5">
                        {companyProfile.termsAndConditions}
                      </p>
                    </div>
                  </div>

                  {/* Right: UPI QR Representation & Signatory Box */}
                  <div className="p-3 flex flex-col justify-between bg-neutral-50/50">
                    <div className="flex items-center gap-3 pb-2 border-b border-neutral-200">
                      {/* Styled Vector QR Code Box */}
                      <div className="w-16 h-16 border-2 border-black bg-white p-1 flex flex-col items-center justify-center flex-shrink-0">
                        <QrCode className="w-10 h-10 text-black" />
                        <span className="text-[7px] font-black uppercase text-center leading-none mt-0.5">Scan UPI</span>
                      </div>
                      <div className="text-[10px] space-y-0.5">
                        <span className="font-bold text-black uppercase block">Instant Digital Payment</span>
                        <p className="text-neutral-600 text-[9px]">Scan with GPay, PhonePe, Paytm, or BHIM</p>
                        <span className="text-[9px] font-mono bg-neutral-200 px-1 py-0.2 block truncate">
                          {companyProfile.upiId}
                        </span>
                      </div>
                    </div>

                    {/* Signatory Box */}
                    <div className="mt-4 pt-3 text-right">
                      <p className="text-[9px] text-neutral-500 uppercase font-bold">
                        {companyProfile.companyName}
                      </p>
                      <div className="h-10"></div>
                      <p className="font-bold text-[10px] text-black border-t border-dashed border-black pt-1 inline-block">
                        {companyProfile.signatoryText || 'Authorized Signatory'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* TEMPLATE 2: MODERN MINIMALIST (Clean Block Design)                     */}
            {/* --------------------------------------------------------------------- */}
            {template === 'modern_minimalist' && (
              <div id="invoice-template-modern" className="space-y-6">
                {/* Modern Header */}
                <div className={`p-4 border-2 ${currentAccent.border} ${currentAccent.lightBg} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                  <div className="flex items-center gap-3">
                    {companyProfile.logoUrl ? (
                      <img 
                        src={companyProfile.logoUrl} 
                        alt="Logo" 
                        referrerPolicy="no-referrer"
                        className="h-12 w-auto object-contain max-w-[140px]" 
                      />
                    ) : (
                      <div className={`w-12 h-12 ${currentAccent.primaryBg} text-white flex items-center justify-center font-black text-xl`}>
                        {companyProfile.companyName.slice(0, 1) || 'A'}
                      </div>
                    )}
                    <div>
                      <h1 className="text-lg font-black uppercase tracking-tight text-neutral-900 leading-tight">
                        {companyProfile.companyName}
                      </h1>
                      <p className="text-xs font-mono text-neutral-600">{companyProfile.businessAddress}</p>
                      <p className="text-xs font-mono text-neutral-700">
                        GSTIN: <strong>{companyProfile.gstin}</strong> • Phone: {companyProfile.contactNumber}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-300">
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-mono font-bold uppercase ${currentAccent.badgeBg}`}>
                      {isWholesale ? 'WHOLESALE B2B INVOICE' : 'RETAIL ORDER INVOICE'}
                    </span>
                    <p className="text-xl font-black text-neutral-900 mt-1 font-mono">{invoiceNum}</p>
                    <p className="text-xs text-neutral-500 font-mono">Date: {order.createdAt}</p>
                  </div>
                </div>

                {/* Recipient & Dispatch Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-neutral-300 p-3 bg-neutral-50">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase font-bold block mb-1">
                      Customer / Recipient:
                    </span>
                    <p className="font-bold text-sm text-neutral-900">{order.storeName}</p>
                    {order.customerName && (
                      <p className="text-xs text-neutral-700">Customer: {order.customerName}</p>
                    )}
                    {order.customerMobile && (
                      <p className="text-xs text-neutral-700">Mobile: {order.customerMobile}</p>
                    )}
                    {order.deliveryAddress && (
                      <p className="text-xs text-neutral-600 mt-1">📍 {order.deliveryAddress}</p>
                    )}
                  </div>

                  <div className="border border-neutral-300 p-3 bg-neutral-50 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase font-bold block mb-1">
                        Dispatch & Agent Info:
                      </span>
                      <p className="text-xs font-mono text-neutral-800">
                        Sales Representative: <strong>{order.salesmanName || 'Direct Order'}</strong>
                      </p>
                      <p className="text-xs font-mono text-neutral-800">
                        Payment Status: <strong className="uppercase">{order.paymentStatus}</strong>
                      </p>
                      <p className="text-xs font-mono text-neutral-800">
                        Fulfillment: <strong className="uppercase">{order.status}</strong>
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-neutral-200 text-[10px] text-neutral-500 font-mono">
                      Depot Verification: Certified Authentic Stock
                    </div>
                  </div>
                </div>

                {/* Modern Itemized Table */}
                <div className="border-2 border-neutral-900 overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className={`${currentAccent.primaryBg} text-white uppercase text-[11px]`}>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-center">HSN</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Rate</th>
                        <th className="p-2.5 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50">
                          <td className="p-2.5">
                            <span className="font-bold text-neutral-900 block">{it.productName}</span>
                            {it.wholesaleScheme && (
                              <span className="inline-block mt-0.5 text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 border border-amber-300 font-medium">
                                Applied Wholesale Deal: {it.wholesaleScheme}
                              </span>
                            )}
                            {it.retailOffer && (
                              <span className="inline-block mt-0.5 text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 border border-emerald-300 font-medium">
                                Applied Retail Offer: {it.retailOffer}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center text-neutral-600">{it.hsn || '2106'}</td>
                          <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-right">₹{it.unitPrice.toFixed(2)}</td>
                          <td className="p-2.5 text-right font-black text-neutral-900">
                            ₹{it.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total & Savings Highlight */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Offer Highlight Box */}
                    <div className="p-3 bg-emerald-50 border border-emerald-300 text-xs font-mono text-emerald-900">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Dynamic Dual-Tier Offers Applied</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        {isWholesale 
                          ? 'Wholesale depot schemes, tiered margin rates, and case bonus benefits have been locked into this bill.' 
                          : 'Retail promotional offers, customer store discounts, and instant rate adjustments are reflected in this receipt.'
                        }
                      </p>
                    </div>

                    {/* Bank Info */}
                    <div className="p-3 bg-neutral-50 border border-neutral-300 text-xs font-mono space-y-1">
                      <span className="font-bold text-neutral-800 uppercase block text-[10px]">
                        Direct Bank Transfer Details:
                      </span>
                      <p>Bank: {companyProfile.bankName} | A/C: <strong>{companyProfile.accountNumber}</strong></p>
                      <p>IFSC: <strong>{companyProfile.ifscCode}</strong> | UPI: <strong>{companyProfile.upiId}</strong></p>
                    </div>
                  </div>

                  {/* Grand Total Box */}
                  <div className={`w-full sm:w-64 border-2 ${currentAccent.border} p-4 bg-neutral-50 font-mono space-y-2`}>
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span>Items Subtotal:</span>
                      <span>₹{rawSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span>Taxes & Duties:</span>
                      <span>Included</span>
                    </div>
                    <div className="pt-2 border-t-2 border-black flex justify-between items-baseline">
                      <span className="font-black text-sm uppercase">Total Due:</span>
                      <span className={`text-xl font-black ${currentAccent.primaryText}`}>
                        ₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-500 text-right uppercase">
                      Payment: {order.paymentStatus}
                    </div>
                  </div>
                </div>

                {/* Footer Signature */}
                <div className="pt-4 border-t border-neutral-300 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-neutral-500 gap-2">
                  <p>Thank you for your business. For billing queries, contact {companyProfile.contactNumber}.</p>
                  <p className="font-bold text-neutral-800 uppercase">Authorized Depot Distribution Copy</p>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* TEMPLATE 3: COMPACT SLIP (Thermal Receipt Format)                      */}
            {/* --------------------------------------------------------------------- */}
            {template === 'compact_slip' && (
              <div id="invoice-template-thermal" className="font-mono text-center space-y-2 leading-tight">
                {/* Header */}
                <div className="space-y-1 pb-2 border-b border-dashed border-black">
                  {companyProfile.logoUrl && (
                    <img 
                      src={companyProfile.logoUrl} 
                      alt="Logo" 
                      referrerPolicy="no-referrer"
                      className="h-8 w-auto object-contain mx-auto" 
                    />
                  )}
                  <h2 className="text-sm font-black uppercase tracking-tight text-black">
                    {companyProfile.companyName}
                  </h2>
                  <p className="text-[10px] text-neutral-600">{companyProfile.businessAddress}</p>
                  <p className="text-[10px] text-neutral-800">GSTIN: {companyProfile.gstin}</p>
                  <p className="text-[10px] text-neutral-800">Phone: {companyProfile.contactNumber}</p>
                </div>

                {/* Meta details */}
                <div className="text-[10px] text-left space-y-0.5 py-1 border-b border-dashed border-black">
                  <div className="flex justify-between">
                    <span>Receipt #:</span>
                    <span className="font-bold">{invoiceNum}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{order.createdAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold truncate max-w-[180px]">{order.storeName}</span>
                  </div>
                  {order.customerMobile && (
                    <div className="flex justify-between">
                      <span>Mobile:</span>
                      <span>{order.customerMobile}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="uppercase font-bold">{order.orderType}</span>
                  </div>
                  {order.salesmanName && (
                    <div className="flex justify-between">
                      <span>Rep:</span>
                      <span>{order.salesmanName}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="py-1 border-b border-dashed border-black text-left">
                  <div className="flex justify-between text-[10px] font-black uppercase pb-1 border-b border-neutral-300">
                    <span>ITEM [QTY]</span>
                    <span>TOTAL</span>
                  </div>
                  <div className="divide-y divide-neutral-100 py-1 space-y-1">
                    {items.map((it, idx) => (
                      <div key={idx} className="pt-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold">{it.productName}</span>
                          <span className="font-mono">₹{it.total.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-neutral-500">
                          <span>{it.quantity} × ₹{it.unitPrice}</span>
                          {it.wholesaleScheme && <span className="text-amber-800 font-bold truncate max-w-[140px]">{it.wholesaleScheme}</span>}
                          {it.retailOffer && <span className="text-emerald-800 font-bold truncate max-w-[140px]">{it.retailOffer}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="py-2 border-b-2 border-black space-y-1 text-right">
                  <div className="flex justify-between text-xs">
                    <span>Subtotal:</span>
                    <span>₹{rawSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black pt-1 border-t border-neutral-300">
                    <span className="uppercase">Net Payable:</span>
                    <span className="text-base">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-[10px] text-neutral-600">
                    Payment Mode: {order.paymentStatus === 'PAID' ? 'PAID / PRE-SETTLED' : 'CASH / COD ON DELIVERY'}
                  </div>
                </div>

                {/* QR Code & Footer */}
                <div className="pt-2 space-y-1 text-center">
                  <div className="inline-block p-1 bg-white border border-black">
                    <QrCode className="w-12 h-12 mx-auto text-black" />
                  </div>
                  <p className="text-[9px] font-bold">UPI: {companyProfile.upiId}</p>
                  <p className="text-[9px] text-neutral-500 uppercase mt-2">
                    THANK YOU FOR SHOPPING!
                  </p>
                  <p className="text-[8px] text-neutral-400">
                    Goods once sold will not be returned without bill.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
