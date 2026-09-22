import { useApp } from '../context/AppContext.tsx';
import { Package, ShoppingBag, AlertTriangle, Smartphone, RotateCcw, Target } from 'lucide-react';

export function HeaderMetricsBar() {
  const { 
    currentUser,
    products, 
    orders, 
    issues, 
    salesman,
    isMobilePreview, 
    setIsMobilePreview, 
    resetDemoData 
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';

  // Admin sees depot totals
  const totalProducts = products.length;
  const wholesaleOrders = orders.filter((o) => o.orderType === 'wholesale');
  const retailOrders = orders.filter((o) => o.orderType === 'retail');
  const totalOrders = orders.length;
  const pendingIssues = issues.filter((i) => i.status === 'OPEN' || i.status === 'UNDER_REVIEW');

  // Salesman sees strictly their own bookings and tickets
  const myOrders = orders.filter((o) => o.salesmanId === salesman.id);
  const myIssues = issues.filter((i) => i.salesmanName === salesman.name);
  const myPendingIssues = myIssues.filter((i) => i.status === 'OPEN' || i.status === 'UNDER_REVIEW');

  return (
    <div 
      id="header-quick-metrics-bar" 
      className="bg-white border-b-2 border-black px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono select-none"
    >
      {/* Metrics Section */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {isAdmin ? (
          <>
            {/* Admin Metric 1: Total Master Products */}
            <div 
              id="metric-master-products" 
              className="flex items-center gap-1.5 bg-neutral-100 border border-black px-2 py-1"
              title="Total Master Products configured in Depot"
            >
              <Package className="w-3.5 h-3.5 text-black" />
              <span className="text-neutral-600 text-[11px] uppercase font-bold">Depot SKUs:</span>
              <span className="font-black text-black">{totalProducts}</span>
            </div>

            {/* Admin Metric 2: Orders Placed with Wholesale vs Retail Breakdown */}
            <div 
              id="metric-total-orders" 
              className="flex items-center gap-1.5 bg-neutral-100 border border-black px-2 py-1"
              title="Total Orders Placed (Wholesale B2B vs Retail D2C)"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-neutral-600 text-[11px] uppercase font-bold">Orders:</span>
              <span className="font-black text-black">{totalOrders}</span>
              <span className="text-neutral-400">|</span>
              <span className="text-[11px] font-bold text-neutral-800">
                <span className="text-blue-700">W/S: {wholesaleOrders.length}</span>
                <span className="mx-1">•</span>
                <span className="text-emerald-700">Ret: {retailOrders.length}</span>
              </span>
            </div>

            {/* Admin Metric 3: Total Pending Issues */}
            <div 
              id="metric-pending-issues" 
              className={`flex items-center gap-1.5 border px-2 py-1 ${
                pendingIssues.length > 0 
                  ? 'bg-red-50 border-red-600 text-red-900 font-bold' 
                  : 'bg-neutral-100 border-black text-neutral-700'
              }`}
              title="Total Open/Pending Field Disputes from Sales Reps"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${pendingIssues.length > 0 ? 'text-red-600 fill-red-100' : 'text-neutral-500'}`} />
              <span className="text-[11px] uppercase font-bold">Field Issues:</span>
              <span className={`font-black ${pendingIssues.length > 0 ? 'text-red-700' : 'text-black'}`}>
                {pendingIssues.length}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Salesman Metric 1: My Target Run-rate */}
            <div 
              id="metric-salesman-runrate" 
              className="flex items-center gap-1.5 bg-neutral-100 border border-black px-2 py-1"
              title="Your assigned sales target"
            >
              <Target className="w-3.5 h-3.5 text-blue-700" />
              <span className="text-neutral-600 text-[11px] uppercase font-bold">My Quota:</span>
              <span className="font-black text-black">
                ₹{salesman.achievedSales.toLocaleString('en-IN')} / ₹{salesman.targetSales.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Salesman Metric 2: My Bookings */}
            <div 
              id="metric-salesman-bookings" 
              className="flex items-center gap-1.5 bg-neutral-100 border border-black px-2 py-1"
              title="Your booked wholesale orders"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-neutral-600 text-[11px] uppercase font-bold">My Orders:</span>
              <span className="font-black text-black">{myOrders.length} Booked</span>
            </div>

            {/* Salesman Metric 3: My Tickets */}
            <div 
              id="metric-salesman-issues" 
              className={`flex items-center gap-1.5 border px-2 py-1 ${
                myPendingIssues.length > 0 
                  ? 'bg-amber-50 border-amber-600 text-amber-900 font-bold' 
                  : 'bg-neutral-100 border-black text-neutral-700'
              }`}
              title="Disputes submitted by you"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${myPendingIssues.length > 0 ? 'text-amber-600' : 'text-neutral-500'}`} />
              <span className="text-[11px] uppercase font-bold">My Tickets:</span>
              <span className="font-black text-black">{myIssues.length} ({myPendingIssues.length} Open)</span>
            </div>
          </>
        )}
      </div>

      {/* Action Controls: Mobile View Toggle + Reset Demo Data (Reset only for Admin) */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Mobile View Toggle */}
        <button
          id="btn-toggle-mobile-preview"
          type="button"
          onClick={() => setIsMobilePreview((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-black uppercase border-2 cursor-pointer transition-none ${
            isMobilePreview
              ? 'bg-amber-400 text-black border-black ring-1 ring-black shadow-none'
              : 'bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800'
          }`}
          title="Toggle 412px Mobile Viewport Preview to test mobile salesman experience"
        >
          <Smartphone className={`w-3.5 h-3.5 ${isMobilePreview ? 'text-black' : 'text-amber-400'}`} />
          <span>{isMobilePreview ? 'Exit Mobile Frame' : 'Mobile Screen Preview'}</span>
          <span className={`text-[10px] px-1 py-0.2 ${isMobilePreview ? 'bg-black text-amber-400' : 'bg-neutral-800 text-neutral-300'}`}>
            {isMobilePreview ? '412px Active' : 'Off'}
          </span>
        </button>

        {/* Reset Demo Data Button - Admin Only */}
        {isAdmin && (
          <button
            id="btn-reset-demo-state"
            type="button"
            onClick={() => {
              if (window.confirm('Reset all SKU stocks, orders, collections and tickets to clean baseline demo data?')) {
                resetDemoData();
              }
            }}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-bold uppercase border border-neutral-400 bg-white hover:bg-neutral-200 text-neutral-700 cursor-pointer"
            title="Reset master products, salesman quotas, orders and issues"
          >
            <RotateCcw className="w-3 h-3 text-neutral-600" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>
        )}
      </div>
    </div>
  );
}
