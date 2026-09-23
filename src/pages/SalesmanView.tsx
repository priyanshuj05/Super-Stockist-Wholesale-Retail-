import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Order } from '../types.ts';
import { InvoiceModal } from '../components/InvoiceModal.tsx';
import { 
  Target, 
  IndianRupee, 
  Star, 
  ShoppingCart, 
  AlertCircle, 
  Check, 
  Plus, 
  Minus, 
  X,
  CreditCard,
  Building2,
  PackageCheck,
  ChevronRight,
  Flame,
  FileText,
  Printer,
  Eye
} from 'lucide-react';

export function SalesmanView() {
  const { 
    salesman, 
    products, 
    issues, 
    orders,
    createOrder, 
    addIssue, 
    recordCollection 
  } = useApp();

  // 1. Focus Products (filter for top alert banner)
  const focusProducts = products.filter((p) => p.isFocusProduct);

  // 2. Order Booking State
  const [shopName, setShopName] = useState('Gupta General Store');
  const [customShopInput, setCustomShopInput] = useState('');
  const [retailerGstin, setRetailerGstin] = useState('');
  const [orderQuantities, setOrderQuantities] = useState<{ [productId: string]: number }>({});
  const [orderSuccessBanner, setOrderSuccessBanner] = useState<{
    orderId: string;
    storeName: string;
    totalAmount: number;
    itemCount: number;
  } | null>(null);
  const [orderError, setOrderError] = useState('');

  // Invoice Modal State for Salesman
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false);

  // 3. Collection Entry Modal / Drawer State
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionShopName, setCollectionShopName] = useState('Gupta General Store');
  const [collectionAmount, setCollectionAmount] = useState<number | ''>('');
  const [collectionMode, setCollectionMode] = useState<'Cash' | 'UPI' | 'Cheque'>('Cash');
  const [collectionRefNo, setCollectionRefNo] = useState('');
  const [collectionSuccessMsg, setCollectionSuccessMsg] = useState('');
  const [collectionError, setCollectionError] = useState('');

  // 4. Problem / Escalation Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueShopName, setIssueShopName] = useState('Gupta General Store');
  const [issueCategory, setIssueCategory] = useState<
    'Damaged / Expired Goods' | 'Payment Dispute' | 'Retailer Closed' | 'Competitor Low Price'
  >('Payment Dispute');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSuccessMsg, setIssueSuccessMsg] = useState('');
  const [issueError, setIssueError] = useState('');

  // Target percentages
  const salesPercentage = salesman.targetSales > 0 
    ? Math.round((salesman.achievedSales / salesman.targetSales) * 100) 
    : 0;
  const collectionPercentage = salesman.targetCollection > 0 
    ? Math.round((salesman.achievedCollection / salesman.targetCollection) * 100) 
    : 0;

  // Calculate order metrics
  const selectedProductIds = Object.keys(orderQuantities).filter(
    (id) => (orderQuantities[id] || 0) > 0
  );

  const calculateTotalOrderValue = () => {
    return selectedProductIds.reduce((sum, pid) => {
      const prod = products.find((p) => p.id === pid);
      const qty = orderQuantities[pid] || 0;
      return sum + (prod ? prod.wholesalePrice * qty : 0);
    }, 0);
  };

  const calculateTotalUnits = () => {
    return selectedProductIds.reduce((sum, pid) => sum + (orderQuantities[pid] || 0), 0);
  };

  // Helper for quantity adjustments
  const handleQuantityChange = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setOrderQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      // Validate depot stock upper limit
      const validated = Math.min(prod.stock, next);
      return { ...prev, [productId]: validated };
    });
  };

  const handleDirectQuantityInput = (productId: string, valueStr: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const val = parseInt(valueStr, 10);
    if (isNaN(val) || val <= 0) {
      setOrderQuantities((prev) => ({ ...prev, [productId]: 0 }));
      return;
    }
    const validated = Math.min(prod.stock, val);
    setOrderQuantities((prev) => ({ ...prev, [productId]: validated }));
  };

  // 3. Wholesale Order Booking Handler
  const handlePunchOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError('');

    const targetShop = customShopInput.trim() || shopName.trim();
    if (!targetShop) {
      setOrderError('Please select or specify a Retailer / Shop Name.');
      return;
    }

    if (selectedProductIds.length === 0) {
      setOrderError('Please select quantity for at least one product.');
      return;
    }

    // Validate that stock is available for each item
    for (const pid of selectedProductIds) {
      const prod = products.find((p) => p.id === pid);
      const reqQty = orderQuantities[pid] || 0;
      if (!prod || prod.stock < reqQty) {
        setOrderError(`Depot has insufficient stock for ${prod ? prod.name : 'product'} (Available: ${prod?.stock || 0}).`);
        return;
      }
    }

    // Build order items using WHOLESALE PRICE ONLY with GST HSN & Schemes
    const items = selectedProductIds.map((pid) => {
      const prod = products.find((p) => p.id === pid)!;
      const qty = orderQuantities[pid] || 0;
      return {
        productId: pid,
        productName: prod.name,
        quantity: qty,
        unitPrice: prod.wholesalePrice,
        total: prod.wholesalePrice * qty,
        hsn: prod.hsn || '2106',
        wholesaleScheme: prod.wholesaleScheme,
      };
    });

    const totalVal = calculateTotalOrderValue();
    const totalUnits = calculateTotalUnits();

    // Create Order with orderType: 'wholesale' and salesman attribution
    const newOrderId = createOrder({
      storeName: targetShop,
      retailerGstin: retailerGstin.trim() ? retailerGstin.trim().toUpperCase() : undefined,
      items,
      totalAmount: totalVal,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      salesmanId: salesman.id,
      salesmanName: salesman.name,
      orderType: 'wholesale',
    });

    // Clear selected items and show confirmation banner
    setOrderQuantities({});
    setOrderSuccessBanner({
      orderId: newOrderId,
      storeName: targetShop,
      totalAmount: totalVal,
      itemCount: totalUnits,
    });

    // Auto dismiss error if any
    setOrderError('');
  };

  // 4. Collection Entry Handler
  const handleRecordCollection = (e: React.FormEvent) => {
    e.preventDefault();
    setCollectionError('');

    const amt = typeof collectionAmount === 'number' ? collectionAmount : parseFloat(collectionAmount);
    if (!amt || amt <= 0) {
      setCollectionError('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    if (!collectionShopName.trim()) {
      setCollectionError('Shop Name is required.');
      return;
    }

    // Add directly to salesman's achievedCollection
    recordCollection(amt);

    const refText = collectionRefNo.trim() ? ` (Ref: ${collectionRefNo.trim()})` : '';
    setCollectionSuccessMsg(
      `✓ Successfully recorded ${collectionMode} collection of ₹${amt.toLocaleString('en-IN')} from ${collectionShopName}${refText}`
    );

    // Reset Form
    setCollectionAmount('');
    setCollectionRefNo('');
    setShowCollectionModal(false);

    setTimeout(() => {
      setCollectionSuccessMsg('');
    }, 5000);
  };

  // 5. Problem / Escalation Submit Handler
  const handleMarkProblem = (e: React.FormEvent) => {
    e.preventDefault();
    setIssueError('');

    if (!issueShopName.trim()) {
      setIssueError('Shop Name is required.');
      return;
    }

    if (!issueDescription.trim()) {
      setIssueError('Please provide details/description of the problem.');
      return;
    }

    // Add to global issues list
    addIssue({
      salesmanName: salesman.name,
      shopName: issueShopName.trim(),
      category: issueCategory,
      description: issueDescription.trim(),
      status: 'OPEN',
    });

    setIssueSuccessMsg(`✓ Ticket for "${issueCategory}" at ${issueShopName.trim()} submitted to Admin Dashboard.`);
    setIssueDescription('');
    setShowIssueModal(false);

    setTimeout(() => {
      setIssueSuccessMsg('');
    }, 5000);
  };

  return (
    <div id="view-salesman-mobile" className="w-full max-w-md mx-auto p-3 sm:p-4 space-y-4 font-sans">
      {/* Salesman Top Sub-Header */}
      <div className="bg-white border-2 border-black p-3 flex items-center justify-between">
        <div>
          <div className="inline-block bg-black text-white text-[10px] font-mono font-bold px-1.5 py-0.2 uppercase">
            FIELD TERMINAL
          </div>
          <h2 className="text-base font-black uppercase tracking-tight text-neutral-900 mt-0.5">
            {salesman.name}
          </h2>
          <p className="text-[11px] font-mono text-neutral-600">Route: Main Bazaar & Town Center</p>
        </div>

        <div className="text-right font-mono">
          <span className="text-[10px] text-neutral-500 block uppercase">Mode</span>
          <span className="text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-400 px-1.5 py-0.5">
            ONLINE
          </span>
        </div>
      </div>

      {/* Global Success Messages */}
      {collectionSuccessMsg && (
        <div id="banner-collection-success" className="p-3 bg-emerald-100 border-2 border-emerald-600 text-emerald-950 font-mono text-xs font-bold flex items-start gap-2">
          <Check className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
          <span>{collectionSuccessMsg}</span>
        </div>
      )}

      {issueSuccessMsg && (
        <div id="banner-issue-success" className="p-3 bg-red-100 border-2 border-red-600 text-red-950 font-mono text-xs font-bold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
          <span>{issueSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. FOCUS PRODUCTS ALERT (TOP BANNER)                                      */}
      {/* ========================================================================= */}
      {focusProducts.length > 0 && (
        <div id="salesman-focus-alert-box" className="border-2 border-amber-600 bg-amber-50 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-amber-300 pb-1.5">
            <span className="inline-flex items-center gap-1.5 bg-black text-amber-400 border border-black px-2 py-0.5 text-[11px] font-mono font-black uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ADMIN FOCUS ITEM
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-900 uppercase">
              {focusProducts.length} Priority SKU{focusProducts.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2 pt-0.5">
            {focusProducts.map((p) => (
              <div
                key={p.id}
                id={`focus-alert-item-${p.id}`}
                className="bg-white border-2 border-black p-2.5 space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-neutral-900 text-white px-1 py-0.2 mr-1.5">
                      {p.sku}
                    </span>
                    <strong className="text-xs font-black text-neutral-950">{p.name}</strong>
                  </div>
                  <div className="text-right flex-shrink-0 font-mono">
                    <span className="text-[10px] text-neutral-500 block uppercase">Wholesale</span>
                    <span className="text-xs font-black text-emerald-800">₹{p.wholesalePrice}</span>
                  </div>
                </div>

                {p.focusNote && (
                  <div className="p-1.5 bg-amber-100/90 border border-amber-400 text-amber-950 font-mono text-[11px] leading-tight">
                    <span className="font-black uppercase text-amber-900">Admin Directive:</span> {p.focusNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DAILY TARGET PROGRESS CARD                                             */}
      {/* ========================================================================= */}
      <div id="salesman-target-card" className="border-2 border-black bg-white p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-black pb-1.5">
          <span className="font-mono text-xs font-black uppercase text-neutral-900 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-black" />
            Daily & Monthly Run-Rate
          </span>
          <span className="text-[10px] font-mono bg-neutral-100 border border-neutral-400 px-1.5 py-0.5 font-bold">
            LIVE METRICS
          </span>
        </div>

        {/* Progress Bar 1: Sales Target vs Achieved */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-between text-xs font-mono">
            <span className="font-bold text-neutral-800 uppercase text-[11px]">1. Sales Quota</span>
            <span className="font-black text-black">
              ₹{salesman.achievedSales.toLocaleString('en-IN')} / ₹{salesman.targetSales.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="w-full bg-neutral-200 border-2 border-black h-4 p-0.5">
            <div
              className="bg-black h-full transition-none"
              style={{ width: `${Math.min(100, salesPercentage)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-neutral-600">
            <span>{salesPercentage}% achieved</span>
            <span>Gap: ₹{Math.max(0, salesman.targetSales - salesman.achievedSales).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Progress Bar 2: Cash/Cheque Collection vs Target */}
        <div className="space-y-1 pt-1 border-t border-neutral-200">
          <div className="flex items-baseline justify-between text-xs font-mono">
            <span className="font-bold text-emerald-900 uppercase text-[11px]">2. Recovery Target</span>
            <span className="font-black text-emerald-800">
              ₹{salesman.achievedCollection.toLocaleString('en-IN')} / ₹{salesman.targetCollection.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="w-full bg-neutral-200 border-2 border-black h-4 p-0.5">
            <div
              className="bg-emerald-600 h-full transition-none"
              style={{ width: `${Math.min(100, collectionPercentage)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-neutral-600">
            <span>{collectionPercentage}% recovered</span>
            <span>Pending: ₹{Math.max(0, salesman.targetCollection - salesman.achievedCollection).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Action Shortcut Buttons (Collection Drawer & Problem Modal) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          id="btn-open-collection-modal"
          onClick={() => setShowCollectionModal(true)}
          className="p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-xs font-black uppercase border-2 border-black cursor-pointer flex items-center justify-center gap-1.5"
        >
          <CreditCard className="w-4 h-4 text-emerald-300" />
          <span>Record Collection</span>
        </button>

        <button
          id="btn-open-issue-modal"
          onClick={() => setShowIssueModal(true)}
          className="p-2.5 bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-black uppercase border-2 border-black cursor-pointer flex items-center justify-center gap-1.5"
        >
          <AlertCircle className="w-4 h-4 text-white" />
          <span>Mark Problem</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. WHOLESALE ORDER BOOKING SECTION                                        */}
      {/* ========================================================================= */}
      <div id="salesman-wholesale-order-section" className="border-2 border-black bg-white p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
          <span className="font-mono text-xs font-black uppercase text-neutral-900 flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-black" />
            Wholesale Order Booking
          </span>
          <span className="text-[10px] font-mono text-neutral-600 uppercase font-bold">
            SPOT DISPATCH
          </span>
        </div>

        {/* Confirmation Banner */}
        {orderSuccessBanner && (
          <div id="banner-order-punched-success" className="p-3 bg-emerald-100 border-2 border-emerald-600 text-emerald-950 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black uppercase flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-700" />
                Order Punched!
              </span>
              <span className="font-bold underline">{orderSuccessBanner.orderId}</span>
            </div>
            <div className="text-[11px] text-neutral-800">
              Booked for <strong>{orderSuccessBanner.storeName}</strong> • {orderSuccessBanner.itemCount} units • Total: <strong>₹{orderSuccessBanner.totalAmount.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                id="btn-salesman-view-bill"
                onClick={() => {
                  const ord = orders.find((o) => o.id === orderSuccessBanner.orderId);
                  if (ord) {
                    setSelectedInvoiceOrder(ord);
                    setAutoPrintInvoice(false);
                  }
                }}
                className="px-3 py-1.5 bg-black text-white hover:bg-neutral-800 text-[11px] font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>View B2B Bill</span>
              </button>
              <button
                type="button"
                id="btn-salesman-print-bill"
                onClick={() => {
                  const ord = orders.find((o) => o.id === orderSuccessBanner.orderId);
                  if (ord) {
                    setSelectedInvoiceOrder(ord);
                    setAutoPrintInvoice(true);
                  }
                }}
                className="px-3 py-1.5 bg-emerald-800 text-white hover:bg-emerald-900 text-[11px] font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {orderError && (
          <div className="p-2 bg-red-100 border border-red-500 text-red-900 font-mono text-xs font-bold">
            ⚠️ {orderError}
          </div>
        )}

        <form onSubmit={handlePunchOrder} className="space-y-3">
          {/* Retailer / Shop Name input */}
          <div className="space-y-1">
            <label htmlFor="input-salesman-shop" className="text-xs font-mono uppercase font-bold text-neutral-800 block">
              Retailer / Shop Name:
            </label>
            <div className="space-y-1.5">
              <select
                id="select-salesman-shop"
                value={shopName}
                onChange={(e) => {
                  setShopName(e.target.value);
                  setCustomShopInput('');
                }}
                className="w-full border-2 border-black p-2 font-mono text-xs bg-neutral-50"
              >
                <option value="Gupta General Store">Gupta General Store (Main Bazaar)</option>
                <option value="Mahalaxmi Provision Store">Mahalaxmi Provision Store (Station Road)</option>
                <option value="Kisan Daily Needs">Kisan Daily Needs (APMC Market)</option>
                <option value="Sharma Kirana">Sharma Kirana (Sector 4)</option>
                <option value="__NEW__">-- Enter Other Shop Below --</option>
              </select>

              {shopName === '__NEW__' && (
                <input
                  id="input-salesman-custom-shop"
                  type="text"
                  placeholder="Type retailer / kirana name..."
                  value={customShopInput}
                  onChange={(e) => setCustomShopInput(e.target.value)}
                  className="w-full border-2 border-black p-2 font-mono text-xs bg-white font-bold"
                  required
                />
              )}
            </div>
          </div>

          {/* Retailer GSTIN input */}
          <div className="space-y-1">
            <label htmlFor="input-salesman-gstin" className="text-xs font-mono uppercase font-bold text-neutral-800 block">
              Retailer GSTIN (Optional on B2B Bill):
            </label>
            <input
              id="input-salesman-gstin"
              type="text"
              placeholder="e.g. 07BAPPG4829K1Z2"
              value={retailerGstin}
              onChange={(e) => setRetailerGstin(e.target.value.toUpperCase())}
              className="w-full border-2 border-black p-2 font-mono text-xs bg-white uppercase font-bold"
            />
          </div>

          {/* Product List showing ONLY: Name, Stock, WholesalePrice (NO retailPrice) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-neutral-600 border-b border-neutral-300 pb-1">
              <span>Depot Catalog</span>
              <span>Available • Wholesale</span>
            </div>

            <div className="space-y-2">
              {products.map((product) => {
                const qty = orderQuantities[product.id] || 0;
                const isOutOfStock = product.stock <= 0;

                return (
                  <div
                    key={product.id}
                    id={`order-product-row-${product.id}`}
                    className={`border-2 p-2.5 bg-white space-y-1.5 transition-none ${
                      qty > 0 ? 'border-black ring-1 ring-black bg-neutral-50' : 'border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono bg-neutral-200 px-1 font-bold">
                            {product.sku}
                          </span>
                          <span className="text-xs font-black text-neutral-900 leading-tight">
                            {product.name}
                          </span>
                        </div>
                        {product.isFocusProduct && (
                          <span className="inline-block text-[10px] font-mono font-bold text-amber-900 bg-amber-200 px-1">
                            ★ Focus SKU
                          </span>
                        )}
                        {product.wholesaleScheme && (
                          <div className="text-[10px] font-mono font-bold text-amber-950 bg-amber-100 border border-amber-300 px-1.5 py-0.2 mt-0.5 inline-block">
                            🎁 Scheme: {product.wholesaleScheme}
                          </div>
                        )}
                      </div>

                      <div className="text-right font-mono flex-shrink-0">
                        <span className="text-xs font-black text-black">
                          ₹{product.wholesalePrice}
                        </span>
                        <div className="text-[10px] text-neutral-500">
                          Stock: <strong className={isOutOfStock ? 'text-red-600' : 'text-neutral-800'}>{product.stock}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Quantity increment / decrement buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-200">
                      <span className="text-[11px] font-mono text-neutral-600">
                        {qty > 0 ? `Subtotal: ₹${(qty * product.wholesalePrice).toLocaleString('en-IN')}` : '0 units'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          id={`btn-dec-qty-${product.id}`}
                          onClick={() => handleQuantityChange(product.id, -5)}
                          disabled={qty <= 0}
                          className="w-7 h-7 border border-black bg-white hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <input
                          id={`input-product-qty-${product.id}`}
                          type="number"
                          min="0"
                          max={product.stock}
                          value={qty === 0 ? '' : qty}
                          placeholder="0"
                          onChange={(e) => handleDirectQuantityInput(product.id, e.target.value)}
                          className="w-12 h-7 border border-black text-center font-mono text-xs font-black bg-white"
                        />

                        <button
                          type="button"
                          id={`btn-inc-qty-${product.id}`}
                          onClick={() => handleQuantityChange(product.id, 5)}
                          disabled={qty >= product.stock}
                          className="w-7 h-7 border border-black bg-white hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Punch Wholesale Order Summary & Button */}
          <div className="border-t-2 border-black pt-3 space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-neutral-700">Total Wholesale Value:</span>
              <span className="text-base font-black text-black">
                ₹{calculateTotalOrderValue().toLocaleString('en-IN')}
              </span>
            </div>

            <button
              id="btn-punch-wholesale-order"
              type="submit"
              disabled={calculateTotalOrderValue() === 0}
              className={`w-full py-3 font-mono text-xs font-black uppercase border-2 border-black cursor-pointer flex items-center justify-center gap-2 ${
                calculateTotalOrderValue() > 0
                  ? 'bg-black text-white hover:bg-neutral-800'
                  : 'bg-neutral-200 text-neutral-500 border-neutral-400 cursor-not-allowed'
              }`}
            >
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              Punch Wholesale Order
            </button>
          </div>
        </form>
      </div>

      {/* Booked Wholesale Invoices & Billing Log */}
      <div id="salesman-invoices-log" className="border-2 border-black bg-white p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
          <div>
            <span className="font-mono text-xs font-black uppercase text-neutral-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-black" />
              Booked Wholesale Invoices
            </span>
            <span className="text-[10px] font-mono text-neutral-500 block">
              Instant B2B bills generated with custom branding & GST details
            </span>
          </div>
          <span className="text-[10px] font-mono bg-neutral-100 border border-neutral-400 px-1.5 py-0.5 font-bold">
            {orders.filter((o) => o.orderType === 'wholesale').length} BILLS
          </span>
        </div>

        {orders.filter((o) => o.orderType === 'wholesale').length === 0 ? (
          <div className="text-center py-4 text-neutral-500 font-mono text-xs">
            No wholesale orders booked yet today. Use the booking section above to punch orders.
          </div>
        ) : (
          <div className="space-y-2">
            {orders
              .filter((o) => o.orderType === 'wholesale')
              .slice(0, 5)
              .map((order) => (
                <div
                  key={order.id}
                  id={`salesman-order-item-${order.id}`}
                  className="border border-neutral-300 p-2.5 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-black">
                        {order.invoiceNumber || order.id}
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-300 px-1 py-0.2 font-bold uppercase">
                        {order.status}
                      </span>
                    </div>
                    <div className="font-bold text-neutral-900 mt-0.5">
                      {order.storeName}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {order.items.length} SKUs • Total: ₹{order.totalAmount.toLocaleString('en-IN')} • {order.createdAt}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      id={`btn-view-invoice-rep-${order.id}`}
                      onClick={() => {
                        setSelectedInvoiceOrder(order);
                        setAutoPrintInvoice(false);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-neutral-200 text-black border border-black text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-blue-700" />
                      <span>View Bill</span>
                    </button>
                    <button
                      type="button"
                      id={`btn-print-invoice-rep-${order.id}`}
                      onClick={() => {
                        setSelectedInvoiceOrder(order);
                        setAutoPrintInvoice(true);
                      }}
                      className="px-2.5 py-1 bg-black text-white hover:bg-neutral-800 text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3 text-amber-400" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Field Tickets History Snapshot */}
      <div className="border-2 border-black bg-white p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-neutral-300 pb-1">
          <span className="font-mono text-xs font-bold uppercase text-neutral-800">
            Escalated Tickets Log ({issues.length})
          </span>
          <span className="text-[10px] font-mono text-neutral-500">Live with Admin</span>
        </div>

        <div className="space-y-1.5">
          {issues.slice(0, 3).map((iss) => (
            <div key={iss.id} className="border border-neutral-300 p-2 font-mono text-xs">
              <div className="flex justify-between items-start">
                <strong className="text-neutral-900">{iss.shopName}</strong>
                <span className={`px-1.5 py-0.2 text-[9px] font-black uppercase border ${
                  iss.status === 'OPEN' ? 'bg-red-600 text-white border-red-700' : 'bg-emerald-600 text-white'
                }`}>
                  {iss.status}
                </span>
              </div>
              <div className="text-[11px] text-neutral-600">{iss.category}</div>
              <p className="text-[11px] font-sans text-neutral-800 mt-0.5 line-clamp-1">{iss.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. COLLECTION ENTRY DRAWER / MODAL                                        */}
      {/* ========================================================================= */}
      {showCollectionModal && (
        <div
          id="modal-collection-entry"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-none"
        >
          <div className="bg-white border-4 border-black max-w-sm w-full p-4 space-y-3 shadow-none">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <span className="font-black uppercase text-sm text-neutral-950 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                Record Payment Collection
              </span>
              <button
                id="btn-close-collection-modal"
                onClick={() => setShowCollectionModal(false)}
                className="w-7 h-7 border border-black bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {collectionError && (
              <div className="p-2 bg-red-100 border border-red-500 text-red-900 font-mono text-xs font-bold">
                ⚠️ {collectionError}
              </div>
            )}

            <form onSubmit={handleRecordCollection} className="space-y-3 font-mono text-xs">
              <div>
                <label htmlFor="input-collection-shop" className="uppercase font-bold text-neutral-700 block mb-1">
                  Shop Name:
                </label>
                <input
                  id="input-collection-shop"
                  type="text"
                  value={collectionShopName}
                  onChange={(e) => setCollectionShopName(e.target.value)}
                  placeholder="e.g. Gupta General Store"
                  className="w-full border-2 border-black p-2 bg-neutral-50 font-bold"
                  required
                />
              </div>

              <div>
                <label htmlFor="input-collection-amt" className="uppercase font-bold text-neutral-700 block mb-1">
                  Amount Collected (₹):
                </label>
                <input
                  id="input-collection-amt"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 15000"
                  value={collectionAmount}
                  onChange={(e) =>
                    setCollectionAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  className="w-full border-2 border-black p-2 bg-neutral-50 font-black text-sm text-emerald-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="select-collection-mode" className="uppercase font-bold text-neutral-700 block mb-1">
                    Payment Mode:
                  </label>
                  <select
                    id="select-collection-mode"
                    value={collectionMode}
                    onChange={(e) => setCollectionMode(e.target.value as any)}
                    className="w-full border-2 border-black p-2 bg-neutral-50 font-bold"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="input-collection-ref" className="uppercase font-bold text-neutral-700 block mb-1">
                    Reference / Cheque No:
                  </label>
                  <input
                    id="input-collection-ref"
                    type="text"
                    placeholder="e.g. CHQ-9912"
                    value={collectionRefNo}
                    onChange={(e) => setCollectionRefNo(e.target.value)}
                    className="w-full border-2 border-black p-2 bg-neutral-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(false)}
                  className="px-3 py-2 border border-black bg-white hover:bg-neutral-200 font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-collection-record"
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase border-2 border-black cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Credit Recovery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MARK PROBLEM / ESCALATION MODAL                                        */}
      {/* ========================================================================= */}
      {showIssueModal && (
        <div
          id="modal-escalate-problem"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-none"
        >
          <div className="bg-white border-4 border-black max-w-sm w-full p-4 space-y-3 shadow-none">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <span className="font-black uppercase text-sm text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-700" />
                Mark Problem / Escalation
              </span>
              <button
                id="btn-close-problem-modal"
                onClick={() => setShowIssueModal(false)}
                className="w-7 h-7 border border-black bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {issueError && (
              <div className="p-2 bg-red-100 border border-red-500 text-red-900 font-mono text-xs font-bold">
                ⚠️ {issueError}
              </div>
            )}

            <form onSubmit={handleMarkProblem} className="space-y-3 font-mono text-xs">
              <div>
                <label htmlFor="input-problem-shop" className="uppercase font-bold text-neutral-700 block mb-1">
                  Shop Name:
                </label>
                <input
                  id="input-problem-shop"
                  type="text"
                  value={issueShopName}
                  onChange={(e) => setIssueShopName(e.target.value)}
                  placeholder="e.g. Gupta General Store"
                  className="w-full border-2 border-black p-2 bg-neutral-50 font-bold"
                  required
                />
              </div>

              <div>
                <label htmlFor="select-problem-category" className="uppercase font-bold text-neutral-700 block mb-1">
                  Category:
                </label>
                <select
                  id="select-problem-category"
                  value={issueCategory}
                  onChange={(e) => setIssueCategory(e.target.value as any)}
                  className="w-full border-2 border-black p-2 bg-neutral-50 font-bold"
                >
                  <option value="Payment Dispute">Payment Dispute</option>
                  <option value="Damaged / Expired Goods">Damaged / Expired Goods</option>
                  <option value="Retailer Closed">Retailer Closed</option>
                  <option value="Competitor Low Price">Competitor Low Price</option>
                </select>
              </div>

              <div>
                <label htmlFor="textarea-problem-desc" className="uppercase font-bold text-neutral-700 block mb-1">
                  Description / Note:
                </label>
                <textarea
                  id="textarea-problem-desc"
                  rows={3}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Specific details for Admin, invoice numbers, reason for non-payment or damage..."
                  className="w-full border-2 border-black p-2 bg-white text-xs"
                  required
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3 py-2 border border-black bg-white hover:bg-neutral-200 font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-problem-ticket"
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black uppercase border-2 border-black cursor-pointer flex items-center gap-1"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal for Viewing and PDF generation */}
      {selectedInvoiceOrder && (
        <InvoiceModal
          order={selectedInvoiceOrder}
          isOpen={true}
          onClose={() => setSelectedInvoiceOrder(null)}
          autoPrint={autoPrintInvoice}
        />
      )}
    </div>
  );
}
