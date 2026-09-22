import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Order } from '../types.ts';
import { InvoiceModal } from '../components/InvoiceModal.tsx';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  X, 
  Clock, 
  Truck, 
  Phone, 
  MapPin, 
  User, 
  ShieldCheck, 
  Package, 
  ArrowRight,
  AlertCircle,
  FileText,
  Printer,
  Eye,
  Tag
} from 'lucide-react';

export function StoreView() {
  const { products, orders, createOrder } = useApp();

  // Search / Category filter
  const [searchQuery, setSearchQuery] = useState('');

  // Cart state: map of productId -> quantity
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  
  // Slide-over cart visibility for mobile or toggle
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Customer Checkout Details
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  // Invoice Modal State for Store
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false);

  // Order Confirmation Modal State
  const [orderConfirmation, setOrderConfirmation] = useState<{
    orderId: string;
    customerName: string;
    customerMobile: string;
    deliveryAddress: string;
    itemCount: number;
    totalAmount: number;
    deliveryWindow: string;
    orderTime: string;
  } | null>(null);

  // Filtered Products
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cart Calculations (STRICTLY using retailPrice ONLY)
  const cartEntries = Object.entries(cart).filter(([_, qty]) => qty > 0);
  
  const totalCartCount = cartEntries.reduce((sum, [_, qty]) => sum + qty, 0);

  const calculateSubtotal = () => {
    return cartEntries.reduce((sum, [pid, qty]) => {
      const prod = products.find((p) => p.id === pid);
      return sum + (prod ? prod.retailPrice * qty : 0);
    }, 0);
  };

  const grandTotal = calculateSubtotal();

  // Cart Actions
  const addToCart = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod || prod.stock <= 0) return;

    setCart((prev) => {
      const current = prev[productId] || 0;
      if (current >= prod.stock) return prev; // Cannot exceed available stock
      return { ...prev, [productId]: current + 1 };
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      if (next > prod.stock) return prev; // Capped at stock
      return { ...prev, [productId]: next };
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  // Place Retail Order Handler
  const handlePlaceRetailOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (cartEntries.length === 0) {
      setCheckoutError('Your shopping basket is empty. Please add items before placing order.');
      return;
    }

    if (!customerName.trim()) {
      setCheckoutError('Please enter your full name.');
      return;
    }

    if (!customerMobile.trim() || customerMobile.trim().length < 10) {
      setCheckoutError('Please enter a valid 10-digit mobile number for delivery updates.');
      return;
    }

    if (!deliveryAddress.trim()) {
      setCheckoutError('Please enter your house/flat number and neighborhood address.');
      return;
    }

    // Verify stock availability
    for (const [pid, qty] of cartEntries) {
      const prod = products.find((p) => p.id === pid);
      if (!prod || prod.stock < qty) {
        setCheckoutError(`Sorry, ${prod?.name || 'an item'} has only ${prod?.stock || 0} unit(s) available.`);
        return;
      }
    }

    // Prepare order items strictly using retailPrice with GST HSN & Offers
    const orderItems = cartEntries.map(([pid, qty]) => {
      const prod = products.find((p) => p.id === pid)!;
      return {
        productId: pid,
        productName: prod.name,
        quantity: qty,
        unitPrice: prod.retailPrice,
        total: prod.retailPrice * qty,
        hsn: prod.hsn || '2106',
        retailOffer: prod.retailOffer,
      };
    });

    const now = new Date();
    // Delivery window: Next 45-60 minutes
    const estDeliveryTime = new Date(now.getTime() + 45 * 60000);
    const estDeliveryEnd = new Date(now.getTime() + 75 * 60000);
    const deliveryWindowStr = `${estDeliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${estDeliveryEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Today)`;

    // Execute order creation
    const newOrderId = createOrder({
      storeName: 'Local Retail Delivery',
      items: orderItems,
      totalAmount: grandTotal,
      status: 'PENDING',
      paymentStatus: 'UNPAID', // Cash on Delivery / UPI on Delivery
      orderType: 'retail',
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      deliveryAddress: deliveryAddress.trim(),
    });

    // Reset Cart & Show Confirmation Modal
    setOrderConfirmation({
      orderId: newOrderId,
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      deliveryAddress: deliveryAddress.trim(),
      itemCount: totalCartCount,
      totalAmount: grandTotal,
      deliveryWindow: deliveryWindowStr,
      orderTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    setCart({});
    setIsCartOpen(false);
  };

  return (
    <div id="view-retail-store" className="p-3 sm:p-5 max-w-7xl mx-auto space-y-5">
      {/* Top Store Banner */}
      <div className="bg-white border-2 border-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-block bg-black text-white px-2 py-0.5 text-xs font-mono font-bold uppercase mb-1">
            Neighborhood Store • Fresh Daily Essentials
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neutral-900">
            Gupta Provision & Kirana Store
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 font-mono mt-0.5">
            Same-day doorstep delivery within 45-75 minutes • Guaranteed authentic grocery staples.
          </p>
        </div>

        {/* Quick Cart Trigger Bar */}
        <div className="flex items-center gap-3">
          <button
            id="btn-toggle-cart"
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="px-4 py-2.5 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase border-2 border-black cursor-pointer flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            <span>My Basket ({totalCartCount})</span>
            <span className="bg-amber-400 text-black px-1.5 py-0.2 font-black">
              ₹{grandTotal.toLocaleString('en-IN')}
            </span>
          </button>
        </div>
      </div>

      {/* Main Grid: Product Catalog (Left) + Sticky Cart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* 1. RETAIL PRODUCT CATALOG (Columns 1 to 8 on desktop)                      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search bar & Category filter */}
          <div className="bg-white border-2 border-black p-3 flex items-center justify-between gap-3">
            <input
              id="input-retail-search"
              type="text"
              placeholder="Search staples, oils, flour, rice, biscuits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-black px-3 py-2 text-xs font-mono bg-neutral-50 focus:bg-white"
            />
            <span className="text-xs font-mono text-neutral-600 flex-shrink-0 hidden sm:inline">
              {filteredProducts.length} items available
            </span>
          </div>

          {/* Product Cards Grid */}
          <div id="retail-product-catalog" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock <= 0;
              const cartQty = cart[product.id] || 0;

              return (
                <div
                  key={product.id}
                  id={`retail-card-${product.id}`}
                  className="border-2 border-black bg-white p-3.5 flex flex-col justify-between space-y-3"
                >
                  {/* Card Header & Product Image Placeholder */}
                  <div className="space-y-2.5">
                    {/* Minimalist Image Placeholder */}
                    <div className="w-full h-28 bg-neutral-100 border border-black flex flex-col items-center justify-center p-2 text-center relative">
                      <Package className="w-8 h-8 text-neutral-400 mb-1" />
                      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                        {product.sku}
                      </span>
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-neutral-900/80 flex items-center justify-center">
                          <span className="bg-red-600 text-white font-mono text-xs font-black px-2 py-1 uppercase border border-white">
                            SOLD OUT
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Name & SKU */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 mb-0.5">
                        <span>SKU: {product.sku}</span>
                        <span className={product.stock <= 5 && !isOutOfStock ? 'text-amber-800 font-bold' : ''}>
                          {isOutOfStock ? '0 in store' : `${product.stock} in store`}
                        </span>
                      </div>
                      <h3 className="font-black text-sm text-neutral-950 leading-snug font-sans">
                        {product.name}
                      </h3>
                      {product.retailOffer && (
                        <div className="text-[10px] font-mono font-bold text-emerald-950 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 mt-1 inline-flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5 text-emerald-700" />
                          <span>Deal: {product.retailOffer}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing (STRICT PRIVACY: ONLY retailPrice displayed) */}
                  <div className="pt-2 border-t border-neutral-200 space-y-2.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-mono text-neutral-600 uppercase font-bold">
                        Price (MRP):
                      </span>
                      <span className="font-mono text-lg font-black text-neutral-950">
                        ₹{product.retailPrice}
                      </span>
                    </div>

                    {/* Add to Cart or Out of Stock Button */}
                    {isOutOfStock ? (
                      <button
                        disabled
                        id={`btn-out-of-stock-${product.id}`}
                        className="w-full py-2 bg-neutral-200 text-neutral-500 border border-neutral-400 font-mono text-xs font-bold uppercase cursor-not-allowed text-center"
                      >
                        Out of Stock
                      </button>
                    ) : cartQty > 0 ? (
                      <div className="flex items-center justify-between border-2 border-black bg-neutral-50 p-1">
                        <button
                          type="button"
                          id={`btn-cart-dec-${product.id}`}
                          onClick={() => updateCartQty(product.id, -1)}
                          className="w-7 h-7 bg-white hover:bg-neutral-200 border border-black flex items-center justify-center font-bold text-xs"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-black text-xs">
                          {cartQty} in basket
                        </span>
                        <button
                          type="button"
                          id={`btn-cart-inc-${product.id}`}
                          onClick={() => addToCart(product.id)}
                          disabled={cartQty >= product.stock}
                          className="w-7 h-7 bg-white hover:bg-neutral-200 border border-black disabled:opacity-40 flex items-center justify-center font-bold text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        id={`btn-add-to-cart-${product.id}`}
                        onClick={() => addToCart(product.id)}
                        className="w-full py-2 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase border-2 border-black cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SLIDE-OVER / STICKY CART (Columns 9 to 12 on desktop)                   */}
        {/* ========================================================================= */}
        <div
          id="retail-sticky-cart-container"
          className={`lg:col-span-4 fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white border-l-4 border-black p-4 overflow-y-auto transform transition-transform duration-150 ease-in-out lg:static lg:transform-none lg:border-2 lg:border-black lg:p-4 lg:w-auto ${
            isCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-black" />
              <h3 className="font-black uppercase text-base text-neutral-950 font-mono">
                Order Checkout ({totalCartCount})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {cartEntries.length > 0 && (
                <button
                  type="button"
                  id="btn-clear-cart"
                  onClick={clearCart}
                  className="text-[11px] font-mono font-bold text-red-600 hover:underline uppercase cursor-pointer"
                >
                  Clear
                </button>
              )}
              {/* Close button on mobile */}
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-7 h-7 border border-black bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-xs lg:hidden"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          {cartEntries.length === 0 ? (
            <div id="cart-empty-message" className="border-2 border-dashed border-neutral-300 p-8 text-center bg-neutral-50 my-4 space-y-2">
              <ShoppingCart className="w-8 h-8 text-neutral-400 mx-auto" />
              <p className="font-mono text-xs font-bold text-neutral-700 uppercase">
                Your basket is empty
              </p>
              <p className="text-[11px] font-mono text-neutral-500">
                Choose grocery items from the catalog to build your delivery.
              </p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              <div className="divide-y divide-neutral-200 max-h-60 overflow-y-auto pr-1">
                {cartEntries.map(([pid, qty]) => {
                  const item = products.find((p) => p.id === pid);
                  if (!item) return null;
                  const itemTotal = item.retailPrice * qty;

                  return (
                    <div
                      key={pid}
                      id={`cart-item-row-${pid}`}
                      className="py-2.5 flex items-start justify-between gap-2 font-mono text-xs"
                    >
                      <div className="space-y-0.5 flex-1">
                        <div className="font-bold text-neutral-900 font-sans leading-tight">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          ₹{item.retailPrice} × {qty} = <strong className="text-black">₹{itemTotal.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQty(pid, -1)}
                          className="w-6 h-6 border border-black bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-xs w-4 text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={() => addToCart(pid)}
                          disabled={qty >= item.stock}
                          className="w-6 h-6 border border-black bg-white hover:bg-neutral-200 disabled:opacity-40 flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(pid)}
                          className="w-6 h-6 border border-neutral-300 text-neutral-400 hover:text-red-600 hover:border-black flex items-center justify-center text-xs ml-1"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtotal & Delivery Charges */}
              <div className="border-t-2 border-black pt-2 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Items Subtotal:</span>
                  <span>₹{calculateSubtotal().toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Local Neighborhood Delivery:</span>
                  <span className="text-emerald-700 font-bold uppercase">FREE</span>
                </div>
                <div className="flex justify-between text-base font-black text-black pt-1 border-t border-neutral-300">
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Checkout Form */}
          <form onSubmit={handlePlaceRetailOrder} className="space-y-3 font-mono text-xs border-t-2 border-black pt-3">
            <span className="font-black uppercase text-xs text-neutral-900 block">
              Doorstep Delivery Details
            </span>

            {checkoutError && (
              <div className="p-2 bg-red-100 border border-red-500 text-red-900 font-bold">
                ⚠️ {checkoutError}
              </div>
            )}

            <div>
              <label htmlFor="input-customer-name" className="uppercase font-bold text-neutral-700 block mb-0.5 text-[11px]">
                Customer Full Name:
              </label>
              <input
                id="input-customer-name"
                type="text"
                placeholder="e.g. Ramesh Verma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border-2 border-black p-2 bg-neutral-50 font-bold text-xs"
                required
              />
            </div>

            <div>
              <label htmlFor="input-customer-mobile" className="uppercase font-bold text-neutral-700 block mb-0.5 text-[11px]">
                Mobile Number (10 Digits):
              </label>
              <input
                id="input-customer-mobile"
                type="tel"
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                className="w-full border-2 border-black p-2 bg-neutral-50 font-bold text-xs"
                required
              />
            </div>

            <div>
              <label htmlFor="textarea-customer-address" className="uppercase font-bold text-neutral-700 block mb-0.5 text-[11px]">
                House / Flat & Street Address:
              </label>
              <textarea
                id="textarea-customer-address"
                rows={2}
                placeholder="e.g. Flat 302, Sai Apartments, Main Market Road"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full border-2 border-black p-2 bg-neutral-50 text-xs"
                required
              ></textarea>
            </div>

            <div className="bg-neutral-100 border border-neutral-300 p-2 text-[10px] text-neutral-600 space-y-0.5">
              <div>• <strong>Payment Mode:</strong> Cash on Delivery or UPI QR on delivery.</div>
              <div>• <strong>Estimated Delivery:</strong> 45-75 minutes from order confirmation.</div>
            </div>

            <button
              id="btn-place-retail-order"
              type="submit"
              disabled={cartEntries.length === 0}
              className={`w-full py-3 font-mono text-xs font-black uppercase border-2 border-black cursor-pointer flex items-center justify-center gap-1.5 ${
                cartEntries.length > 0
                  ? 'bg-black text-white hover:bg-neutral-800'
                  : 'bg-neutral-200 text-neutral-500 border-neutral-400 cursor-not-allowed'
              }`}
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              Place Retail Order • ₹{grandTotal.toLocaleString('en-IN')}
            </button>
          </form>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ORDER CONFIRMATION MODAL                                               */}
      {/* ========================================================================= */}
      {orderConfirmation && (
        <div
          id="modal-retail-order-success"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-none"
        >
          <div className="bg-white border-4 border-black max-w-md w-full p-4 sm:p-5 space-y-4 shadow-none">
            {/* Modal Header */}
            <div className="border-b-2 border-black pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <h3 className="font-black uppercase text-base text-neutral-950 font-mono">
                  Order Successfully Placed!
                </h3>
              </div>
              <button
                type="button"
                id="btn-close-order-success"
                onClick={() => setOrderConfirmation(null)}
                className="w-7 h-7 border border-black bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Order Details Body */}
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-neutral-50 border-2 border-black space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-600 uppercase">Order ID:</span>
                  <span className="font-black text-black bg-neutral-200 px-2 py-0.5">
                    {orderConfirmation.orderId}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 uppercase">Order Placed At:</span>
                  <span className="font-bold text-neutral-900">{orderConfirmation.orderTime}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 uppercase">Bill Amount:</span>
                  <span className="font-black text-sm text-emerald-800">
                    ₹{orderConfirmation.totalAmount.toLocaleString('en-IN')} (COD / UPI)
                  </span>
                </div>
              </div>

              {/* Delivery Window Highlight */}
              <div className="p-3 bg-amber-50 border-2 border-amber-600 space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-900 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Estimated Local Delivery Window:
                </span>
                <p className="text-sm font-black text-neutral-950 font-mono">
                  {orderConfirmation.deliveryWindow}
                </p>
                <p className="text-[10px] text-neutral-600">
                  Our delivery rider will call <strong>{orderConfirmation.customerMobile}</strong> when departing the store.
                </p>
              </div>

              {/* Delivery Address Summary */}
              <div className="border border-neutral-300 p-2.5 space-y-1 bg-white">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                  Delivery Destination:
                </span>
                <p className="font-sans font-bold text-xs text-neutral-900">
                  {orderConfirmation.customerName}
                </p>
                <p className="font-sans text-xs text-neutral-700">
                  {orderConfirmation.deliveryAddress}
                </p>
              </div>

              {/* Tax Invoice & Receipt Callout */}
              <div className="p-3 bg-neutral-100 border-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-mono font-black uppercase text-neutral-900 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                    Tax Invoice & Receipt
                  </span>
                  <p className="text-[10px] text-neutral-600 font-mono">
                    Instant itemized bill with GST breakdown & shop QR
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-store-view-bill"
                    onClick={() => {
                      const ord = orders.find((o) => o.id === orderConfirmation.orderId);
                      if (ord) {
                        setSelectedInvoiceOrder(ord);
                        setAutoPrintInvoice(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-white border border-black hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-700" />
                    <span>View Bill</span>
                  </button>
                  <button
                    type="button"
                    id="btn-store-print-pdf"
                    onClick={() => {
                      const ord = orders.find((o) => o.id === orderConfirmation.orderId);
                      if (ord) {
                        setSelectedInvoiceOrder(ord);
                        setAutoPrintInvoice(true);
                      }
                    }}
                    className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white border border-black text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t-2 border-black flex items-center justify-end">
              <button
                type="button"
                id="btn-done-order-confirmation"
                onClick={() => setOrderConfirmation(null)}
                className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase border-2 border-black cursor-pointer text-center"
              >
                Back to Grocery Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal for Viewing and PDF generation */}
      <InvoiceModal
        order={selectedInvoiceOrder}
        isOpen={!!selectedInvoiceOrder}
        onClose={() => setSelectedInvoiceOrder(null)}
        autoPrint={autoPrintInvoice}
      />
    </div>
  );
}
