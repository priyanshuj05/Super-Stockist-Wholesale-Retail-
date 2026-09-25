import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Order, CompanyProfile } from '../types.ts';
import { 
  X, 
  Copy, 
  Check, 
  Printer, 
  ExternalLink, 
  QrCode, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  DollarSign, 
  Building2, 
  ShoppingBag,
  Clock,
  ArrowRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

interface UpiCheckoutModalProps {
  order: Order;
  companyProfile: CompanyProfile;
  onClose: () => void;
  onMarkPaid?: (orderId: string) => void;
  onOpenInvoice?: (order: Order) => void;
}

export const UpiCheckoutModal: React.FC<UpiCheckoutModalProps> = ({
  order,
  companyProfile,
  onClose,
  onMarkPaid,
  onOpenInvoice,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUpiId, setCopiedUpiId] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [justMarkedPaid, setJustMarkedPaid] = useState(false);

  const invoiceNumber = order.invoiceNumber || order.id;
  const payeeVpa = companyProfile.upiId || 'apexstockist@sbi';
  const payeeName = companyProfile.companyName || 'Apex FMCG Distributors';
  const amountStr = order.totalAmount.toFixed(2);
  const transactionNote = `Bill ${invoiceNumber} ${order.storeName || ''}`.trim().slice(0, 50);

  // Standard NPCI UPI URI Specification:
  // upi://pay?pa=<vpa>&pn=<payee_name>&am=<amount>&cu=INR&tn=<note>
  const upiPayload = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(upiPayload);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(payeeVpa);
    setCopiedUpiId(true);
    setTimeout(() => setCopiedUpiId(false), 2500);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleConfirmPaid = () => {
    if (onMarkPaid) {
      onMarkPaid(order.id);
      setJustMarkedPaid(true);
    }
  };

  const isPaid = order.paymentStatus === 'PAID' || justMarkedPaid;
  const isWholesale = (order.orderType || 'wholesale') === 'wholesale';

  return (
    <div 
      id="upi-checkout-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div 
        id="upi-checkout-card"
        className={`bg-white border-4 border-black w-full shadow-2xl transition-all font-mono ${
          isFullscreen 
            ? 'max-w-4xl min-h-[90vh] flex flex-col justify-between' 
            : 'max-w-xl'
        }`}
      >
        {/* Header Bar */}
        <div className="bg-black text-white p-3 sm:p-4 flex items-center justify-between border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-400 text-black flex items-center justify-center border border-black font-black flex-shrink-0">
              <QrCode className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
                  Counter UPI Checkout
                </span>
                <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-bold uppercase">
                  Dynamic QR
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Customer & Retail Store Owner Instant Scan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="btn-toggle-fullscreen-qr"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen Counter Mode' : 'Customer Counter Fullscreen Display'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              id="btn-close-upi-modal"
              onClick={onClose}
              className="p-1.5 bg-neutral-800 hover:bg-red-700 text-white border border-neutral-600 cursor-pointer"
              title="Close UPI QR Code"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Order Summary Ribbon */}
          <div className="border-2 border-black bg-neutral-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-black text-black text-sm uppercase">
                  {order.storeName || 'Walk-in Retail Customer'}
                </span>
                <span className={`px-1.5 py-0.2 text-[9px] font-black uppercase border ${
                  isWholesale 
                    ? 'bg-blue-100 text-blue-900 border-blue-400' 
                    : 'bg-emerald-100 text-emerald-900 border-emerald-400'
                }`}>
                  {isWholesale ? 'Wholesale' : 'Retail'}
                </span>
              </div>
              <div className="text-[11px] text-neutral-600 flex items-center gap-2 flex-wrap">
                <span>Invoice: <strong>{invoiceNumber}</strong></span>
                <span>•</span>
                <span>Date: {order.createdAt}</span>
                {order.salesmanName && (
                  <>
                    <span>•</span>
                    <span>Rep: {order.salesmanName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Payment Status Pill */}
            <div className="text-right flex-shrink-0">
              <span className={`px-2.5 py-1 text-xs font-black uppercase border-2 block ${
                isPaid 
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-600' 
                  : 'bg-amber-100 text-amber-900 border-amber-600 animate-pulse'
              }`}>
                {isPaid ? '✓ PAYMENT RECEIVED' : '● AWAITING UPI PAYMENT'}
              </span>
            </div>
          </div>

          {/* Dynamic QR Code & Amount Display Card */}
          <div className="border-3 border-black bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-around gap-6">
              
              {/* QR Code Container */}
              <div className="flex flex-col items-center space-y-3">
                <div 
                  id="dynamic-upi-qrcode-container"
                  className="p-3 bg-white border-4 border-black shadow-md flex items-center justify-center relative"
                >
                  <QRCodeSVG
                    value={upiPayload}
                    size={isFullscreen ? 280 : 210}
                    level="H"
                    includeMargin={true}
                  />
                  {/* Subtle Center Brand Pill */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black text-amber-300 font-mono text-[9px] font-black px-1.5 py-0.5 border border-white shadow-xs">
                      UPI
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-center flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-neutral-700" />
                  Point Phone Camera or UPI App
                </span>
              </div>

              {/* Amount Breakdown & Payee Details */}
              <div className="flex-1 space-y-3 text-left w-full">
                <div className="border-b-2 border-black pb-3">
                  <span className="text-xs uppercase text-neutral-500 font-bold block mb-0.5">
                    Total Amount Due:
                  </span>
                  <div className="flex items-baseline gap-1 text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight">
                    <span>₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <span className="text-[11px] text-emerald-800 font-bold block mt-1">
                    Exact invoice total encoded in dynamic QR code
                  </span>
                </div>

                {/* Payee Info */}
                <div className="space-y-1.5 text-xs text-neutral-700 bg-neutral-50 p-3 border border-neutral-300">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 text-[10px] uppercase font-bold">Beneficiary:</span>
                    <strong className="text-neutral-900 text-right truncate max-w-[200px]">{payeeName}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-neutral-500 text-[10px] uppercase font-bold">UPI VPA:</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-black">
                      <span>{payeeVpa}</span>
                      <button
                        type="button"
                        id="btn-copy-upi-id"
                        onClick={handleCopyUpiId}
                        className="p-1 hover:bg-neutral-200 text-neutral-600 rounded-none cursor-pointer"
                        title="Copy UPI ID"
                      >
                        {copiedUpiId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  {companyProfile.bankName && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold">Bank / IFSC:</span>
                      <span className="text-neutral-800">{companyProfile.bankName} ({companyProfile.ifscCode})</span>
                    </div>
                  )}
                </div>

                {/* Supported Apps Badges */}
                <div className="pt-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1.5">
                    Accepted Payment Apps:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'Cred', 'Amazon Pay'].map((app) => (
                      <span 
                        key={app} 
                        className="px-1.5 py-0.5 bg-neutral-200 text-neutral-800 text-[9px] font-bold uppercase border border-neutral-400"
                      >
                        {app}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Quick Line Items Review */}
          <div className="border border-neutral-300 bg-neutral-50 p-2.5 text-xs">
            <div className="flex items-center justify-between font-bold text-neutral-800 mb-1 border-b border-neutral-200 pb-1">
              <span className="uppercase text-[10px] text-neutral-600">
                Items in this Bill ({order.items.length} line items):
              </span>
              <span>{order.items.reduce((sum, it) => sum + it.quantity, 0)} Total Units</span>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[11px]">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-neutral-700">
                  <span className="truncate max-w-[280px]">
                    {it.productName} <span className="text-neutral-500">× {it.quantity}</span>
                  </span>
                  <span className="font-bold text-neutral-900">
                    ₹{it.total.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                id="btn-copy-upi-payload"
                onClick={handleCopyLink}
                className="flex-1 sm:flex-initial px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border-2 border-black font-bold uppercase text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'URI Copied!' : 'Copy UPI Link'}</span>
              </button>

              <button
                type="button"
                id="btn-print-qr-slip"
                onClick={handlePrintSlip}
                className="flex-1 sm:flex-initial px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border-2 border-black font-bold uppercase text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                title="Print thermal counter checkout slip"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onOpenInvoice && (
                <button
                  type="button"
                  id="btn-switch-full-invoice"
                  onClick={() => {
                    onClose();
                    onOpenInvoice(order);
                  }}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-white hover:bg-neutral-100 text-black border-2 border-black font-bold uppercase text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>View Full Bill</span>
                </button>
              )}

              {!isPaid && onMarkPaid && (
                <button
                  type="button"
                  id="btn-mark-order-paid-now"
                  onClick={handleConfirmPaid}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white border-2 border-black font-black uppercase text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:translate-y-0.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Mark as Paid</span>
                </button>
              )}

              {isPaid && (
                <div className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-100 text-emerald-900 border-2 border-emerald-600 font-black uppercase text-xs flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Paid & Settled</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Safety & Checkout Banner */}
        <div className="bg-neutral-100 border-t-2 border-black p-3 text-center text-[10px] text-neutral-600 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Real-time instant clearance directly into distributor bank account. No aggregator gateway deductions.</span>
        </div>
      </div>
    </div>
  );
};
