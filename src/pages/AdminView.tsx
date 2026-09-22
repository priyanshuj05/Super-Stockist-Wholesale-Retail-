import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Product, Order, CompanyProfile } from '../types.ts';
import { InvoiceModal } from '../components/InvoiceModal.tsx';
import { 
  Package, 
  Plus, 
  Edit3, 
  Check, 
  X, 
  Star, 
  TrendingUp, 
  AlertTriangle,
  Layers,
  Search,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Building,
  Building2,
  ShoppingBag,
  Users,
  UserPlus,
  Lock,
  Key,
  FileText,
  Printer,
  Eye,
  Upload,
  Image as ImageIcon,
  CreditCard,
  QrCode,
  Tag,
  Gift
} from 'lucide-react';

export function AdminView() {
  const { 
    products, 
    salesman,
    salesmen,
    orders,
    issues, 
    companyProfile,
    updateCompanyProfile,
    resetDemoData,
    updateStock, 
    toggleFocusProduct, 
    addProduct,
    updateProduct,
    updateSalesmanTargets,
    createSalesman,
    updateOrderStatus,
    updateIssueStatus 
  } = useApp();

  // 6 Sub-Navigation Tabs: products, orders, salesman, accounts, issues, company
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'salesman' | 'accounts' | 'company' | 'issues'>('products');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'wholesale' | 'retail'>('ALL');

  // Selected Order for Invoice Modal
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState<boolean>(false);

  // Company Setup Form State
  const [companyForm, setCompanyForm] = useState<CompanyProfile>(companyProfile);
  const [companySaveSuccess, setCompanySaveSuccess] = useState(false);

  // Sync companyForm when companyProfile changes
  useEffect(() => {
    setCompanyForm(companyProfile);
  }, [companyProfile]);

  // Currently selected salesman for quota management
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>(salesman.id);
  const activeManagedSalesman = salesmen.find((s) => s.id === selectedSalesmanId) || salesman;

  // Search & Filter for products
  const [searchQuery, setSearchQuery] = useState('');

  // Add Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductHsn, setNewProductHsn] = useState('2106');
  const [newProductStock, setNewProductStock] = useState<number | ''>(50);
  const [newProductRetail, setNewProductRetail] = useState<number | ''>(100);
  const [newProductWholesale, setNewProductWholesale] = useState<number | ''>(85);
  const [newProductWholesaleScheme, setNewProductWholesaleScheme] = useState('');
  const [newProductRetailOffer, setNewProductRetailOffer] = useState('');
  const [newIsFocus, setNewIsFocus] = useState(false);
  const [newFocusNote, setNewFocusNote] = useState('');
  const [addError, setAddError] = useState('');

  // Row Edit State (Inline / Modal Editing)
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    stock: number;
    retailPrice: number;
    wholesalePrice: number;
    isFocusProduct: boolean;
    focusNote: string;
    hsn: string;
    wholesaleScheme: string;
    retailOffer: string;
  }>({
    stock: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    isFocusProduct: false,
    focusNote: '',
    hsn: '',
    wholesaleScheme: '',
    retailOffer: '',
  });

  // Salesman Targets Edit State
  const [targetSalesInput, setTargetSalesInput] = useState<number>(activeManagedSalesman.targetSales);
  const [targetCollectionInput, setTargetCollectionInput] = useState<number>(activeManagedSalesman.targetCollection);
  const [targetSaveMsg, setTargetSaveMsg] = useState('');

  // Sync target inputs when changing selected salesman
  const handleSelectSalesmanForQuota = (sId: string) => {
    setSelectedSalesmanId(sId);
    const targetRep = salesmen.find((s) => s.id === sId);
    if (targetRep) {
      setTargetSalesInput(targetRep.targetSales);
      setTargetCollectionInput(targetRep.targetCollection);
      setTargetSaveMsg('');
    }
  };

  // Add New Salesman Modal / Form State
  const [showCreateSalesmanModal, setShowCreateSalesmanModal] = useState(false);
  const [newSalesmanName, setNewSalesmanName] = useState('');
  const [newSalesmanUsername, setNewSalesmanUsername] = useState('');
  const [newSalesmanPassword, setNewSalesmanPassword] = useState('123');
  const [newSalesmanSalesQuota, setNewSalesmanSalesQuota] = useState<number | ''>(100000);
  const [newSalesmanCollectionQuota, setNewSalesmanCollectionQuota] = useState<number | ''>(80000);
  const [createSalesmanError, setCreateSalesmanError] = useState('');
  const [createSalesmanSuccess, setCreateSalesmanSuccess] = useState('');

  // Category filter for issues
  const [issueCategoryFilter, setIssueCategoryFilter] = useState<string>('ALL');

  // Calculations for quick metrics
  const totalInventoryUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const totalWholesaleValue = products.reduce((acc, p) => acc + p.stock * p.wholesalePrice, 0);
  const totalRetailValue = products.reduce((acc, p) => acc + p.stock * p.retailPrice, 0);

  const salesPercentage = activeManagedSalesman.targetSales > 0 
    ? Math.round((activeManagedSalesman.achievedSales / activeManagedSalesman.targetSales) * 100) 
    : 0;
  const collectionPercentage = activeManagedSalesman.targetCollection > 0 
    ? Math.round((activeManagedSalesman.achievedCollection / activeManagedSalesman.targetCollection) * 100) 
    : 0;

  const openIssuesCount = issues.filter((i) => i.status === 'OPEN').length;

  // Handler: Start Row Editing
  const handleStartEdit = (product: Product) => {
    setEditingProductId(product.id);
    setEditForm({
      stock: product.stock,
      retailPrice: product.retailPrice,
      wholesalePrice: product.wholesalePrice,
      isFocusProduct: product.isFocusProduct,
      focusNote: product.focusNote || '',
      hsn: product.hsn || '',
      wholesaleScheme: product.wholesaleScheme || '',
      retailOffer: product.retailOffer || '',
    });
  };

  // Handler: Save Row Edit
  const handleSaveEdit = (productId: string) => {
    updateProduct(productId, {
      stock: Math.max(0, editForm.stock),
      retailPrice: Math.max(0, editForm.retailPrice),
      wholesalePrice: Math.max(0, editForm.wholesalePrice),
      isFocusProduct: editForm.isFocusProduct,
      focusNote: editForm.isFocusProduct ? editForm.focusNote : '',
      hsn: editForm.hsn.trim(),
      wholesaleScheme: editForm.wholesaleScheme.trim(),
      retailOffer: editForm.retailOffer.trim(),
    });
    setEditingProductId(null);
  };

  // Handler: Add New Product
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductSku.trim()) {
      setAddError('Product Name and SKU are required.');
      return;
    }

    if (newProductRetail === '' || newProductWholesale === '' || newProductStock === '') {
      setAddError('All pricing and stock values must be specified.');
      return;
    }

    if (newProductWholesale > newProductRetail) {
      setAddError('Wholesale price cannot exceed Retail Price (MRP).');
      return;
    }

    addProduct({
      name: newProductName.trim(),
      sku: newProductSku.trim().toUpperCase(),
      stock: Number(newProductStock),
      retailPrice: Number(newProductRetail),
      wholesalePrice: Number(newProductWholesale),
      isFocusProduct: newIsFocus,
      focusNote: newIsFocus ? newFocusNote.trim() : '',
      hsn: newProductHsn.trim() || '2106',
      wholesaleScheme: newProductWholesaleScheme.trim(),
      retailOffer: newProductRetailOffer.trim(),
    });

    // Reset Form
    setNewProductName('');
    setNewProductSku('');
    setNewProductHsn('2106');
    setNewProductStock(50);
    setNewProductRetail(100);
    setNewProductWholesale(85);
    setNewProductWholesaleScheme('');
    setNewProductRetailOffer('');
    setNewIsFocus(false);
    setNewFocusNote('');
    setAddError('');
    setShowAddModal(false);
  };

  // Handlers for Company Profile & Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCompanyForm((prev) => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompanyForm((prev) => ({ ...prev, logoUrl: '' }));
  };

  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile(companyForm);
    setCompanySaveSuccess(true);
    setTimeout(() => setCompanySaveSuccess(false), 3000);
  };

  // Handler: Save Salesman Targets for currently managed salesman
  const handleSaveTargets = (e: React.FormEvent) => {
    e.preventDefault();
    updateSalesmanTargets(activeManagedSalesman.id, targetSalesInput, targetCollectionInput);
    setTargetSaveMsg(`Monthly targets for ${activeManagedSalesman.name} updated successfully.`);
    setTimeout(() => setTargetSaveMsg(''), 3500);
  };

  // Handler: Provision / Register New Salesman Account
  const handleCreateSalesmanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSalesmanError('');
    setCreateSalesmanSuccess('');

    if (!newSalesmanName.trim()) {
      setCreateSalesmanError('Salesman full name is required.');
      return;
    }
    if (!newSalesmanUsername.trim()) {
      setCreateSalesmanError('Username / Login ID is required.');
      return;
    }

    const res = createSalesman({
      name: newSalesmanName.trim(),
      username: newSalesmanUsername.trim().toLowerCase(),
      password: newSalesmanPassword.trim() || '123',
      targetSales: Number(newSalesmanSalesQuota) || 100000,
      targetCollection: Number(newSalesmanCollectionQuota) || 80000,
    });

    if (!res.success) {
      setCreateSalesmanError(res.message || 'Failed to create salesman account.');
      return;
    }

    setCreateSalesmanSuccess(`✓ Salesman account "${newSalesmanName}" (@${newSalesmanUsername.toLowerCase()}) successfully registered with credentials.`);
    setNewSalesmanName('');
    setNewSalesmanUsername('');
    setNewSalesmanPassword('123');
    setNewSalesmanSalesQuota(100000);
    setNewSalesmanCollectionQuota(80000);
    setShowCreateSalesmanModal(false);
    setTimeout(() => setCreateSalesmanSuccess(''), 4500);
  };

  // Handler: Quick Stock Adjust in Table
  const handleInlineStockStep = (productId: string, currentStock: number, delta: number) => {
    updateStock(productId, currentStock + delta);
  };

  // Filtered Products
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered Issues
  const filteredIssues = issues.filter((iss) => {
    if (issueCategoryFilter === 'ALL') return true;
    return iss.category === issueCategoryFilter;
  });

  return (
    <div id="view-admin" className="p-3 sm:p-5 max-w-7xl mx-auto space-y-5">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white border-2 border-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-block bg-black text-white px-2 py-0.5 text-xs font-mono font-bold uppercase mb-1">
            Super Stockist HQ / Depot Command
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neutral-900">
            Admin Master Control
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 font-mono mt-0.5">
            Manage SKU wholesale margins, allocate salesman quotas, and resolve field retailer disputes.
          </p>
        </div>

        {/* Global Stock KPI indicators */}
        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
          <div className="border border-black p-2 bg-neutral-50">
            <span className="text-neutral-500 block text-[10px] uppercase">Active SKUs</span>
            <span className="text-base sm:text-lg font-black text-black">{products.length}</span>
          </div>
          <div className="border border-black p-2 bg-neutral-50">
            <span className="text-neutral-500 block text-[10px] uppercase">Physical Units</span>
            <span className="text-base sm:text-lg font-black text-black">{totalInventoryUnits}</span>
          </div>
          <div className="border border-black p-2 bg-neutral-50">
            <span className="text-neutral-500 block text-[10px] uppercase">Stock Value (W/S)</span>
            <span className="text-base sm:text-lg font-black text-emerald-800">
              ₹{totalWholesaleValue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Clean Sub-Navigation Tabs */}
      <div id="admin-sub-tabs-container" className="border-b-2 border-black bg-neutral-100 flex flex-wrap gap-1 p-1">
        <button
          id="admin-subtab-products"
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 font-mono text-xs sm:text-sm font-black uppercase border-2 flex items-center gap-2 cursor-pointer transition-none ${
            activeTab === 'products'
              ? 'bg-black text-white border-black ring-1 ring-black'
              : 'bg-white text-neutral-800 border-neutral-400 hover:border-black'
          }`}
        >
          <Package className={`w-4 h-4 ${activeTab === 'products' ? 'text-amber-400' : 'text-neutral-600'}`} />
          <span>Tab 1: Product & Pricing Master</span>
          <span className={`px-1.5 py-0.2 text-[10px] ${activeTab === 'products' ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-black'}`}>
            {products.length}
          </span>
        </button>

        <button
          id="admin-subtab-orders"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 font-mono text-xs sm:text-sm font-black uppercase border-2 flex items-center gap-2 cursor-pointer transition-none ${
            activeTab === 'orders'
              ? 'bg-black text-white border-black ring-1 ring-black'
              : 'bg-white text-neutral-800 border-neutral-400 hover:border-black'
          }`}
        >
          <ShoppingBag className={`w-4 h-4 ${activeTab === 'orders' ? 'text-amber-400' : 'text-neutral-600'}`} />
          <span>Tab 2: Live Bills & Orders</span>
          <span className={`px-1.5 py-0.2 text-[10px] ${activeTab === 'orders' ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-black'}`}>
            {orders.length}
          </span>
        </button>

        <button
          id="admin-subtab-company"
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2.5 font-mono text-xs sm:text-sm font-black uppercase border-2 flex items-center gap-2 cursor-pointer transition-none ${
            activeTab === 'company'
              ? 'bg-black text-white border-black ring-1 ring-black'
              : 'bg-white text-neutral-800 border-neutral-400 hover:border-black'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeTab === 'company' ? 'text-amber-400' : 'text-neutral-600'}`} />
          <span>Tab 6: Company & Invoices</span>
          <span className={`px-1.5 py-0.2 text-[10px] font-black ${activeTab === 'company' ? 'bg-amber-400 text-black' : 'bg-neutral-200 text-black'}`}>
            SETUP
          </span>
        </button>

        <button
          id="admin-subtab-salesman"
          onClick={() => setActiveTab('salesman')}
          className={`px-4 py-2.5 font-mono text-xs sm:text-sm font-black uppercase border-2 flex items-center gap-2 cursor-pointer transition-none ${
            activeTab === 'salesman'
              ? 'bg-black text-white border-black ring-1 ring-black'
              : 'bg-white text-neutral-800 border-neutral-400 hover:border-black'
          }`}
        >
          <TrendingUp className={`w-4 h-4 ${activeTab === 'salesman' ? 'text-amber-400' : 'text-neutral-600'}`} />
          <span>Tab 3: Sales Rep Quota</span>
          <span className={`px-1.5 py-0.2 text-[10px] ${activeTab === 'salesman' ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-black'}`}>
            {salesPercentage}%
          </span>
        </button>

        <button
          id="admin-subtab-accounts"
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2.5 font-mono text-xs sm:text-sm font-black uppercase border-2 flex items-center gap-2 cursor-pointer transition-none ${
            activeTab === 'accounts'
              ? 'bg-black text-white border-black ring-1 ring-black'
              : 'bg-white text-neutral-800 border-neutral-400 hover:border-black'
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === 'accounts' ? 'text-amber-400' : 'text-neutral-600'}`} />
          <span>Tab 4: Salesman Accounts</span>
          <span className={`px-1.5 py-0.2 text-[10px] ${activeTab === 'accounts' ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-black'}`}>
            {salesmen.length} Agents
          </span>
        </button>

        <button
          id="admin-subtab-issues"
          onClick={() => setActiveTab('issues')}
          className={`px-4 py-2.5 font-mono text-xs sm:text-sm font-black uppercase border-2 flex items-center gap-2 cursor-pointer transition-none ${
            activeTab === 'issues'
              ? 'bg-black text-white border-black ring-1 ring-black'
              : 'bg-white text-neutral-800 border-neutral-400 hover:border-black'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${activeTab === 'issues' ? 'text-red-400' : 'text-red-600'}`} />
          <span>Tab 5: Field Issues Dashboard</span>
          {openIssuesCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-red-600 text-white font-bold">
              {openIssuesCount} OPEN
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCT & PRICING MASTER                                           */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <div id="admin-panel-products" className="space-y-4">
          {/* Controls Bar: Search & Add Product */}
          <div className="bg-white border-2 border-black p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-500" />
              <input
                id="input-product-search"
                type="text"
                placeholder="Search by SKU or Product Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-black px-2.5 py-1.5 text-xs font-mono bg-neutral-50 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-neutral-600 hidden md:inline">
                Showing {filteredProducts.length} of {products.length} products
              </span>
              <button
                id="btn-open-add-product"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-black hover:bg-neutral-800 text-white border-2 border-black text-xs font-mono font-bold uppercase cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                Add Product
              </button>
            </div>
          </div>

          {/* Dense Data Table */}
          <div className="border-2 border-black bg-white overflow-x-auto">
            <table id="table-products-master" className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-neutral-900 text-white border-b-2 border-black font-bold uppercase">
                  <th className="p-3 border-r border-neutral-700 w-24">SKU</th>
                  <th className="p-3 border-r border-neutral-700 w-20">HSN</th>
                  <th className="p-3 border-r border-neutral-700">Product Name</th>
                  <th className="p-3 border-r border-neutral-700 text-right w-32">Stock (Units)</th>
                  <th className="p-3 border-r border-neutral-700 text-right w-24">MRP (Retail)</th>
                  <th className="p-3 border-r border-neutral-700 text-right w-24">Wholesale</th>
                  <th className="p-3 border-r border-neutral-700 w-56">Offers & Schemes</th>
                  <th className="p-3 border-r border-neutral-700 text-center w-36">Focus SKU</th>
                  <th className="p-3 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {filteredProducts.map((product) => {
                  const isEditing = editingProductId === product.id;
                  const retailerMargin = product.retailPrice - product.wholesalePrice;
                  const marginPct = product.retailPrice > 0 
                    ? Math.round((retailerMargin / product.retailPrice) * 100) 
                    : 0;

                  return (
                    <tr
                      key={product.id}
                      id={`product-row-${product.id}`}
                      className={`hover:bg-neutral-50 transition-none ${
                        isEditing ? 'bg-amber-50/70 ring-2 ring-black' : ''
                      }`}
                    >
                      {/* SKU */}
                      <td className="p-3 border-r border-black font-bold">
                        <span className="bg-neutral-100 border border-neutral-400 px-1.5 py-0.5 text-black">
                          {product.sku}
                        </span>
                      </td>

                      {/* HSN Code */}
                      <td className="p-3 border-r border-black font-mono">
                        {isEditing ? (
                          <input
                            id={`input-edit-hsn-${product.id}`}
                            type="text"
                            value={editForm.hsn}
                            onChange={(e) => setEditForm({ ...editForm, hsn: e.target.value })}
                            className="w-16 border border-black px-1.5 py-1 text-xs bg-white font-mono font-bold"
                          />
                        ) : (
                          <span className="text-neutral-700 font-bold bg-neutral-100 px-1 py-0.5 border border-neutral-300">
                            {product.hsn || '2106'}
                          </span>
                        )}
                      </td>

                      {/* Product Name */}
                      <td className="p-3 border-r border-black font-sans">
                        <div className="font-bold text-sm text-neutral-950">{product.name}</div>
                        {product.focusNote && !isEditing && (
                          <div className="text-[11px] font-mono text-amber-900 mt-0.5">
                            ★ Note: {product.focusNote}
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                          Retailer margin: ₹{retailerMargin} ({marginPct}%)
                        </div>
                      </td>

                      {/* Stock Column */}
                      <td className="p-3 border-r border-black text-right">
                        {isEditing ? (
                          <input
                            id={`input-edit-stock-${product.id}`}
                            type="number"
                            min="0"
                            value={editForm.stock}
                            onChange={(e) =>
                              setEditForm({ ...editForm, stock: parseInt(e.target.value, 10) || 0 })
                            }
                            className="w-20 border border-black px-1.5 py-1 text-right font-mono font-bold bg-white"
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`btn-inline-dec-${product.id}`}
                              onClick={() => handleInlineStockStep(product.id, product.stock, -10)}
                              className="w-5 h-5 border border-neutral-400 bg-white hover:bg-neutral-200 text-[10px] flex items-center justify-center font-bold"
                              title="Decrease 10"
                            >
                              -
                            </button>
                            <span className={`font-black text-sm ${product.stock < 50 ? 'text-amber-800' : 'text-black'}`}>
                              {product.stock}
                            </span>
                            <button
                              id={`btn-inline-inc-${product.id}`}
                              onClick={() => handleInlineStockStep(product.id, product.stock, 10)}
                              className="w-5 h-5 border border-neutral-400 bg-white hover:bg-neutral-200 text-[10px] flex items-center justify-center font-bold"
                              title="Increase 10"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Retail Price (MRP) */}
                      <td className="p-3 border-r border-black text-right">
                        {isEditing ? (
                          <input
                            id={`input-edit-retail-${product.id}`}
                            type="number"
                            min="0"
                            value={editForm.retailPrice}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                retailPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 border border-black px-1.5 py-1 text-right font-mono font-bold bg-white"
                          />
                        ) : (
                          <span className="font-bold text-neutral-900">₹{product.retailPrice}</span>
                        )}
                      </td>

                      {/* Wholesale Price */}
                      <td className="p-3 border-r border-black text-right">
                        {isEditing ? (
                          <input
                            id={`input-edit-wholesale-${product.id}`}
                            type="number"
                            min="0"
                            value={editForm.wholesalePrice}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                wholesalePrice: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 border border-black px-1.5 py-1 text-right font-mono font-bold bg-white"
                          />
                        ) : (
                          <span className="font-black text-emerald-800">₹{product.wholesalePrice}</span>
                        )}
                      </td>

                      {/* Offers & Schemes Column */}
                      <td className="p-3 border-r border-black font-mono text-xs">
                        {isEditing ? (
                          <div className="space-y-1.5 text-left">
                            <div>
                              <span className="text-[10px] text-amber-900 font-bold block uppercase">Wholesale Scheme (B2B):</span>
                              <input
                                id={`input-edit-scheme-${product.id}`}
                                type="text"
                                placeholder="e.g. Buy 10 Cases Get 1 Free"
                                value={editForm.wholesaleScheme}
                                onChange={(e) => setEditForm({ ...editForm, wholesaleScheme: e.target.value })}
                                className="w-full border border-black px-1.5 py-1 text-[11px] bg-white font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-emerald-900 font-bold block uppercase">Retail Offer (D2C):</span>
                              <input
                                id={`input-edit-retailoffer-${product.id}`}
                                type="text"
                                placeholder="e.g. Flat 10% Off"
                                value={editForm.retailOffer}
                                onChange={(e) => setEditForm({ ...editForm, retailOffer: e.target.value })}
                                className="w-full border border-black px-1.5 py-1 text-[11px] bg-white font-mono"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {product.wholesaleScheme ? (
                              <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                                🎁 W/S: {product.wholesaleScheme}
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-400 block">No wholesale scheme</span>
                            )}
                            {product.retailOffer ? (
                              <span className="inline-block bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                                🏷️ Ret: {product.retailOffer}
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-400 block">Standard MRP</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Focus Product Flag */}
                      <td className="p-3 border-r border-black text-center">
                        {isEditing ? (
                          <div className="space-y-1.5 text-left">
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                              <input
                                id={`checkbox-edit-focus-${product.id}`}
                                type="checkbox"
                                checked={editForm.isFocusProduct}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, isFocusProduct: e.target.checked })
                                }
                                className="w-4 h-4 border border-black accent-black"
                              />
                              <span className="text-[11px] uppercase">Focus SKU</span>
                            </label>
                            {editForm.isFocusProduct && (
                              <input
                                id={`input-edit-focusnote-${product.id}`}
                                type="text"
                                placeholder="Directive note for field reps..."
                                value={editForm.focusNote}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, focusNote: e.target.value })
                                }
                                className="w-full border border-black p-1 text-[11px] bg-white font-mono"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              id={`btn-toggle-focus-table-${product.id}`}
                              onClick={() => toggleFocusProduct(product.id)}
                              className={`px-2 py-0.5 border text-[11px] font-bold uppercase cursor-pointer flex items-center gap-1 ${
                                product.isFocusProduct
                                  ? 'bg-amber-400 text-black border-black ring-1 ring-black'
                                  : 'bg-neutral-100 text-neutral-600 border-neutral-300 hover:border-black'
                              }`}
                              title="Click to toggle focus flag"
                            >
                              <Star className={`w-3 h-3 ${product.isFocusProduct ? 'fill-black' : ''}`} />
                              <span>{product.isFocusProduct ? 'ACTIVE FOCUS' : 'STANDARD'}</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              id={`btn-save-edit-${product.id}`}
                              onClick={() => handleSaveEdit(product.id)}
                              className="px-2 py-1 bg-black text-white hover:bg-neutral-800 border border-black text-[11px] font-bold uppercase cursor-pointer flex items-center gap-1"
                              title="Save changes"
                            >
                              <Check className="w-3 h-3 text-emerald-400" /> Save
                            </button>
                            <button
                              id={`btn-cancel-edit-${product.id}`}
                              onClick={() => setEditingProductId(null)}
                              className="px-2 py-1 bg-white hover:bg-neutral-200 border border-black text-[11px] font-bold uppercase cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`btn-edit-product-${product.id}`}
                            onClick={() => handleStartEdit(product)}
                            className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 border border-black text-[11px] font-bold uppercase cursor-pointer flex items-center justify-center gap-1 mx-auto"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Notice for Wholesale/MRP Rule */}
          <div className="bg-neutral-100 border border-black p-2.5 text-xs font-mono text-neutral-700 flex items-center justify-between">
            <span>
              💡 <strong>Pricing Master Principle:</strong> Wholesale Price is charged to retailers; MRP is printed consumer retail price. Focus SKUs trigger higher rep commissions.
            </span>
            <span className="text-black font-bold">Total SKUs: {products.length}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ORDERS & BILLING DISPATCH (WHOLESALE & RETAIL)                     */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div id="admin-panel-orders" className="space-y-4">
          <div className="bg-white border-2 border-black p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-black uppercase text-base text-neutral-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-black" />
                Live Order Ledger ({orders.length} Total Orders)
              </h3>
              <p className="text-xs font-mono text-neutral-600">
                Cross-role orders placed by field sales reps (Wholesale) and walk-in shoppers (Retail).
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-neutral-500 uppercase font-bold text-[11px] mr-1">Filter:</span>
              <button
                id="filter-orders-all"
                onClick={() => setOrderFilter('ALL')}
                className={`px-2.5 py-1 uppercase font-bold border ${
                  orderFilter === 'ALL'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-neutral-300 hover:border-black'
                }`}
              >
                All ({orders.length})
              </button>
              <button
                id="filter-orders-wholesale"
                onClick={() => setOrderFilter('wholesale')}
                className={`px-2.5 py-1 uppercase font-bold border ${
                  orderFilter === 'wholesale'
                    ? 'bg-blue-700 text-white border-blue-800'
                    : 'bg-white text-blue-800 border-neutral-300 hover:border-blue-700'
                }`}
              >
                Wholesale ({orders.filter((o) => o.orderType === 'wholesale').length})
              </button>
              <button
                id="filter-orders-retail"
                onClick={() => setOrderFilter('retail')}
                className={`px-2.5 py-1 uppercase font-bold border ${
                  orderFilter === 'retail'
                    ? 'bg-emerald-700 text-white border-emerald-800'
                    : 'bg-white text-emerald-800 border-neutral-300 hover:border-emerald-700'
                }`}
              >
                Retail ({orders.filter((o) => o.orderType === 'retail').length})
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="border-2 border-black bg-white overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-black text-white border-b-2 border-black uppercase text-[11px] select-none">
                  <th className="p-3 border-r border-neutral-700 w-36">Invoice # & Date</th>
                  <th className="p-3 border-r border-neutral-700 w-28">Type</th>
                  <th className="p-3 border-r border-neutral-700">Customer / Store</th>
                  <th className="p-3 border-r border-neutral-700 w-36">Sales Rep</th>
                  <th className="p-3 border-r border-neutral-700">Items Ordered</th>
                  <th className="p-3 border-r border-neutral-700 text-right w-28">Total (₹)</th>
                  <th className="p-3 border-r border-neutral-700 text-center w-28">Status</th>
                  <th className="p-3 text-center w-48">Invoicing & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-neutral-500 font-mono text-xs">
                      No orders placed yet. Switch to <strong>Salesman Portal</strong> or <strong>Local Retail Store</strong> tab to place an order, and watch stock deduct instantly in real-time.
                    </td>
                  </tr>
                ) : (
                  orders
                    .filter((o) => (orderFilter === 'ALL' ? true : o.orderType === orderFilter))
                    .map((order) => {
                      const isWholesale = order.orderType === 'wholesale';
                      return (
                        <tr key={order.id} id={`admin-order-row-${order.id}`} className="hover:bg-neutral-50">
                          {/* Invoice Number & Timestamp */}
                          <td className="p-3 border-r border-black">
                            <span className="font-black text-black block tracking-tight">
                              {order.invoiceNumber || order.id}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-normal">
                              {order.createdAt}
                            </span>
                          </td>

                          {/* Order Type Badge */}
                          <td className="p-3 border-r border-black">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black uppercase border block text-center ${
                                isWholesale
                                  ? 'bg-blue-100 text-blue-900 border-blue-400'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-400'
                              }`}
                            >
                              {isWholesale ? 'WHOLESALE B2B' : 'RETAIL D2C'}
                            </span>
                          </td>

                          {/* Customer / Retailer Store */}
                          <td className="p-3 border-r border-black">
                            <span className="font-bold text-black block text-sm">{order.storeName}</span>
                            {isWholesale && order.retailerGstin && (
                              <span className="text-[10px] text-blue-800 font-mono block">
                                GSTIN: {order.retailerGstin}
                              </span>
                            )}
                            {order.customerName && (
                              <span className="text-[11px] text-neutral-600 block">
                                Contact: {order.customerName} ({order.customerMobile || 'No Mobile'})
                              </span>
                            )}
                            {order.deliveryAddress && (
                              <span className="text-[10px] text-neutral-500 block truncate max-w-xs" title={order.deliveryAddress}>
                                📍 {order.deliveryAddress}
                              </span>
                            )}
                          </td>

                          {/* Sales Rep */}
                          <td className="p-3 border-r border-black">
                            {isWholesale ? (
                              <div>
                                <span className="font-bold text-neutral-900 block">
                                  {order.salesmanName || 'Assigned Rep'}
                                </span>
                                <span className="text-[10px] text-neutral-500 uppercase">Field Booking</span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-neutral-700 font-medium block">Direct Retail</span>
                                <span className="text-[10px] text-neutral-500 uppercase">Kirana Walk-in</span>
                              </div>
                            )}
                          </td>

                          {/* Items Ordered with Dual-Tier Offer Details */}
                          <td className="p-3 border-r border-black">
                            <div className="space-y-1">
                              {order.items.map((it, idx) => (
                                <div key={idx} className="text-[11px] border-b border-dashed border-neutral-200 pb-0.5 last:border-0">
                                  <div className="flex justify-between gap-2">
                                    <span className="font-medium text-neutral-900">
                                      {it.productName} <span className="text-neutral-500">× {it.quantity}</span>
                                    </span>
                                    <span className="text-neutral-700 font-bold">
                                      ₹{it.total.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  {it.wholesaleScheme && isWholesale && (
                                    <span className="text-[9px] bg-amber-100 text-amber-900 px-1 py-0.2 font-mono font-bold block w-fit mt-0.5">
                                      🎁 Scheme: {it.wholesaleScheme}
                                    </span>
                                  )}
                                  {it.retailOffer && !isWholesale && (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-900 px-1 py-0.2 font-mono font-bold block w-fit mt-0.5">
                                      🏷️ Offer: {it.retailOffer}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Total Value */}
                          <td className="p-3 border-r border-black text-right font-black text-sm text-black">
                            ₹{order.totalAmount.toLocaleString('en-IN')}
                          </td>

                          {/* Status & Payment */}
                          <td className="p-3 border-r border-black text-center space-y-1">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black uppercase border block ${
                                order.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-900 border-amber-400'
                                  : order.status === 'DISPATCHED'
                                  ? 'bg-blue-100 text-blue-900 border-blue-400'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-400'
                              }`}
                            >
                              {order.status}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 text-[9px] font-mono uppercase border block ${
                                order.paymentStatus === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-red-50 text-red-800 border-red-300'
                              }`}
                            >
                              {order.paymentStatus || 'UNPAID'}
                            </span>
                          </td>

                          {/* Invoicing & Dispatch Actions */}
                          <td className="p-3 text-center space-y-1.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                id={`btn-view-invoice-${order.id}`}
                                onClick={() => {
                                  setSelectedInvoiceOrder(order);
                                  setAutoPrintInvoice(false);
                                }}
                                className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-black border border-black text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Open Bill & PDF Preview"
                              >
                                <Eye className="w-3 h-3 text-blue-700" />
                                <span>View Bill</span>
                              </button>

                              <button
                                id={`btn-print-invoice-${order.id}`}
                                onClick={() => {
                                  setSelectedInvoiceOrder(order);
                                  setAutoPrintInvoice(true);
                                }}
                                className="px-2 py-1 bg-black text-white hover:bg-neutral-800 border border-black text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Direct Print / Save PDF"
                              >
                                <Printer className="w-3 h-3 text-amber-400" />
                                <span>PDF</span>
                              </button>
                            </div>

                            {/* Dispatch status trigger */}
                            <div>
                              {order.status === 'PENDING' ? (
                                <button
                                  id={`btn-dispatch-${order.id}`}
                                  onClick={() => updateOrderStatus(order.id, 'DISPATCHED')}
                                  className="w-full px-2 py-0.5 bg-neutral-900 text-white hover:bg-neutral-800 text-[10px] font-bold uppercase border border-black cursor-pointer"
                                >
                                  Dispatch
                                </button>
                              ) : order.status === 'DISPATCHED' ? (
                                <button
                                  id={`btn-delivered-${order.id}`}
                                  onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                  className="w-full px-2 py-0.5 bg-emerald-700 text-white hover:bg-emerald-800 text-[10px] font-bold uppercase border border-black cursor-pointer"
                                >
                                  Mark Delivered
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-bold uppercase block">
                                  ✓ Completed
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SALES REP TARGET & PERFORMANCE                                     */}
      {/* ========================================================================= */}
      {activeTab === 'salesman' && (
        <div id="admin-panel-salesman" className="space-y-5">
          {/* Salesman Selector Bar (If multiple salesmen exist) */}
          <div className="bg-white border-2 border-black p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-black" />
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold block">Target Allocation Selector</span>
                <span className="font-mono text-xs font-black uppercase text-neutral-900">Select Sales Representative to Manage</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="select-quota-salesman" className="text-xs font-mono font-bold text-neutral-700">Representative:</label>
              <select
                id="select-quota-salesman"
                value={selectedSalesmanId}
                onChange={(e) => handleSelectSalesmanForQuota(e.target.value)}
                className="border-2 border-black p-1.5 font-mono text-xs font-black bg-neutral-50 uppercase focus:bg-white cursor-pointer"
              >
                {salesmen.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name} (@{rep.username}) — ID: {rep.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Rep Management Card */}
          <div className="border-2 border-black bg-white p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-4">
              <div>
                <span className="text-[11px] font-mono text-neutral-500 uppercase block">
                  Assigned Field Representative
                </span>
                <h3 className="text-2xl font-black uppercase text-neutral-950 flex items-center gap-2">
                  {activeManagedSalesman.name}
                  <span className="text-xs font-mono bg-emerald-100 text-emerald-900 border border-emerald-400 px-2 py-0.5">
                    ID: {activeManagedSalesman.id} • @{activeManagedSalesman.username}
                  </span>
                </h3>
              </div>

              <div className="text-xs font-mono text-neutral-700 bg-neutral-50 border border-neutral-300 p-2">
                <div>Account Role: <strong className="text-black uppercase">Field Salesman</strong></div>
                <div>System Status: <strong className="text-emerald-700">ACTIVE & AUTHORIZED</strong></div>
              </div>
            </div>

            {/* Performance Gauges / High-Contrast Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sales Performance Card */}
              <div className="border-2 border-black p-4 bg-neutral-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-black" />
                    Gross Sales Revenue Target
                  </span>
                  <span className="font-mono text-xs font-black bg-black text-white px-2 py-0.5">
                    {salesPercentage}% ACHIEVED
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block">Achieved Booked</span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-black">
                      ₹{activeManagedSalesman.achievedSales.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block">Monthly Quota</span>
                    <span className="text-lg font-black font-mono text-neutral-700">
                      ₹{activeManagedSalesman.targetSales.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* High Contrast Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-neutral-200 border-2 border-black h-5 p-0.5">
                    <div
                      className="bg-black h-full transition-none"
                      style={{ width: `${Math.min(100, salesPercentage)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-neutral-600">
                    <span>Current Run-Rate: {salesPercentage}% of quota</span>
                    <span>
                      Gap to Target: ₹{Math.max(0, activeManagedSalesman.targetSales - activeManagedSalesman.achievedSales).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash Collection Performance Card */}
              <div className="border-2 border-black p-4 bg-neutral-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-700" />
                    Cash & Cheque Recovery Target
                  </span>
                  <span className="font-mono text-xs font-black bg-emerald-700 text-white px-2 py-0.5">
                    {collectionPercentage}% RECOVERED
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block">Actual Collected</span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-800">
                      ₹{activeManagedSalesman.achievedCollection.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block">Recovery Target</span>
                    <span className="text-lg font-black font-mono text-neutral-700">
                      ₹{activeManagedSalesman.targetCollection.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* High Contrast Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-neutral-200 border-2 border-black h-5 p-0.5">
                    <div
                      className="bg-emerald-600 h-full transition-none"
                      style={{ width: `${Math.min(100, collectionPercentage)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-neutral-600">
                    <span>Current Recovery: {collectionPercentage}%</span>
                    <span>
                      Uncollected Balance: ₹{Math.max(0, activeManagedSalesman.targetCollection - activeManagedSalesman.achievedCollection).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Edit Form */}
            <div className="border-2 border-black bg-white p-4 space-y-3">
              <div className="border-b border-black pb-2">
                <h4 className="font-black uppercase text-sm text-neutral-900">
                  Update Monthly Quota & Targets for {activeManagedSalesman.name}
                </h4>
                <p className="text-xs font-mono text-neutral-600">
                  Modify target figures for this specific agent. Changes update in real-time across that salesman's isolated view.
                </p>
              </div>

              <form onSubmit={handleSaveTargets} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label htmlFor="input-target-sales" className="text-xs font-mono uppercase font-bold text-neutral-700 block mb-1">
                    Monthly Sales Target (₹):
                  </label>
                  <input
                    id="input-target-sales"
                    type="number"
                    min="1000"
                    step="5000"
                    value={targetSalesInput}
                    onChange={(e) => setTargetSalesInput(parseInt(e.target.value, 10) || 0)}
                    className="w-full border-2 border-black p-2 font-mono text-sm font-black bg-neutral-50 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="input-target-collection" className="text-xs font-mono uppercase font-bold text-neutral-700 block mb-1">
                    Cash Collection Target (₹):
                  </label>
                  <input
                    id="input-target-collection"
                    type="number"
                    min="1000"
                    step="5000"
                    value={targetCollectionInput}
                    onChange={(e) => setTargetCollectionInput(parseInt(e.target.value, 10) || 0)}
                    className="w-full border-2 border-black p-2 font-mono text-sm font-black bg-neutral-50 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <button
                    id="btn-save-targets"
                    type="submit"
                    className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase border-2 border-black cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-emerald-400" /> Save Quotas
                  </button>
                </div>
              </form>

              {targetSaveMsg && (
                <div className="p-2 bg-emerald-100 border border-emerald-500 text-emerald-950 font-mono text-xs font-bold">
                  ✓ {targetSaveMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SALESMAN ACCOUNTS & PROVISIONING                                    */}
      {/* ========================================================================= */}
      {activeTab === 'accounts' && (
        <div id="admin-panel-accounts" className="space-y-4">
          {/* Header Bar with Add Salesman Button */}
          <div className="bg-white border-2 border-black p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black uppercase text-sm sm:text-base text-neutral-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-black" />
                Sales Force Roster & Credentials
              </h3>
              <p className="text-xs font-mono text-neutral-600">
                Register new field agents, manage credentials, and assign monthly quotas.
              </p>
            </div>

            <button
              id="btn-open-create-salesman-modal"
              onClick={() => {
                setCreateSalesmanError('');
                setShowCreateSalesmanModal(true);
              }}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase border-2 border-black cursor-pointer flex items-center gap-2 self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" /> Add New Salesman
            </button>
          </div>

          {createSalesmanSuccess && (
            <div className="p-3 bg-emerald-100 border-2 border-emerald-500 text-emerald-950 font-mono text-xs font-bold">
              {createSalesmanSuccess}
            </div>
          )}

          {/* Salesmen Accounts Table */}
          <div className="bg-white border-2 border-black overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-neutral-100 border-b-2 border-black text-black">
                  <th className="p-3 border-r border-black font-black uppercase">ID / Code</th>
                  <th className="p-3 border-r border-black font-black uppercase">Salesman Name</th>
                  <th className="p-3 border-r border-black font-black uppercase">Login ID (Username)</th>
                  <th className="p-3 border-r border-black font-black uppercase">Password</th>
                  <th className="p-3 border-r border-black font-black uppercase text-right">Sales Quota</th>
                  <th className="p-3 border-r border-black font-black uppercase text-right">Recovery Target</th>
                  <th className="p-3 border-r border-black font-black uppercase text-center">Achieved Sales</th>
                  <th className="p-3 font-black uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {salesmen.map((rep) => {
                  const repSalesPct = rep.targetSales > 0 ? Math.round((rep.achievedSales / rep.targetSales) * 100) : 0;
                  return (
                    <tr key={rep.id} className="hover:bg-neutral-50 transition-none">
                      <td className="p-3 border-r border-black font-bold text-black">
                        {rep.id}
                      </td>
                      <td className="p-3 border-r border-black font-black text-sm text-neutral-900">
                        {rep.name}
                      </td>
                      <td className="p-3 border-r border-black">
                        <span className="bg-neutral-100 border border-neutral-300 px-2 py-0.5 font-bold text-black">
                          @{rep.username}
                        </span>
                      </td>
                      <td className="p-3 border-r border-black">
                        <span className="font-mono text-neutral-700 bg-neutral-50 border border-neutral-300 px-1.5 py-0.5">
                          {rep.password || '123'}
                        </span>
                      </td>
                      <td className="p-3 border-r border-black text-right font-bold text-neutral-900">
                        ₹{rep.targetSales.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 border-r border-black text-right font-bold text-emerald-800">
                        ₹{rep.targetCollection.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 border-r border-black text-center">
                        <div className="font-bold text-black">
                          ₹{rep.achievedSales.toLocaleString('en-IN')}
                        </div>
                        <span className={`text-[10px] font-bold ${repSalesPct >= 100 ? 'text-emerald-700' : 'text-neutral-600'}`}>
                          ({repSalesPct}%)
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            handleSelectSalesmanForQuota(rep.id);
                            setActiveTab('salesman');
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-black hover:text-white text-black font-bold uppercase border border-black cursor-pointer text-[10px] flex items-center justify-center gap-1 mx-auto"
                        >
                          <TrendingUp className="w-3 h-3" /> Adjust Quotas
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Info Box on Security and Role Isolation */}
          <div className="border border-neutral-300 bg-neutral-50 p-3 text-xs font-mono text-neutral-600 space-y-1">
            <span className="font-bold text-black flex items-center gap-1.5 uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Role Isolation Active
            </span>
            <p>
              Each registered salesman only accesses their own orders, personal quotas, and daily bookings upon logging in. Margin indicators and depot settings remain strictly restricted to the Super Stockist Admin account.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FIELD ISSUES DASHBOARD                                             */}
      {/* ========================================================================= */}
      {activeTab === 'issues' && (
        <div id="admin-panel-issues" className="space-y-4">
          {/* Header & Filter Controls */}
          <div className="bg-white border-2 border-black p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black uppercase text-sm sm:text-base text-neutral-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Field Tickets & Retailer Disputes ({issues.length})
              </h3>
              <p className="text-xs font-mono text-neutral-600">
                Tickets escalated by field salesmen requiring distributor intervention or credit adjustment.
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase font-bold text-neutral-700">Category:</span>
              <select
                id="select-issue-category-filter"
                value={issueCategoryFilter}
                onChange={(e) => setIssueCategoryFilter(e.target.value)}
                className="border-2 border-black px-2 py-1 font-mono text-xs bg-white"
              >
                <option value="ALL">All Categories</option>
                <option value="Payment Dispute">Payment Dispute</option>
                <option value="Damaged Goods">Damaged Goods</option>
                <option value="Shop Closed">Shop Closed</option>
                <option value="Stock Shortage">Stock Shortage</option>
                <option value="Competitor Rate War">Competitor Rate War</option>
              </select>
            </div>
          </div>

          {/* Table of Field Tickets */}
          <div className="border-2 border-black bg-white overflow-x-auto">
            <table id="table-field-issues" className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-neutral-900 text-white border-b-2 border-black font-bold uppercase">
                  <th className="p-3 border-r border-neutral-700 w-36">Date / Time</th>
                  <th className="p-3 border-r border-neutral-700 w-36">Salesman</th>
                  <th className="p-3 border-r border-neutral-700 w-48">Shop Name</th>
                  <th className="p-3 border-r border-neutral-700 w-36">Category</th>
                  <th className="p-3 border-r border-neutral-700">Description</th>
                  <th className="p-3 border-r border-neutral-700 text-center w-28">Status</th>
                  <th className="p-3 text-center w-36">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-500 font-mono">
                      No issues found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((issue) => {
                    const isOpen = issue.status === 'OPEN';

                    return (
                      <tr
                        key={issue.id}
                        id={`issue-row-${issue.id}`}
                        className={`hover:bg-neutral-50 transition-none ${
                          isOpen ? 'bg-red-50/40' : ''
                        }`}
                      >
                        {/* Date / Time */}
                        <td className="p-3 border-r border-black font-mono text-neutral-600">
                          {issue.timestamp}
                        </td>

                        {/* Salesman */}
                        <td className="p-3 border-r border-black font-bold text-neutral-900">
                          {issue.salesmanName}
                        </td>

                        {/* Shop Name */}
                        <td className="p-3 border-r border-black font-black text-black font-sans">
                          {issue.shopName}
                        </td>

                        {/* Category */}
                        <td className="p-3 border-r border-black">
                          <span className="border border-neutral-400 bg-neutral-100 px-1.5 py-0.5 text-[11px] font-bold text-neutral-800">
                            {issue.category}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="p-3 border-r border-black font-sans text-neutral-800">
                          {issue.description}
                        </td>

                        {/* Status Badge */}
                        <td className="p-3 border-r border-black text-center">
                          <span
                            id={`badge-issue-status-${issue.id}`}
                            className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                              issue.status === 'OPEN'
                                ? 'bg-red-600 text-white border-red-700'
                                : issue.status === 'UNDER_REVIEW'
                                ? 'bg-amber-400 text-black border-black'
                                : 'bg-emerald-600 text-white border-emerald-700'
                            }`}
                          >
                            {issue.status}
                          </span>
                        </td>

                        {/* Toggle Status Button */}
                        <td className="p-3 text-center">
                          <button
                            id={`btn-toggle-issue-status-${issue.id}`}
                            onClick={() =>
                              updateIssueStatus(
                                issue.id,
                                isOpen ? 'RESOLVED' : 'OPEN'
                              )
                            }
                            className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase border border-black cursor-pointer transition-none ${
                              isOpen
                                ? 'bg-black text-white hover:bg-neutral-800'
                                : 'bg-white text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            {isOpen ? 'Mark Resolved' : 'Re-open Ticket'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: COMPANY PROFILE & INVOICING SETUP (BRANDING & SETTLEMENT)          */}
      {/* ========================================================================= */}
      {activeTab === 'company' && (
        <div id="admin-panel-company" className="space-y-5">
          {/* Header Card */}
          <div className="bg-white border-2 border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-block bg-black text-white px-2 py-0.5 text-xs font-mono font-bold uppercase mb-1">
                Settlement & Branding Engine
              </div>
              <h3 className="font-black uppercase text-lg text-neutral-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-black" />
                Company Profile & PDF Invoice Setup
              </h3>
              <p className="text-xs font-mono text-neutral-600 mt-0.5">
                Customize your corporate identity, GST credentials, settlement bank details, and invoice terms.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-preview-demo-invoice"
                onClick={() => {
                  setSelectedInvoiceOrder(orders[0] || null);
                  setAutoPrintInvoice(false);
                }}
                className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-black border-2 border-black text-xs font-mono font-bold uppercase cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4 text-blue-700" />
                <span>Preview Sample Invoice</span>
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {companySaveSuccess && (
            <div id="banner-company-saved" className="p-3 bg-emerald-100 border-2 border-emerald-600 text-emerald-900 font-mono text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700" />
              <span>✓ Company profile & branding updated successfully! All invoices will reflect these changes immediately.</span>
            </div>
          )}

          <form onSubmit={handleSaveCompanyProfile} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 font-mono text-xs">
              
              {/* SECTION A: LOGO & BUSINESS IDENTITY */}
              <div className="bg-white border-2 border-black p-4 space-y-4">
                <div className="border-b-2 border-black pb-2 flex items-center justify-between">
                  <h4 className="font-black uppercase text-sm text-neutral-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-black" />
                    1. Company Logo & Branding
                  </h4>
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">In-Memory / LocalStorage</span>
                </div>

                {/* Logo Uploader / Preview */}
                <div className="border-2 border-dashed border-neutral-400 p-4 bg-neutral-50 flex flex-col items-center justify-center text-center space-y-3">
                  {companyForm.logoUrl ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <div className="w-32 h-20 border border-black bg-white p-1 flex items-center justify-center shadow-sm">
                        <img
                          src={companyForm.logoUrl}
                          alt="Company Logo"
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="text-[11px] text-neutral-600">
                        Custom Base64 Logo Active
                      </div>
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="input-logo-file-change"
                          className="px-2.5 py-1 bg-neutral-900 text-white hover:bg-neutral-800 text-[10px] font-bold uppercase cursor-pointer border border-black"
                        >
                          Change Logo
                        </label>
                        <input
                          id="input-logo-file-change"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          id="btn-remove-logo"
                          onClick={handleRemoveLogo}
                          className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-700 hover:text-red-900 text-[10px] font-bold uppercase cursor-pointer border border-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-neutral-200 border border-neutral-400 rounded-full flex items-center justify-center mx-auto text-neutral-500">
                        <Upload className="w-5 h-5 text-neutral-700" />
                      </div>
                      <div>
                        <span className="font-bold text-neutral-900 block text-xs">Upload Company Logo</span>
                        <span className="text-[10px] text-neutral-500 block">PNG, JPG, or SVG (Max 2MB)</span>
                      </div>
                      <label
                        htmlFor="input-logo-file-upload"
                        className="inline-block px-3 py-1.5 bg-black text-white hover:bg-neutral-800 text-xs font-bold uppercase cursor-pointer border border-black"
                      >
                        Select Image File
                      </label>
                      <input
                        id="input-logo-file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Business Details Fields */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block font-bold text-neutral-800 uppercase mb-1">
                      Registered Company Name:
                    </label>
                    <input
                      id="input-company-name"
                      type="text"
                      value={companyForm.companyName}
                      onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                      className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-bold text-sm"
                      placeholder="e.g. Apex Consumer FMCG Super Stockist Pvt Ltd"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-800 uppercase mb-1">
                      Business Depot / Warehouse Address:
                    </label>
                    <textarea
                      id="input-company-address"
                      rows={2}
                      value={companyForm.businessAddress}
                      onChange={(e) => setCompanyForm({ ...companyForm, businessAddress: e.target.value })}
                      className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-mono text-xs"
                      placeholder="e.g. Plot No. 42-B, Industrial Area Phase II, Okhla, New Delhi - 110020"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-neutral-800 uppercase mb-1">
                        Contact Phone Number:
                      </label>
                      <input
                        id="input-company-contact"
                        type="text"
                        value={companyForm.contactNumber}
                        onChange={(e) => setCompanyForm({ ...companyForm, contactNumber: e.target.value })}
                        className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-mono"
                        placeholder="e.g. +91 98110 54321"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-800 uppercase mb-1">
                        Official Billing Email:
                      </label>
                      <input
                        id="input-company-email"
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                        className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-mono"
                        placeholder="billing@apexstockist.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-800 uppercase mb-1">
                      Master GSTIN / UIN:
                    </label>
                    <input
                      id="input-company-gstin"
                      type="text"
                      value={companyForm.gstin}
                      onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value.toUpperCase() })}
                      className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-mono font-bold tracking-wider uppercase text-sm"
                      placeholder="07AAAAA0000A1Z5"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: BANKING, UPI & INVOICING TERMS */}
              <div className="space-y-4">
                
                {/* Bank & Settlement Box */}
                <div className="bg-white border-2 border-black p-4 space-y-3 font-mono text-xs">
                  <div className="border-b-2 border-black pb-2 flex items-center justify-between">
                    <h4 className="font-black uppercase text-sm text-neutral-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-black" />
                      2. Settlement & Payment Info on Bill
                    </h4>
                    <span className="text-[10px] text-neutral-500 uppercase font-bold">Direct NEFT / UPI</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-neutral-800 uppercase mb-1">
                        Bank Name:
                      </label>
                      <input
                        id="input-company-bankname"
                        type="text"
                        value={companyForm.bankName}
                        onChange={(e) => setCompanyForm({ ...companyForm, bankName: e.target.value })}
                        className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-bold"
                        placeholder="State Bank of India"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-800 uppercase mb-1">
                        Account Number:
                      </label>
                      <input
                        id="input-company-accountno"
                        type="text"
                        value={companyForm.accountNumber}
                        onChange={(e) => setCompanyForm({ ...companyForm, accountNumber: e.target.value })}
                        className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-mono font-bold"
                        placeholder="38920194857"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-neutral-800 uppercase mb-1">
                        Bank IFSC Code:
                      </label>
                      <input
                        id="input-company-ifsc"
                        type="text"
                        value={companyForm.ifscCode}
                        onChange={(e) => setCompanyForm({ ...companyForm, ifscCode: e.target.value.toUpperCase() })}
                        className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-mono uppercase font-bold"
                        placeholder="SBIN0004231"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-800 uppercase mb-1">
                        UPI ID / VPA:
                      </label>
                      <input
                        id="input-company-upiid"
                        type="text"
                        value={companyForm.upiId}
                        onChange={(e) => setCompanyForm({ ...companyForm, upiId: e.target.value.toLowerCase() })}
                        className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-mono lowercase"
                        placeholder="apexstockist@sbi"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-800 uppercase mb-1">
                      UPI QR Note / Instructions:
                    </label>
                    <input
                      id="input-company-upinote"
                      type="text"
                      value={companyForm.upiNote}
                      onChange={(e) => setCompanyForm({ ...companyForm, upiNote: e.target.value })}
                      className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white text-xs"
                      placeholder="Scan with PhonePe / GPay / Paytm for instant clearance"
                    />
                  </div>
                </div>

                {/* Terms and Conditions Box */}
                <div className="bg-white border-2 border-black p-4 space-y-3 font-mono text-xs">
                  <div className="border-b-2 border-black pb-2 flex items-center justify-between">
                    <h4 className="font-black uppercase text-sm text-neutral-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-black" />
                      3. Terms & Conditions & Signatory
                    </h4>
                    <span className="text-[10px] text-neutral-500 uppercase font-bold">Printed on Footer</span>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-800 uppercase mb-1">
                      Invoice Terms & Conditions (One clause per line):
                    </label>
                    <textarea
                      id="input-company-terms"
                      rows={3}
                      value={companyForm.termsAndConditions}
                      onChange={(e) => setCompanyForm({ ...companyForm, termsAndConditions: e.target.value })}
                      className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-mono text-[11px]"
                      placeholder="1. Goods once sold will not be taken back or exchanged.&#10;2. Interest @ 18% p.a. charged on overdue bills beyond 7 days.&#10;3. Subject to Delhi jurisdiction only."
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-800 uppercase mb-1">
                      Authorized Signatory Designation Title:
                    </label>
                    <input
                      id="input-company-signatory"
                      type="text"
                      value={companyForm.signatoryText}
                      onChange={(e) => setCompanyForm({ ...companyForm, signatoryText: e.target.value })}
                      className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-bold"
                      placeholder="Authorized Signatory / Depot Manager"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="bg-neutral-100 border-2 border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-mono text-neutral-600">
                Changes will take effect instantly for all PDF invoices generated from Admin, Salesman, and Store.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-reset-demo"
                  onClick={() => {
                    if (window.confirm('Reset all demo state to fresh stockist baseline?')) {
                      resetDemoData();
                    }
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-neutral-200 text-neutral-800 border-2 border-neutral-400 font-mono text-xs font-bold uppercase cursor-pointer"
                >
                  Reset Demo Data
                </button>
                <button
                  type="submit"
                  id="btn-save-company-settings"
                  className="px-5 py-2 bg-black hover:bg-neutral-800 text-white border-2 border-black font-mono text-xs font-black uppercase cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  Save Company Profile & Branding
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD PRODUCT MODAL                                                         */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div
          id="modal-add-product"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-none"
        >
          <div className="bg-white border-4 border-black max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-none">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <h3 className="font-black uppercase text-base text-neutral-950 flex items-center gap-2">
                <Plus className="w-5 h-5 text-black" />
                Add New Depot SKU
              </h3>
              <button
                id="btn-close-add-modal"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 border border-black bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-3 font-mono text-xs">
              {addError && (
                <div className="p-2 bg-red-100 border border-red-500 text-red-900 font-bold">
                  ⚠️ {addError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="input-new-sku" className="uppercase font-bold text-neutral-700 block mb-1">
                    SKU Code:
                  </label>
                  <input
                    id="input-new-sku"
                    type="text"
                    placeholder="e.g. BIS-005"
                    value={newProductSku}
                    onChange={(e) => setNewProductSku(e.target.value)}
                    className="w-full border-2 border-black p-2 bg-neutral-50 uppercase font-bold"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="input-new-hsn" className="uppercase font-bold text-neutral-700 block mb-1">
                    HSN Code:
                  </label>
                  <input
                    id="input-new-hsn"
                    type="text"
                    placeholder="e.g. 2106"
                    value={newProductHsn}
                    onChange={(e) => setNewProductHsn(e.target.value)}
                    className="w-full border-2 border-black p-2 bg-neutral-50 font-bold font-mono"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="input-new-stock" className="uppercase font-bold text-neutral-700 block mb-1">
                    Stock (Units):
                  </label>
                  <input
                    id="input-new-stock"
                    type="number"
                    min="0"
                    value={newProductStock}
                    onChange={(e) =>
                      setNewProductStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    className="w-full border-2 border-black p-2 bg-neutral-50 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="input-new-name" className="uppercase font-bold text-neutral-700 block mb-1">
                  Product Name:
                </label>
                <input
                  id="input-new-name"
                  type="text"
                  placeholder="e.g. Marie Biscuits 200g Pack"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full border-2 border-black p-2 bg-neutral-50 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="input-new-retail" className="uppercase font-bold text-neutral-700 block mb-1">
                    Retail Price (MRP ₹):
                  </label>
                  <input
                    id="input-new-retail"
                    type="number"
                    min="0"
                    step="0.5"
                    value={newProductRetail}
                    onChange={(e) =>
                      setNewProductRetail(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full border-2 border-black p-2 bg-neutral-50 font-bold"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="input-new-wholesale" className="uppercase font-bold text-neutral-700 block mb-1">
                    Wholesale Price (₹):
                  </label>
                  <input
                    id="input-new-wholesale"
                    type="number"
                    min="0"
                    step="0.5"
                    value={newProductWholesale}
                    onChange={(e) =>
                      setNewProductWholesale(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full border-2 border-black p-2 bg-neutral-50 font-bold"
                    required
                  />
                </div>
              </div>

              {/* Dual-Tier Offers Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-neutral-300 p-2.5 bg-neutral-50">
                <div>
                  <label htmlFor="input-new-wholesale-scheme" className="uppercase font-bold text-amber-900 block mb-1 text-[11px]">
                    🎁 Wholesale Scheme (B2B Trade Deal):
                  </label>
                  <input
                    id="input-new-wholesale-scheme"
                    type="text"
                    placeholder="e.g. Buy 10 Cases Get 1 Free"
                    value={newProductWholesaleScheme}
                    onChange={(e) => setNewProductWholesaleScheme(e.target.value)}
                    className="w-full border border-black p-1.5 bg-white text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="input-new-retail-offer" className="uppercase font-bold text-emerald-900 block mb-1 text-[11px]">
                    🏷️ Retail Offer (D2C Consumer Deal):
                  </label>
                  <input
                    id="input-new-retail-offer"
                    type="text"
                    placeholder="e.g. Flat 10% Off"
                    value={newProductRetailOffer}
                    onChange={(e) => setNewProductRetailOffer(e.target.value)}
                    className="w-full border border-black p-1.5 bg-white text-xs"
                  />
                </div>
              </div>

              {/* Focus Product Checkbox & Note */}
              <div className="border border-neutral-400 p-2.5 space-y-2 bg-neutral-50">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    id="checkbox-new-focus"
                    type="checkbox"
                    checked={newIsFocus}
                    onChange={(e) => setNewIsFocus(e.target.checked)}
                    className="w-4 h-4 border border-black accent-black"
                  />
                  <span>Mark as Distributor Focus SKU</span>
                </label>

                {newIsFocus && (
                  <input
                    id="input-new-focusnote"
                    type="text"
                    placeholder="e.g. Push 25 units per shop - 3% incentive bonus"
                    value={newFocusNote}
                    onChange={(e) => setNewFocusNote(e.target.value)}
                    className="w-full border border-black p-1.5 bg-white text-xs"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-300">
                <button
                  type="button"
                  id="btn-cancel-add-modal"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-black bg-white hover:bg-neutral-200 font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-new-product"
                  className="px-5 py-2 bg-black hover:bg-neutral-800 text-white font-bold uppercase border-2 border-black cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  Save Product to Depot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / PROVISION NEW SALESMAN ACCOUNT                               */}
      {/* ========================================================================= */}
      {showCreateSalesmanModal && (
        <div
          id="modal-add-salesman-backdrop"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3"
        >
          <div
            id="modal-add-salesman-content"
            className="bg-white border-2 border-black max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase font-bold block">
                  Staff Provisioning
                </span>
                <h3 className="text-lg font-black uppercase text-neutral-900 flex items-center gap-1.5">
                  <UserPlus className="w-5 h-5 text-black" />
                  Register New Field Salesman
                </h3>
              </div>
              <button
                id="btn-close-salesman-modal"
                onClick={() => setShowCreateSalesmanModal(false)}
                className="p-1 hover:bg-neutral-200 cursor-pointer border border-black"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>

            {createSalesmanError && (
              <div className="p-2.5 bg-red-100 border border-red-500 text-red-900 font-mono text-xs font-bold">
                ⚠️ {createSalesmanError}
              </div>
            )}

            <form onSubmit={handleCreateSalesmanSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block font-bold text-neutral-800 uppercase mb-1">
                  Full Name of Salesman:
                </label>
                <input
                  id="input-new-salesman-name"
                  type="text"
                  placeholder="e.g. Amit Verma"
                  value={newSalesmanName}
                  onChange={(e) => setNewSalesmanName(e.target.value)}
                  className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">
                    Login ID (Username):
                  </label>
                  <input
                    id="input-new-salesman-username"
                    type="text"
                    placeholder="e.g. amit"
                    value={newSalesmanUsername}
                    onChange={(e) => setNewSalesmanUsername(e.target.value)}
                    className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-bold lowercase"
                    required
                  />
                  <span className="text-[10px] text-neutral-500 block mt-0.5">Used on login screen</span>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">
                    Password / PIN:
                  </label>
                  <input
                    id="input-new-salesman-password"
                    type="text"
                    placeholder="e.g. 123"
                    value={newSalesmanPassword}
                    onChange={(e) => setNewSalesmanPassword(e.target.value)}
                    className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-bold"
                    required
                  />
                  <span className="text-[10px] text-neutral-500 block mt-0.5">Default demo is 123</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-neutral-200">
                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">
                    Monthly Sales Quota (₹):
                  </label>
                  <input
                    id="input-new-salesman-targetsales"
                    type="number"
                    min="1000"
                    step="5000"
                    value={newSalesmanSalesQuota}
                    onChange={(e) => setNewSalesmanSalesQuota(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 uppercase mb-1">
                    Collection Target (₹):
                  </label>
                  <input
                    id="input-new-salesman-targetcollection"
                    type="number"
                    min="1000"
                    step="5000"
                    value={newSalesmanCollectionQuota}
                    onChange={(e) => setNewSalesmanCollectionQuota(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="w-full border-2 border-black p-2 bg-neutral-50 focus:bg-white font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-300">
                <button
                  type="button"
                  id="btn-cancel-salesman-modal"
                  onClick={() => setShowCreateSalesmanModal(false)}
                  className="px-4 py-2 border border-black bg-white hover:bg-neutral-200 font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-new-salesman"
                  className="px-5 py-2 bg-black hover:bg-neutral-800 text-white font-bold uppercase border-2 border-black cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  Register Salesman
                </button>
              </div>
            </form>
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
