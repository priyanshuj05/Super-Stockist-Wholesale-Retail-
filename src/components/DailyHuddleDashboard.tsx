import React, { useState, useEffect, useMemo } from 'react';
import { Product, Salesman, Order } from '../types.ts';
import { 
  CheckSquare, 
  Square, 
  Flame, 
  Target, 
  Sparkles, 
  TrendingUp, 
  CreditCard, 
  AlertCircle, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  RotateCcw,
  CheckCircle2,
  Zap,
  ShoppingBag,
  Clock,
  Filter,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface DailyHuddleDashboardProps {
  salesman: Salesman;
  products: Product[];
  orders: Order[];
  onQuickAddProduct?: (productId: string, quantity: number) => void;
  onOpenCollectionModal?: () => void;
  onOpenIssueModal?: () => void;
}

export type HuddleFilterType = 'all' | 'admin_notes' | 'quotas' | 'pending';

export interface HuddleObjective {
  id: string;
  type: 'focus_sku' | 'sales_target' | 'collection_target' | 'field_audit';
  priorityTier: 1 | 2 | 3 | 4 | 5;
  priorityLabel: string;
  title: string;
  directive: string;
  hasCustomAdminNote: boolean;
  product?: Product;
  metricText?: string;
  isAutoMet?: boolean;
  scheme?: string;
  stock?: number;
  wholesalePrice?: number;
  unitsBooked?: number;
  targetUnits?: number;
}

export const DailyHuddleDashboard: React.FC<DailyHuddleDashboardProps> = ({
  salesman,
  products,
  orders,
  onQuickAddProduct,
  onOpenCollectionModal,
  onOpenIssueModal,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<HuddleFilterType>('all');
  const [lastActionToast, setLastActionToast] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const storageKey = `fmcg_daily_huddle_${salesman.id}_${todayStr}`;

  // Checked state map: { [objectiveId: string]: boolean }
  const [checkedItems, setCheckedItems] = useState<{ [id: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checkedItems));
    } catch {
      // ignore
    }
  }, [checkedItems, storageKey]);

  // Format today's date nicely
  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Calculate booked units today for each SKU in orders
  const calculateBookedUnits = (productId: string) => {
    return orders
      .filter((o) => o.salesmanId === salesman.id || !o.salesmanId)
      .flatMap((o) => o.items)
      .filter((i) => i.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Helper: Try to extract numerical target units from admin note text (e.g. "Clear 50 units" -> 50)
  const extractTargetUnits = (note?: string): number | undefined => {
    if (!note) return undefined;
    const match = note.match(/(?:clear|push|sell|target|book)\s+(\d+)\s*(?:units|cases|pkts|bags|bottles|boxes)?/i);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return undefined;
  };

  // 1. Build List of Objectives with strict Prioritization
  const objectives = useMemo<HuddleObjective[]>(() => {
    const list: HuddleObjective[] = [];

    // A. Focus Products with Explicit Admin 'focusNote' inputs (P1: HIGHEST PRIORITY)
    const skusWithAdminNote = products.filter(
      (p) => p.focusNote && p.focusNote.trim().length > 0
    );

    skusWithAdminNote.forEach((prod) => {
      const booked = calculateBookedUnits(prod.id);
      const targetUnits = extractTargetUnits(prod.focusNote);
      const isMet = targetUnits ? booked >= targetUnits : booked > 0;

      list.push({
        id: `sku_note_${prod.id}`,
        type: 'focus_sku',
        priorityTier: 1,
        priorityLabel: 'P1 • ADMIN DIRECTIVE',
        title: `Priority SKU: ${prod.name} (${prod.sku})`,
        directive: prod.focusNote!.trim(),
        hasCustomAdminNote: true,
        product: prod,
        metricText: `₹${prod.wholesalePrice}/unit • Stock: ${prod.stock} units`,
        scheme: prod.wholesaleScheme,
        stock: prod.stock,
        wholesalePrice: prod.wholesalePrice,
        unitsBooked: booked,
        targetUnits,
        isAutoMet: isMet
      });
    });

    // B. Other Active Focus Products without custom text (P2: DEPOT FOCUS)
    const generalFocusSkus = products.filter(
      (p) => p.isFocusProduct && (!p.focusNote || p.focusNote.trim().length === 0)
    );

    generalFocusSkus.forEach((prod) => {
      const booked = calculateBookedUnits(prod.id);
      list.push({
        id: `sku_focus_${prod.id}`,
        type: 'focus_sku',
        priorityTier: 2,
        priorityLabel: 'P2 • DEPOT FOCUS',
        title: `Focus SKU: ${prod.name} (${prod.sku})`,
        directive: 'Depot Focus: Drive booking volume across retail kiranas and ensure shelf visibility.',
        hasCustomAdminNote: false,
        product: prod,
        metricText: `₹${prod.wholesalePrice}/unit • Stock: ${prod.stock} units`,
        scheme: prod.wholesaleScheme,
        stock: prod.stock,
        wholesalePrice: prod.wholesalePrice,
        unitsBooked: booked,
        isAutoMet: booked > 0
      });
    });

    // C. Daily Sales Revenue Target (P3: REVENUE RUN-RATE)
    const salesMet = salesman.targetSales > 0 && salesman.achievedSales >= salesman.targetSales;
    const salesPercent = salesman.targetSales > 0 ? Math.round((salesman.achievedSales / salesman.targetSales) * 100) : 0;
    const salesRemaining = Math.max(0, salesman.targetSales - salesman.achievedSales);

    list.push({
      id: 'obj_sales_quota',
      type: 'sales_target',
      priorityTier: 3,
      priorityLabel: 'P3 • SALES QUOTA',
      title: 'Achieve Daily Wholesale Revenue Target',
      directive: `Punch ₹${salesman.targetSales.toLocaleString('en-IN')} in total wholesale bookings on assigned beat today.`,
      hasCustomAdminNote: false,
      metricText: `Current: ₹${salesman.achievedSales.toLocaleString('en-IN')} (${salesPercent}%) • Remaining: ₹${salesRemaining.toLocaleString('en-IN')}`,
      isAutoMet: salesMet
    });

    // D. Daily Cash / Cheque Recovery Target (P4: COLLECTION QUOTA)
    const collectionMet = salesman.targetCollection > 0 && salesman.achievedCollection >= salesman.targetCollection;
    const collectionPercent = salesman.targetCollection > 0 ? Math.round((salesman.achievedCollection / salesman.targetCollection) * 100) : 0;
    const collectionRemaining = Math.max(0, salesman.targetCollection - salesman.achievedCollection);

    list.push({
      id: 'obj_collection_quota',
      type: 'collection_target',
      priorityTier: 4,
      priorityLabel: 'P4 • CASH RECOVERY',
      title: 'Recover Credit Dues & Payment Collections',
      directive: `Collect ₹${salesman.targetCollection.toLocaleString('en-IN')} from outstanding market retailer ledgers.`,
      hasCustomAdminNote: false,
      metricText: `Recovered: ₹${salesman.achievedCollection.toLocaleString('en-IN')} (${collectionPercent}%) • Pending: ₹${collectionRemaining.toLocaleString('en-IN')}`,
      isAutoMet: collectionMet
    });

    // E. Field Audit & Escalation (P5: FIELD RECON)
    list.push({
      id: 'obj_market_audit',
      type: 'field_audit',
      priorityTier: 5,
      priorityLabel: 'P5 • FIELD AUDIT',
      title: 'Market Audit & Escalation Reporting',
      directive: 'Audit competitor schemes, identify expired goods, and immediately submit dispute tickets to Admin.',
      hasCustomAdminNote: false,
      metricText: 'Escalate store issues via "Mark Problem" modal for admin intervention',
      isAutoMet: false
    });

    // Sort by priorityTier ascending (1 -> 2 -> 3 -> 4 -> 5)
    return list.sort((a, b) => a.priorityTier - b.priorityTier);
  }, [products, orders, salesman]);

  // Check if item is completed (either manually checked OR auto met by app data)
  const isItemCompleted = (obj: HuddleObjective) => {
    return checkedItems[obj.id] === true || (obj.isAutoMet === true && checkedItems[obj.id] !== false);
  };

  // Toggle checklist item
  const toggleItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Reset checklist for today
  const handleResetChecklist = () => {
    if (window.confirm("Reset all checkmarks in today's Daily Huddle?")) {
      setCheckedItems({});
      setLastActionToast('Checklist reset for today.');
      setTimeout(() => setLastActionToast(null), 3000);
    }
  };

  // Mark all completed
  const handleMarkAllComplete = () => {
    const allChecked: { [id: string]: boolean } = {};
    objectives.forEach((obj) => {
      allChecked[obj.id] = true;
    });
    setCheckedItems(allChecked);
    setLastActionToast('✓ All huddle objectives marked complete!');
    setTimeout(() => setLastActionToast(null), 3000);
  };

  // Filtered objectives list
  const filteredObjectives = useMemo(() => {
    switch (activeFilter) {
      case 'admin_notes':
        return objectives.filter((o) => o.hasCustomAdminNote);
      case 'quotas':
        return objectives.filter((o) => o.type === 'sales_target' || o.type === 'collection_target');
      case 'pending':
        return objectives.filter((o) => !isItemCompleted(o));
      default:
        return objectives;
    }
  }, [objectives, activeFilter, checkedItems]);

  // Count completions
  const completedCount = objectives.filter(isItemCompleted).length;
  const totalCount = objectives.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllComplete = completedCount === totalCount && totalCount > 0;
  const adminDirectiveCount = objectives.filter((o) => o.hasCustomAdminNote).length;

  return (
    <div 
      id="daily-huddle-dashboard" 
      className="border-2 border-black bg-white shadow-xs overflow-hidden"
    >
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-black text-white p-3 flex items-center justify-between cursor-pointer select-none border-b-2 border-black hover:bg-neutral-900 transition-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-400 text-black font-black flex items-center justify-center border border-black text-xs flex-shrink-0">
            <Zap className="w-5 h-5 fill-black" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
                Daily Huddle & Shift Briefing
              </span>
              <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-mono font-bold uppercase tracking-tight flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                Synced from Admin
              </span>
            </div>
            <p className="text-[10px] font-mono text-neutral-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-neutral-300">
                <Calendar className="w-3 h-3 text-amber-300" />
                {formattedToday}
              </span>
              <span>•</span>
              <span className="text-amber-200 font-bold">
                {adminDirectiveCount} Admin Focus Directive{adminDirectiveCount !== 1 ? 's' : ''}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="text-right font-mono hidden sm:block">
            <span className="text-[9px] text-neutral-400 block uppercase">Shift Alignment</span>
            <span className={`text-xs font-black ${isAllComplete ? 'text-emerald-400' : 'text-amber-300'}`}>
              {completedCount}/{totalCount} Done ({progressPercent}%)
            </span>
          </div>

          <button
            type="button"
            aria-label={isExpanded ? 'Collapse Daily Huddle' : 'Expand Daily Huddle'}
            className="w-7 h-7 border border-neutral-600 bg-neutral-800 text-white flex items-center justify-center hover:bg-neutral-700 cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar Ribbon */}
      <div className="bg-neutral-100 border-b border-black p-2.5 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-black uppercase text-[11px] text-neutral-800 flex-shrink-0">
            Shift Objectives:
          </span>
          <div className="w-full bg-neutral-300 border border-black h-3 p-0.5 max-w-xs">
            <div 
              className={`h-full transition-all duration-300 ${
                isAllComplete ? 'bg-emerald-600' : 'bg-black'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-black text-neutral-900 text-[11px] flex-shrink-0">
            {completedCount}/{totalCount} ({progressPercent}%)
          </span>
        </div>

        {isAllComplete ? (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase flex items-center gap-1 flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Shift Quota Met!
          </span>
        ) : (
          <span className="text-[10px] text-neutral-600 font-bold uppercase hidden md:inline">
            Prioritized Field Goals
          </span>
        )}
      </div>

      {/* Action Toast Feedback */}
      {lastActionToast && (
        <div className="bg-emerald-600 text-white font-mono text-xs px-3 py-1.5 flex items-center justify-between">
          <span>{lastActionToast}</span>
          <span className="text-[10px] opacity-80">Auto-saved</span>
        </div>
      )}

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3 font-mono">
          {/* Admin Live Sync Notice */}
          <div className="bg-amber-50 border-2 border-amber-600 p-2.5 text-xs flex items-start gap-2.5">
            <Flame className="w-4 h-4 text-amber-700 fill-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-snug text-amber-950">
              <strong className="uppercase font-black text-amber-900">Admin Focus Directives:</strong>{' '}
              Key priorities set by Depot HQ in product focus notes. Focus on clearing these SKUs during retail visits today for maximum dealer schemes, retail distribution run-rate, and sales commission.
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 border-b border-black pb-2 overflow-x-auto text-[11px]">
            <span className="text-[10px] font-bold uppercase text-neutral-500 mr-1 flex items-center gap-1 flex-shrink-0">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              type="button"
              id="btn-filter-huddle-all"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 font-bold uppercase border cursor-pointer flex-shrink-0 transition-none ${
                activeFilter === 'all'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:border-black'
              }`}
            >
              All ({objectives.length})
            </button>
            <button
              type="button"
              id="btn-filter-huddle-admin"
              onClick={() => setActiveFilter('admin_notes')}
              className={`px-2.5 py-1 font-bold uppercase border cursor-pointer flex-shrink-0 transition-none flex items-center gap-1 ${
                activeFilter === 'admin_notes'
                  ? 'bg-amber-400 text-black border-black font-black'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:border-black'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-700 fill-amber-500" />
              <span>Admin Directives ({adminDirectiveCount})</span>
            </button>
            <button
              type="button"
              id="btn-filter-huddle-quotas"
              onClick={() => setActiveFilter('quotas')}
              className={`px-2.5 py-1 font-bold uppercase border cursor-pointer flex-shrink-0 transition-none ${
                activeFilter === 'quotas'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:border-black'
              }`}
            >
              Revenue & Quotas (2)
            </button>
            <button
              type="button"
              id="btn-filter-huddle-pending"
              onClick={() => setActiveFilter('pending')}
              className={`px-2.5 py-1 font-bold uppercase border cursor-pointer flex-shrink-0 transition-none ${
                activeFilter === 'pending'
                  ? 'bg-neutral-800 text-white border-black'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:border-black'
              }`}
            >
              Pending ({totalCount - completedCount})
            </button>
          </div>

          {/* Objectives Checklist List */}
          <div className="space-y-2.5">
            {filteredObjectives.map((obj) => {
              const completed = isItemCompleted(obj);
              const isP1 = obj.priorityTier === 1;
              const isP2 = obj.priorityTier === 2;

              return (
                <div
                  key={obj.id}
                  id={`huddle-item-${obj.id}`}
                  className={`border-2 p-2.5 transition-none ${
                    completed
                      ? 'border-emerald-600 bg-emerald-50/70 text-neutral-800'
                      : isP1
                      ? 'border-amber-500 bg-amber-50/30 ring-1 ring-amber-400'
                      : isP2
                      ? 'border-neutral-900 bg-white'
                      : 'border-neutral-400 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    {/* Checkbox & Objective Details */}
                    <div className="flex items-start gap-2.5 flex-1">
                      <button
                        type="button"
                        id={`btn-toggle-huddle-${obj.id}`}
                        onClick={() => toggleItem(obj.id)}
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 border-2 flex items-center justify-center cursor-pointer transition-none ${
                          completed
                            ? 'bg-emerald-600 border-black text-white'
                            : 'bg-white border-black hover:bg-neutral-100 text-transparent'
                        }`}
                        title={completed ? 'Mark incomplete' : 'Mark completed'}
                      >
                        {completed ? (
                          <CheckSquare className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-neutral-400" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Title and Priority Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wide border ${
                            isP1
                              ? 'bg-amber-400 text-black border-black shadow-xs font-black'
                              : isP2
                              ? 'bg-blue-100 text-blue-900 border-blue-400 font-bold'
                              : obj.type === 'sales_target'
                              ? 'bg-black text-white border-black'
                              : obj.type === 'collection_target'
                              ? 'bg-emerald-800 text-white border-emerald-950'
                              : 'bg-neutral-200 text-neutral-800 border-neutral-400'
                          }`}>
                            {obj.priorityLabel}
                          </span>

                          <span className={`text-xs font-black ${completed ? 'line-through text-neutral-500' : 'text-neutral-950'}`}>
                            {obj.title}
                          </span>

                          {obj.isAutoMet && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-950 border border-emerald-500 px-1 py-0.2 font-black uppercase flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-emerald-700" />
                              Auto-detected
                            </span>
                          )}

                          {obj.unitsBooked !== undefined && obj.unitsBooked > 0 && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-400 px-1.5 py-0.2 font-bold">
                              ✓ {obj.unitsBooked} booked today
                            </span>
                          )}
                        </div>

                        {/* Synced Directive Box (Highlighting Admin focusNote) */}
                        <div className={`text-xs p-2 border font-sans ${
                          isP1 
                            ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-medium' 
                            : 'bg-neutral-100 border-neutral-300 text-neutral-800'
                        }`}>
                          <div className="flex items-center justify-between text-[10px] font-mono uppercase font-black tracking-wider text-neutral-600 mb-0.5">
                            <span className="flex items-center gap-1">
                              {isP1 && <Flame className="w-3 h-3 text-amber-700 fill-amber-500" />}
                              {isP1 ? 'DIRECTIVE FROM ADMIN HQ:' : 'OBJECTIVE DIRECTIVE:'}
                            </span>
                            {isP1 && (
                              <span className="text-[9px] bg-amber-300 text-amber-900 px-1 border border-amber-500 font-bold">
                                Live Synced
                              </span>
                            )}
                          </div>
                          <div className="text-xs leading-relaxed font-bold">
                            "{obj.directive}"
                          </div>
                        </div>

                        {/* Scheme, Pricing & Target Context */}
                        <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-600 font-mono flex-wrap pt-0.5">
                          <span>{obj.metricText}</span>
                          {obj.scheme && (
                            <span className="text-amber-950 bg-amber-100 border border-amber-300 px-1.5 py-0.5 font-bold text-[10px]">
                              🎁 {obj.scheme}
                            </span>
                          )}
                        </div>

                        {/* Progress Bar for SKUs with Target Units */}
                        {obj.targetUnits && obj.targetUnits > 0 && (
                          <div className="space-y-0.5 pt-1">
                            <div className="flex justify-between text-[10px] font-mono text-neutral-700">
                              <span>Target: {obj.targetUnits} units</span>
                              <span>Booked: {obj.unitsBooked || 0} / {obj.targetUnits} ({Math.min(100, Math.round(((obj.unitsBooked || 0) / obj.targetUnits) * 100))}%)</span>
                            </div>
                            <div className="w-full bg-neutral-200 border border-neutral-400 h-2">
                              <div
                                className={`h-full ${((obj.unitsBooked || 0) >= obj.targetUnits) ? 'bg-emerald-600' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(100, Math.round(((obj.unitsBooked || 0) / obj.targetUnits) * 100))}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Button for Focus SKUs or Modals */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {(isP1 || isP2) && obj.product && onQuickAddProduct && (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            id={`btn-huddle-quick-add-${obj.product.id}`}
                            onClick={() => {
                              if (obj.product) {
                                onQuickAddProduct(obj.product.id, 5);
                                setLastActionToast(`+5 units of ${obj.product.name} added to cart`);
                                setTimeout(() => setLastActionToast(null), 3000);
                                const orderSection = document.getElementById('salesman-wholesale-order-section');
                                if (orderSection) {
                                  orderSection.scrollIntoView({ behavior: 'smooth' });
                                }
                              }
                            }}
                            disabled={obj.product.stock <= 0}
                            className="px-2.5 py-1.5 bg-black hover:bg-neutral-800 text-white text-[10px] font-black uppercase flex items-center gap-1 border border-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                            title="Add 5 units of this focus item directly into the order builder"
                          >
                            <Plus className="w-3 h-3 text-amber-300" />
                            <span>Add 5 to Cart</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (obj.product) {
                                  onQuickAddProduct(obj.product.id, 1);
                                  setLastActionToast(`+1 unit added`);
                                  setTimeout(() => setLastActionToast(null), 2500);
                                }
                              }}
                              disabled={obj.product.stock <= 0}
                              className="px-1.5 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-400 text-[9px] font-bold"
                              title="Add 1 unit"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (obj.product) {
                                  onQuickAddProduct(obj.product.id, 10);
                                  setLastActionToast(`+10 units added`);
                                  setTimeout(() => setLastActionToast(null), 2500);
                                }
                              }}
                              disabled={obj.product.stock < 10}
                              className="px-1.5 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-400 text-[9px] font-bold"
                              title="Add 10 units"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      )}

                      {obj.type === 'collection_target' && onOpenCollectionModal && (
                        <button
                          type="button"
                          id="btn-huddle-record-collection"
                          onClick={onOpenCollectionModal}
                          className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black uppercase flex items-center gap-1 border border-black cursor-pointer shadow-xs"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Collect</span>
                        </button>
                      )}

                      {obj.type === 'field_audit' && onOpenIssueModal && (
                        <button
                          type="button"
                          id="btn-huddle-report-dispute"
                          onClick={onOpenIssueModal}
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase flex items-center gap-1 border border-black cursor-pointer shadow-xs"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-white" />
                          <span>Report</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredObjectives.length === 0 && (
              <div className="p-4 text-center border-2 border-dashed border-neutral-300 text-neutral-500 text-xs">
                No objectives found matching current filter.
              </div>
            )}
          </div>

          {/* Checklist Quick Controls & Shift Status */}
          <div className="border-t-2 border-black pt-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-huddle-mark-all"
                onClick={handleMarkAllComplete}
                className="px-2.5 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-900 border border-neutral-600 text-[10px] font-bold uppercase cursor-pointer"
              >
                Mark All Met
              </button>
              <button
                type="button"
                id="btn-huddle-reset"
                onClick={handleResetChecklist}
                className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-400 text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-neutral-500" />
                <span>Reset Day</span>
              </button>
            </div>

            <div className="text-[10px] text-neutral-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Checklist live-synced with Admin focus notes.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
