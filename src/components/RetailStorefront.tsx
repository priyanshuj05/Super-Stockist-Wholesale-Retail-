import { useState, useId } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Order, Product } from '../types.ts';
import { InvoiceModal } from './InvoiceModal.tsx';
import { OfflineSyncBadge } from './OfflineSyncBadge.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
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
  Tag,
  Search,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Sparkles,
  Store,
  ChevronRight,
  RefreshCw,
  QrCode
} from 'lucide-react';

interface RetailStorefrontProps {
  onBackToLogin?: () => void;
}

export function RetailStorefront({ onBackToLogin }: RetailStorefrontProps) {
  const { products, orders, createOrder, companyProfile } = useApp();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'offers' | 'instock'>('all');

  // Slide-over cart state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<{ [productId: string]: number }>({});

  // Checkout flow state: 'cart' | 'phone_auth' | 'delivery_details' | 'confirmation'
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'phone_auth' | 'delivery_details' | 'confirmation'>('cart');

  // Phone Authentication State
  const [customerMobile, setCustomerMobile] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [phoneAuthError, setPhoneAuthError] = useState('');

  // Delivery & Customer Information
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('110020');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI_QR'>('COD');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  // Post-order confirmation state
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false);

  const phoneInputId = useId();
  const otpInputId = useId();
  const nameInputId = useId();
  const addressInputId = useId();
  const landmarkInputId = useId();
  const pincodeInputId = useId();
  const notesInputId = useId();
  const searchInputId = useId();

  // Filtered Products (Strictly filtering public attributes)
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedFilter === 'offers') return Boolean(p.retailOffer);
    if (selectedFilter === 'instock') return p.stock > 0;
    return true;
  });

  // Cart Calculations (STRICTLY using retailPrice ONLY)
  const cartEntries = Object.entries(cart).filter(([_, qty]) => qty > 0);
  const totalCartCount = cartEntries.reduce((sum, [_, qty]) => sum + qty, 0);

  const itemSubtotal = cartEntries.reduce((sum, [pid, qty]) => {
    const prod = products.find((p) => p.id === pid);
    return sum + (prod ? prod.retailPrice * qty : 0);
  }, 0);

  const freeDeliveryThreshold = 499;
  const deliveryFee = itemSubtotal >= freeDeliveryThreshold || itemSubtotal === 0 ? 0 : 30;
  const grandTotal = itemSubtotal + deliveryFee;

  // Cart operations
  const addToCart = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod || prod.stock <= 0) return;

    setCart((prev) => {
      const current = prev[productId] || 0;
      if (current >= prod.stock) return prev;
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
      if (next > prod.stock) return prev;
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
    setCheckoutStep('cart');
  };

  // Phone Auth flow handlers
  const handleSendOtp = () => {
    setPhoneAuthError('');
    const cleanNumber = customerMobile.replace(/\D/g, '');
    if (cleanNumber.length !== 10) {
      setPhoneAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Generate a realistic 4-digit verification code
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    setIsOtpSent(true);
    // Autofill demo helper
    setOtpInput(otp);
  };

  const handleVerifyOtp = () => {
    setPhoneAuthError('');
    if (!otpInput.trim()) {
      setPhoneAuthError('Please enter the 4-digit verification code.');
      return;
    }
    if (otpInput.trim() !== generatedOtp && otpInput.trim() !== '1234') {
      setPhoneAuthError('Invalid code. Please enter the OTP displayed above.');
      return;
    }

    setIsPhoneVerified(true);
    setCheckoutStep('delivery_details');
  };

  const handleChangePhone = () => {
    setIsPhoneVerified(false);
    setIsOtpSent(false);
    setGeneratedOtp(null);
    setOtpInput('');
  };

  // Order Placement
  const handleFinalOrderSubmit = () => {
    setCheckoutError('');

    if (!customerName.trim()) {
      setCheckoutError('Please enter your full name for the delivery receipt.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setCheckoutError('Please enter your complete delivery address.');
      return;
    }
    if (cartEntries.length === 0) {
      setCheckoutError('Your shopping cart is empty.');
      return;
    }

    // Verify stock availability
    for (const [pid, qty] of cartEntries) {
      const prod = products.find((p) => p.id === pid);
      if (!prod || prod.stock < qty) {
        setCheckoutError(`Item "${prod?.name || 'Selected item'}" is out of stock.`);
        return;
      }
    }

    // Compile line items STRICTLY with retail price and retail offers only
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

    const fullAddress = `${deliveryAddress.trim()}${landmark.trim() ? `, Near ${landmark.trim()}` : ''} - PIN: ${pincode.trim()}`;
    const invoiceNumber = `INV-RET-${Date.now().toString().slice(-4)}`;

    const newOrderId = createOrder({
      invoiceNumber,
      storeName: 'Direct Retail Customer Order',
      orderType: 'retail',
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      deliveryAddress: fullAddress,
      items: orderItems,
      totalAmount: grandTotal,
      status: 'PENDING',
      paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PAID',
    });

    const confirmedOrder: Order = {
      id: newOrderId,
      invoiceNumber,
      storeName: 'Direct Retail Customer Order',
      orderType: 'retail',
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      deliveryAddress: fullAddress,
      items: orderItems,
      totalAmount: grandTotal,
      status: 'PENDING',
      paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PAID',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setPlacedOrder(confirmedOrder);
    setCheckoutStep('confirmation');
    setCart({});
  };

  return (
    <div id="retail-storefront-root" className="min-h-screen bg-neutral-100 flex flex-col font-sans">
      {/* Top Banner: Guest Storefront Announcements */}
      <div id="retail-announcement-bar" className="bg-neutral-900 text-white px-3 sm:px-6 py-2 text-xs font-mono flex flex-wrap items-center justify-between gap-2 border-b-2 border-black">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold uppercase tracking-wider text-amber-300">
            {companyProfile.companyName || 'Apex Fresh Retail & Grocery'}
          </span>
          <span className="text-neutral-400 hidden md:inline">|</span>
          <span className="text-neutral-300 hidden md:inline">Express Direct-to-Consumer Local Delivery (30-45 Mins)</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <PWAInstallButton variant="header" />
          <OfflineSyncBadge />
          <span className="text-neutral-300 hidden sm:flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span>Free Delivery on ₹499+</span>
          </span>
          {onBackToLogin && (
            <button
              id="btn-switch-to-staff-login"
              onClick={onBackToLogin}
              className="text-xs font-bold text-neutral-300 hover:text-white underline cursor-pointer flex items-center gap-1"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Staff / Rep Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Storefront Navigation Bar */}
      <header id="retail-main-header" className="bg-white border-b-2 border-black sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-amber-400 border-2 border-black flex items-center justify-center font-black">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-neutral-950 flex items-center gap-2">
                <span>Consumer Grocery Store</span>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-400">
                  Guest Mode
                </span>
              </h1>
              <p className="text-[11px] font-mono text-neutral-600 hidden sm:block">
                Authentic pantry essentials at genuine retail MRP pricing
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <label htmlFor={searchInputId} className="sr-only">Search groceries, staples or brands</label>
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
              <input
                id={searchInputId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groceries, staples or brands..."
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border-2 border-black text-xs font-mono focus:outline-none focus:bg-white focus:ring-1 focus:ring-black"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-neutral-400 hover:text-black font-bold text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Slide-over Cart Trigger Button */}
          <div className="flex items-center gap-2">
            <button
              id="btn-open-slideover-cart"
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="px-3.5 py-2 bg-black hover:bg-neutral-800 text-white border-2 border-black flex items-center gap-2 font-mono text-xs font-black uppercase cursor-pointer relative shadow-sm active:translate-y-0.5"
            >
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Shopping Cart</span>
              <span className="px-1.5 py-0.2 bg-amber-400 text-black text-[11px] font-black border border-black">
                {totalCartCount}
              </span>
              {itemSubtotal > 0 && (
                <span className="text-amber-300 font-bold ml-0.5">
                  ₹{itemSubtotal}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="p-2 border-t border-neutral-200 md:hidden bg-neutral-50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staples, oils, flour..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-black text-xs font-mono focus:outline-none"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="retail-catalog-viewport" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Category & Offers Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border-2 border-black p-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-xs font-mono font-bold text-neutral-600 uppercase mr-1">Filter:</span>
            <button
              type="button"
              id="btn-filter-all"
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase border cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-black text-white border-black'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              All Products ({products.length})
            </button>
            <button
              type="button"
              id="btn-filter-offers"
              onClick={() => setSelectedFilter('offers')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase border cursor-pointer flex items-center gap-1 ${
                selectedFilter === 'offers'
                  ? 'bg-emerald-700 text-white border-emerald-900'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <Tag className="w-3 h-3 text-amber-400" />
              <span>Deals & Offers</span>
            </button>
            <button
              type="button"
              id="btn-filter-instock"
              onClick={() => setSelectedFilter('instock')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase border cursor-pointer ${
                selectedFilter === 'instock'
                  ? 'bg-neutral-900 text-white border-black'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              In Stock Only
            </button>
          </div>

          <div className="text-xs font-mono text-neutral-500">
            Showing <strong className="text-black">{filteredProducts.length}</strong> items
          </div>
        </div>

        {/* Product Cards Grid (Strictly Retail MRP & Retail Deals, zero wholesale/salesman data) */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border-2 border-black p-12 text-center space-y-3">
            <Package className="w-12 h-12 text-neutral-400 mx-auto" />
            <h2 className="text-base font-bold uppercase font-mono text-neutral-800">No matching products found</h2>
            <p className="text-xs font-mono text-neutral-500">Try adjusting your search query or clear active filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedFilter('all');
              }}
              className="px-4 py-2 bg-black text-white font-mono text-xs font-bold uppercase border border-black cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const inCartQty = cart[product.id] || 0;
              const isOutOfStock = product.stock <= 0;
              const isLowStock = product.stock > 0 && product.stock <= 10;

              return (
                <div
                  key={product.id}
                  id={`product-card-${product.id}`}
                  className="bg-white border-2 border-black p-4 flex flex-col justify-between space-y-4 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                >
                  <div className="space-y-2">
                    {/* Header: SKU & Stock Status */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-neutral-500 font-bold">SKU: {product.sku}</span>
                      {isOutOfStock ? (
                        <span className="px-1.5 py-0.2 bg-red-100 text-red-900 border border-red-300 font-bold uppercase text-[10px]">
                          Sold Out
                        </span>
                      ) : isLowStock ? (
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 font-bold uppercase text-[10px]">
                          Only {product.stock} left
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold text-[10px] uppercase flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>In Stock</span>
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <h2 className="text-sm font-black text-neutral-950 uppercase leading-snug line-clamp-2">
                      {product.name}
                    </h2>

                    {/* Retail Offer Badge (Strictly Public Retail Deals, no wholesale scheme) */}
                    {product.retailOffer && (
                      <div className="p-1.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-[11px] font-mono font-bold flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                        <span>Deal: {product.retailOffer}</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing and Cart Actions */}
                  <div className="pt-3 border-t border-neutral-200 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-neutral-500">Retail MRP:</span>
                      <div className="text-right">
                        <span className="text-lg font-black font-mono text-neutral-950">
                          ₹{product.retailPrice}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 block">incl. all taxes</span>
                      </div>
                    </div>

                    {/* Quantity controls or Add to Cart button */}
                    {isOutOfStock ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 bg-neutral-200 text-neutral-400 border border-neutral-300 font-mono text-xs font-bold uppercase cursor-not-allowed text-center"
                      >
                        Out of Stock
                      </button>
                    ) : inCartQty > 0 ? (
                      <div className="flex items-center justify-between border-2 border-black bg-neutral-50 p-1">
                        <button
                          type="button"
                          id={`btn-cart-dec-${product.id}`}
                          onClick={() => updateCartQty(product.id, -1)}
                          className="w-7 h-7 bg-white hover:bg-neutral-200 border border-black flex items-center justify-center font-black cursor-pointer"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-black text-sm px-2">
                          {inCartQty} in Cart
                        </span>
                        <button
                          type="button"
                          id={`btn-cart-inc-${product.id}`}
                          disabled={inCartQty >= product.stock}
                          onClick={() => updateCartQty(product.id, 1)}
                          className="w-7 h-7 bg-white hover:bg-neutral-200 border border-black flex items-center justify-center font-black cursor-pointer disabled:opacity-40"
                          title="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        id={`btn-add-to-cart-${product.id}`}
                        onClick={() => {
                          addToCart(product.id);
                          setIsCartOpen(true);
                        }}
                        className="w-full py-2 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase tracking-wider border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:translate-y-0.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Add to Cart</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* SLIDE-OVER CART & CHECKOUT DRAWER */}
      {isCartOpen && (
        <div id="slideover-cart-drawer-container" className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop overlay */}
          <div
            id="slideover-cart-backdrop"
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity cursor-pointer"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <div className="w-screen max-w-md bg-white border-l-4 border-black flex flex-col shadow-2xl">
              
              {/* Drawer Header */}
              <div className="p-4 bg-black text-white flex items-center justify-between border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  <span className="font-mono font-black text-sm uppercase tracking-wide">
                    {checkoutStep === 'cart'
                      ? `Your Cart (${totalCartCount} items)`
                      : checkoutStep === 'phone_auth'
                      ? 'Step 1: Phone Verification'
                      : checkoutStep === 'delivery_details'
                      ? 'Step 2: Delivery Details'
                      : 'Order Confirmation'}
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-close-slideover-cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Stepper when checking out */}
              {checkoutStep !== 'cart' && checkoutStep !== 'confirmation' && (
                <div className="bg-neutral-100 border-b border-black px-4 py-2 flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      checkoutStep === 'phone_auth' ? 'bg-black text-amber-400' : 'bg-emerald-600 text-white'
                    }`}>
                      1
                    </span>
                    <span>Verify Phone</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      checkoutStep === 'delivery_details' ? 'bg-black text-amber-400' : 'bg-neutral-300 text-neutral-700'
                    }`}>
                      2
                    </span>
                    <span>Delivery Address</span>
                  </div>
                </div>
              )}

              {/* Drawer Body (Steps) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono">
                
                {/* STEP 0: CART ITEMS REVIEW */}
                {checkoutStep === 'cart' && (
                  <div className="space-y-4">
                    {cartEntries.length === 0 ? (
                      <div className="text-center py-12 space-y-3">
                        <ShoppingCart className="w-12 h-12 text-neutral-300 mx-auto" />
                        <h3 className="font-bold text-sm uppercase text-neutral-800">Your cart is empty</h3>
                        <p className="text-xs text-neutral-500 font-sans">
                          Browse our catalog and add everyday groceries to your cart.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsCartOpen(false)}
                          className="px-4 py-2 bg-black text-white text-xs font-bold uppercase border border-black cursor-pointer"
                        >
                          Continue Shopping
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Free Delivery Target Indicator */}
                        <div className="p-3 bg-neutral-50 border-2 border-black space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1 text-neutral-800">
                              <Truck className="w-3.5 h-3.5 text-blue-700" />
                              Free Express Delivery
                            </span>
                            <span>
                              {itemSubtotal >= freeDeliveryThreshold ? (
                                <span className="text-emerald-700">Unlocked!</span>
                              ) : (
                                `Add ₹${freeDeliveryThreshold - itemSubtotal} more`
                              )}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-neutral-200 border border-black overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${Math.min(100, (itemSubtotal / freeDeliveryThreshold) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* List of items */}
                        <div className="space-y-2.5">
                          {cartEntries.map(([pid, qty]) => {
                            const prod = products.find((p) => p.id === pid);
                            if (!prod) return null;

                            return (
                              <div
                                key={pid}
                                id={`cart-item-${pid}`}
                                className="p-3 bg-white border border-neutral-300 flex items-start justify-between gap-3 shadow-xs"
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-xs uppercase text-neutral-900 leading-snug">
                                      {prod.name}
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={() => removeFromCart(pid)}
                                      className="text-neutral-400 hover:text-red-600 cursor-pointer p-0.5"
                                      title="Remove item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                                    <span>MRP: ₹{prod.retailPrice}</span>
                                    <span>•</span>
                                    <span>SKU: {prod.sku}</span>
                                  </div>

                                  {prod.retailOffer && (
                                    <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 border border-emerald-200 inline-block">
                                      {prod.retailOffer}
                                    </div>
                                  )}

                                  <div className="pt-1 flex items-center justify-between">
                                    <div className="flex items-center border border-black">
                                      <button
                                        type="button"
                                        onClick={() => updateCartQty(pid, -1)}
                                        className="w-6 h-6 bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center font-bold"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="w-8 text-center text-xs font-bold">
                                        {qty}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={qty >= prod.stock}
                                        onClick={() => updateCartQty(pid, 1)}
                                        className="w-6 h-6 bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center font-bold disabled:opacity-30"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>

                                    <span className="font-black text-sm text-neutral-950">
                                      ₹{prod.retailPrice * qty}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Bill Breakdown Box */}
                        <div className="p-3 bg-neutral-50 border-2 border-black space-y-2 text-xs">
                          <div className="flex items-center justify-between text-neutral-600">
                            <span>Items Subtotal ({totalCartCount}):</span>
                            <span>₹{itemSubtotal}</span>
                          </div>
                          <div className="flex items-center justify-between text-neutral-600">
                            <span>Delivery Fee:</span>
                            <span>
                              {deliveryFee === 0 ? (
                                <span className="text-emerald-700 font-bold uppercase">FREE</span>
                              ) : (
                                `₹${deliveryFee}`
                              )}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-neutral-300 flex items-center justify-between text-sm font-black text-neutral-950">
                            <span>Estimated Total:</span>
                            <span>₹{grandTotal}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={clearCart}
                            className="text-xs text-neutral-500 hover:text-red-700 underline font-bold"
                          >
                            Clear Entire Cart
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* STEP 1: PHONE AUTHENTICATION */}
                {checkoutStep === 'phone_auth' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-neutral-50 border-2 border-black space-y-1">
                      <h3 className="font-black text-xs uppercase text-neutral-950 flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-blue-700" />
                        Customer Mobile Authentication
                      </h3>
                      <p className="text-[11px] text-neutral-600 font-sans">
                        Quick OTP verification to track your order and dispatch live delivery updates.
                      </p>
                    </div>

                    {phoneAuthError && (
                      <div className="p-2.5 bg-red-100 border-2 border-red-600 text-red-900 text-xs font-bold flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>{phoneAuthError}</span>
                      </div>
                    )}

                    {!isPhoneVerified ? (
                      <div className="space-y-3">
                        <div>
                          <label htmlFor={phoneInputId} className="block text-xs font-bold uppercase text-neutral-800 mb-1">
                            Mobile Number (10 Digits):
                          </label>
                          <div className="flex items-center">
                            <span className="px-3 py-2 bg-neutral-200 border-2 border-r-0 border-black text-xs font-bold">
                              +91
                            </span>
                            <input
                              id={phoneInputId}
                              type="tel"
                              maxLength={10}
                              value={customerMobile}
                              onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                              placeholder="9876543210"
                              disabled={isOtpSent}
                              className="w-full p-2 border-2 border-black text-sm bg-white focus:outline-none focus:ring-1 focus:ring-black disabled:bg-neutral-100"
                            />
                          </div>
                        </div>

                        {!isOtpSent ? (
                          <button
                            type="button"
                            id="btn-send-phone-otp"
                            onClick={handleSendOtp}
                            className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Send 4-Digit OTP Code</span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                        ) : (
                          <div className="space-y-3 p-3 bg-neutral-50 border border-neutral-300">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-neutral-600">Code sent to +91 {customerMobile}</span>
                              <button
                                type="button"
                                onClick={() => setIsOtpSent(false)}
                                className="text-blue-700 underline font-bold"
                              >
                                Edit Number
                              </button>
                            </div>

                            {/* Demo OTP Helper callout */}
                            <div className="p-2 bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-center justify-between">
                              <span>Simulated SMS Code: <strong>{generatedOtp}</strong></span>
                              <button
                                type="button"
                                onClick={() => setOtpInput(generatedOtp || '1234')}
                                className="px-2 py-0.5 bg-amber-700 text-white text-[10px] font-bold uppercase"
                              >
                                Autofill
                              </button>
                            </div>

                            <div>
                              <label htmlFor={otpInputId} className="block text-xs font-bold uppercase text-neutral-800 mb-1">
                                Enter 4-Digit Code:
                              </label>
                              <input
                                id={otpInputId}
                                type="text"
                                maxLength={4}
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                placeholder="e.g. 4421"
                                className="w-full p-2 text-center tracking-widest text-lg font-black border-2 border-black bg-white focus:outline-none"
                              />
                            </div>

                            <button
                              type="button"
                              id="btn-verify-otp-submit"
                              onClick={handleVerifyOtp}
                              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-xs font-black uppercase border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                              <span>Verify Phone & Continue</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 border-2 border-emerald-600 text-emerald-950 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            Phone Verified: +91 {customerMobile}
                          </span>
                          <button
                            type="button"
                            onClick={handleChangePhone}
                            className="text-[11px] text-emerald-800 underline font-bold"
                          >
                            Change
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCheckoutStep('delivery_details')}
                          className="w-full py-2 bg-black text-white text-xs font-bold uppercase border border-black cursor-pointer"
                        >
                          Proceed to Delivery Address →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: DELIVERY DETAILS & PAYMENT METHOD */}
                {checkoutStep === 'delivery_details' && (
                  <div className="space-y-4">
                    <div className="p-2.5 bg-neutral-50 border border-neutral-300 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 font-bold text-neutral-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Verified Mobile: +91 {customerMobile}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCheckoutStep('phone_auth')}
                        className="text-neutral-500 hover:text-black underline text-[11px]"
                      >
                        Edit
                      </button>
                    </div>

                    {checkoutError && (
                      <div className="p-2.5 bg-red-100 border-2 border-red-600 text-red-900 text-xs font-bold flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>{checkoutError}</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label htmlFor={nameInputId} className="block text-xs font-bold uppercase text-neutral-800 mb-1">
                          Full Name *
                        </label>
                        <input
                          id={nameInputId}
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Aditi Sharma"
                          className="w-full p-2 border-2 border-black text-xs bg-white focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>

                      <div>
                        <label htmlFor={addressInputId} className="block text-xs font-bold uppercase text-neutral-800 mb-1">
                          Delivery Address (Flat / House / Street) *
                        </label>
                        <textarea
                          id={addressInputId}
                          rows={2}
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Flat 302, Green Valley Apartments, Main Market Road"
                          className="w-full p-2 border-2 border-black text-xs bg-white focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor={landmarkInputId} className="block text-xs font-bold uppercase text-neutral-800 mb-1">
                            Landmark
                          </label>
                          <input
                            id={landmarkInputId}
                            type="text"
                            value={landmark}
                            onChange={(e) => setLandmark(e.target.value)}
                            placeholder="Near Metro Station"
                            className="w-full p-2 border-2 border-black text-xs bg-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor={pincodeInputId} className="block text-xs font-bold uppercase text-neutral-800 mb-1">
                            Pincode
                          </label>
                          <input
                            id={pincodeInputId}
                            type="text"
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                            placeholder="110020"
                            className="w-full p-2 border-2 border-black text-xs bg-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor={notesInputId} className="block text-xs font-bold uppercase text-neutral-800 mb-1">
                          Delivery Note (Optional)
                        </label>
                        <input
                          id={notesInputId}
                          type="text"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="e.g. Ring bell twice or leave at reception"
                          className="w-full p-2 border-2 border-black text-xs bg-white focus:outline-none"
                        />
                      </div>

                      {/* Payment Method Selector */}
                      <div className="pt-2 border-t border-neutral-300 space-y-2">
                        <span className="block text-xs font-bold uppercase text-neutral-800">
                          Payment Mode:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('COD')}
                            className={`p-2.5 border-2 text-left cursor-pointer flex flex-col justify-between ${
                              paymentMethod === 'COD'
                                ? 'border-black bg-neutral-900 text-white'
                                : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'
                            }`}
                          >
                            <span className="font-bold text-xs">Cash on Delivery</span>
                            <span className="text-[10px] opacity-80 mt-1">Pay cash when order arrives</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMethod('UPI_QR')}
                            className={`p-2.5 border-2 text-left cursor-pointer flex flex-col justify-between ${
                              paymentMethod === 'UPI_QR'
                                ? 'border-black bg-neutral-900 text-white'
                                : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'
                            }`}
                          >
                            <span className="font-bold text-xs flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5 text-amber-400" />
                              <span>UPI QR on Delivery</span>
                            </span>
                            <span className="text-[10px] opacity-80 mt-1">GPay, PhonePe, Paytm QR</span>
                          </button>
                        </div>
                      </div>

                      {/* Final Order Review Total */}
                      <div className="p-3 bg-neutral-50 border-2 border-black space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Items Subtotal:</span>
                          <span className="font-bold">₹{itemSubtotal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery Fee:</span>
                          <span className="font-bold text-emerald-700">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                        </div>
                        <div className="pt-1.5 border-t border-neutral-300 flex justify-between text-sm font-black text-black">
                          <span>Amount Payable:</span>
                          <span>₹{grandTotal}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: ORDER CONFIRMATION & RECEIPT */}
                {checkoutStep === 'confirmation' && placedOrder && (
                  <div className="space-y-4 text-center py-2">
                    <div className="w-12 h-12 bg-emerald-600 text-white mx-auto flex items-center justify-center border-2 border-black">
                      <Check className="w-6 h-6 stroke-[3]" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-black uppercase text-neutral-950">
                        Order Placed Successfully!
                      </h3>
                      <p className="text-xs text-neutral-600 font-sans">
                        Your grocery order has been assigned to our local fulfillment depot.
                      </p>
                    </div>

                    {/* Order Reference Card */}
                    <div className="p-3 bg-neutral-50 border-2 border-black text-left space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                        <span className="font-bold text-neutral-500">Order Ref:</span>
                        <span className="font-black text-black">{placedOrder.id}</span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                        <span className="font-bold text-neutral-500">Invoice No:</span>
                        <span className="font-bold text-blue-800">{placedOrder.invoiceNumber}</span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                        <span className="font-bold text-neutral-500">Expected Delivery:</span>
                        <span className="font-black text-emerald-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>30 - 45 Minutes</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                        <span className="font-bold text-neutral-500">Recipient:</span>
                        <span className="font-bold text-black">{placedOrder.customerName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-500">Total Paid/Due:</span>
                        <span className="font-black text-sm text-black">₹{placedOrder.totalAmount}</span>
                      </div>
                    </div>

                    {/* Action buttons: View Bill / Print PDF */}
                    <div className="space-y-2 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          id="btn-retail-view-invoice"
                          onClick={() => {
                            setSelectedInvoiceOrder(placedOrder);
                            setAutoPrintInvoice(false);
                          }}
                          className="w-full py-2 bg-white hover:bg-neutral-100 text-black border-2 border-black font-mono text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-700" />
                          <span>View Bill</span>
                        </button>
                        <button
                          type="button"
                          id="btn-retail-print-pdf"
                          onClick={() => {
                            setSelectedInvoiceOrder(placedOrder);
                            setAutoPrintInvoice(true);
                          }}
                          className="w-full py-2 bg-black hover:bg-neutral-800 text-white border-2 border-black font-mono text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>Print PDF</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        id="btn-retail-continue-shopping"
                        onClick={() => {
                          setPlacedOrder(null);
                          setCheckoutStep('cart');
                          setIsCartOpen(false);
                        }}
                        className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white font-mono text-xs font-bold uppercase border-2 border-black cursor-pointer"
                      >
                        Continue Shopping
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 bg-neutral-50 border-t-2 border-black">
                {checkoutStep === 'cart' && cartEntries.length > 0 && (
                  <button
                    type="button"
                    id="btn-proceed-to-checkout"
                    onClick={() => {
                      if (isPhoneVerified) {
                        setCheckoutStep('delivery_details');
                      } else {
                        setCheckoutStep('phone_auth');
                      }
                    }}
                    className="w-full py-3 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase tracking-wider border-2 border-black flex items-center justify-center gap-2 cursor-pointer shadow-sm active:translate-y-0.5"
                  >
                    <span>Proceed to Checkout • ₹{grandTotal}</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </button>
                )}

                {checkoutStep === 'phone_auth' && (
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('cart')}
                    className="w-full py-2 bg-white hover:bg-neutral-100 text-neutral-700 font-mono text-xs font-bold uppercase border border-black cursor-pointer flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Cart</span>
                  </button>
                )}

                {checkoutStep === 'delivery_details' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      id="btn-place-retail-order"
                      onClick={handleFinalOrderSubmit}
                      className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-xs font-black uppercase tracking-wider border-2 border-black flex items-center justify-center gap-2 cursor-pointer shadow-sm active:translate-y-0.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                      <span>Place Order • ₹{grandTotal}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('phone_auth')}
                      className="w-full py-1.5 text-neutral-600 hover:text-black font-mono text-[11px] font-bold uppercase"
                    >
                      ← Back to Phone Verification
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal for Viewing and PDF printing */}
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
