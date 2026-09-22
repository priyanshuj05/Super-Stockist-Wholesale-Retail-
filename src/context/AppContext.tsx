import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Salesman, Order, Issue, RoleRoute, AuthUser, CompanyProfile } from '../types.ts';

const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'Apex FMCG Distributors Pvt. Ltd.',
  businessAddress: 'Plot 42, Industrial Area Phase-II, Okhla, New Delhi - 110020',
  contactNumber: '+91 98765 43210',
  email: 'billing@apexfmcg.com',
  gstin: '07AAAAA0000A1Z5',
  logoUrl: '',
  bankName: 'HDFC Bank Ltd.',
  accountNumber: '50200045892134',
  ifscCode: 'HDFC0001234',
  upiId: 'apexfmcg@hdfcbank',
  upiNote: 'Scan UPI QR code or pay to apexfmcg@hdfcbank',
  termsAndConditions: '1. Goods once sold will not be taken back without written depot authorization.\n2. Interest @ 18% p.a. will be charged on overdue payments beyond 14 days credit.\n3. All trade disputes are strictly subject to local jurisdiction only.',
  signatoryText: 'For Apex FMCG Distributors Pvt. Ltd.\nAuthorized Signatory',
};

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Refined Oil 1L Pouch',
    sku: 'OIL-001',
    hsn: '1515',
    stock: 150,
    retailPrice: 140,
    wholesalePrice: 122,
    isFocusProduct: true,
    focusNote: 'Clear 50 units before Friday - Extra 2% incentive',
    wholesaleScheme: 'Buy 10 Cases Get 1 Case Free',
    retailOffer: '₹15 Instant Discount',
  },
  {
    id: 'p2',
    name: 'Wheat Flour 10kg Bag',
    sku: 'ATA-010',
    hsn: '1101',
    stock: 80,
    retailPrice: 380,
    wholesalePrice: 340,
    isFocusProduct: false,
    focusNote: '',
    wholesaleScheme: '5% Extra Cash Discount on 20+ bags',
    retailOffer: 'Flat 10% Off on 2+ bags',
  },
  {
    id: 'p3',
    name: 'Washing Powder 1kg',
    sku: 'DET-001',
    hsn: '3402',
    stock: 200,
    retailPrice: 95,
    wholesalePrice: 78,
    isFocusProduct: true,
    focusNote: 'Push to new grocery stores',
    wholesaleScheme: 'Buy 24 Units Get 2 Units Free + Display Bonus',
    retailOffer: 'Special Buy 2 Get 1 Free Promo',
  },
];

const INITIAL_SALESMEN: Salesman[] = [
  {
    id: 's1',
    name: 'Rahul Sharma',
    username: 'rahul',
    password: '123',
    targetSales: 150000,
    achievedSales: 84000,
    targetCollection: 100000,
    achievedCollection: 62000,
  },
  {
    id: 's2',
    name: 'Vikas Kumar',
    username: 'vikas',
    password: '123',
    targetSales: 120000,
    achievedSales: 45000,
    targetCollection: 90000,
    achievedCollection: 38000,
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-1042',
    invoiceNumber: 'INV-2026-1042',
    storeName: 'Gupta Kirana & General Store',
    orderType: 'wholesale',
    salesmanId: 's1',
    salesmanName: 'Rahul Sharma',
    createdAt: '2026-09-22 09:15',
    status: 'DISPATCHED',
    paymentStatus: 'UNPAID',
    retailerGstin: '07BBRPA1234D1Z2',
    totalAmount: 6450,
    items: [
      {
        productId: 'p1',
        productName: 'Refined Oil 1L Pouch',
        hsn: '1515',
        quantity: 25,
        unitPrice: 122,
        wholesaleScheme: 'Buy 10 Cases Get 1 Case Free',
        total: 3050,
      },
      {
        productId: 'p2',
        productName: 'Wheat Flour 10kg Bag',
        hsn: '1101',
        quantity: 10,
        unitPrice: 340,
        wholesaleScheme: '5% Extra Cash Discount on 20+ bags',
        total: 3400,
      },
    ],
  },
  {
    id: 'ORD-1043',
    invoiceNumber: 'INV-2026-1043',
    storeName: 'Direct Retail Delivery',
    orderType: 'retail',
    customerName: 'Pooja Aggarwal',
    customerMobile: '9811223344',
    deliveryAddress: 'Flat 402, Block C, Green Park Residency, New Delhi',
    createdAt: '2026-09-22 10:40',
    status: 'PENDING',
    paymentStatus: 'PAID',
    totalAmount: 565,
    items: [
      {
        productId: 'p1',
        productName: 'Refined Oil 1L Pouch',
        hsn: '1515',
        quantity: 2,
        unitPrice: 140,
        retailOffer: '₹15 Instant Discount',
        total: 280,
      },
      {
        productId: 'p3',
        productName: 'Washing Powder 1kg',
        hsn: '3402',
        quantity: 3,
        unitPrice: 95,
        retailOffer: 'Special Buy 2 Get 1 Free Promo',
        total: 285,
      },
    ],
  },
];

const INITIAL_ISSUES: Issue[] = [
  {
    id: 'iss-1',
    salesmanName: 'Rahul Sharma',
    shopName: 'Gupta General Store',
    category: 'Payment Dispute',
    description: 'Cheque bounce on invoice #442, retailer asking 3 days extension.',
    status: 'OPEN',
    timestamp: '2026-09-22 10:30',
  },
];

interface AppContextType {
  currentUser: AuthUser | null;
  login: (username: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  currentRoute: RoleRoute;
  setCurrentRoute: (route: RoleRoute) => void;
  companyProfile: CompanyProfile;
  updateCompanyProfile: (updates: Partial<CompanyProfile>) => void;
  products: Product[];
  salesman: Salesman; // current active salesman (or first if admin)
  salesmen: Salesman[]; // all salesmen accounts
  orders: Order[];
  issues: Issue[];
  isMobilePreview: boolean;
  setIsMobilePreview: (val: boolean | ((prev: boolean) => boolean)) => void;
  updateStock: (productId: string, newStock: number) => void;
  toggleFocusProduct: (productId: string, note?: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  updateSalesmanTargets: (salesmanId: string, targetSales: number, targetCollection: number) => void;
  createSalesman: (data: {
    name: string;
    username: string;
    password?: string;
    targetSales: number;
    targetCollection: number;
  }) => { success: boolean; message?: string };
  createOrder: (order: Omit<Order, 'id' | 'createdAt'>) => string;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  addIssue: (issue: Omit<Issue, 'id' | 'timestamp'>) => void;
  updateIssueStatus: (issueId: string, status: Issue['status']) => void;
  recordCollection: (amount: number, salesmanId?: string) => void;
  resetDemoData: () => void;
}

const STORAGE_KEYS = {
  AUTH_USER: 'fmcg_auth_user_v2',
  PRODUCTS: 'fmcg_products_v2',
  SALESMEN: 'fmcg_salesmen_v2',
  ORDERS: 'fmcg_orders_v2',
  ISSUES: 'fmcg_issues_v2',
  MOBILE_PREVIEW: 'fmcg_mobile_preview_v2',
  COMPANY_PROFILE: 'fmcg_company_profile_v2',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Current logged in user (null by default on refresh/open or stored in session)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved auth user', e);
    }
    return null;
  });

  const [currentRoute, setCurrentRouteState] = useState<RoleRoute>(() => {
    const path = window.location.pathname;
    if (path === '/salesman' || path === '/store' || path === '/admin') {
      return path;
    }
    return '/admin';
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved products from localStorage', e);
    }
    return INITIAL_PRODUCTS;
  });

  const [salesmen, setSalesmen] = useState<Salesman[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALESMEN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved salesmen from localStorage', e);
    }
    return INITIAL_SALESMEN;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved orders from localStorage', e);
    }
    return INITIAL_ORDERS;
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPANY_PROFILE);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved company profile from localStorage', e);
    }
    return DEFAULT_COMPANY_PROFILE;
  });

  const [issues, setIssues] = useState<Issue[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ISSUES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved issues from localStorage', e);
    }
    return INITIAL_ISSUES;
  });

  const [isMobilePreview, setIsMobilePreview] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MOBILE_PREVIEW);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved mobile preview flag', e);
    }
    return false;
  });

  // Current active salesman computed from currentUser or fallback to first salesman
  const activeSalesman = (currentUser?.role === 'SALESMAN' && currentUser.salesmanId)
    ? (salesmen.find((s) => s.id === currentUser.salesmanId) || salesmen[0])
    : salesmen[0];

  const updateCompanyProfile = (updates: Partial<CompanyProfile>) => {
    setCompanyProfile((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEYS.COMPANY_PROFILE, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save company profile to localStorage', e);
      }
      return next;
    });
  };

  // Sync to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      }
    } catch (e) {
      console.error('Error saving auth user to localStorage', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Error saving products to localStorage', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SALESMEN, JSON.stringify(salesmen));
    } catch (e) {
      console.error('Error saving salesmen to localStorage', e);
    }
  }, [salesmen]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error('Error saving orders to localStorage', e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(issues));
    } catch (e) {
      console.error('Error saving issues to localStorage', e);
    }
  }, [issues]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MOBILE_PREVIEW, JSON.stringify(isMobilePreview));
    } catch (e) {
      console.error('Error saving mobile preview to localStorage', e);
    }
  }, [isMobilePreview]);

  // Sync route with browser history
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/salesman' || path === '/store' || path === '/admin') {
        setCurrentRouteState(path);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const login = (usernameInput: string, passwordInput: string): { success: boolean; message?: string } => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    // 1. Check Admin Credentials: admin / admin123
    if (cleanUser === 'admin' && cleanPass === 'admin123') {
      const adminUser: AuthUser = {
        id: 'usr-admin',
        name: 'Super Stockist Administrator',
        username: 'admin',
        role: 'ADMIN',
      };
      setCurrentUser(adminUser);
      setCurrentRoute('/admin');
      return { success: true };
    }

    // 2. Check Salesman Accounts (dynamic and demo: rahul / 123, vikas / 123, etc.)
    const foundSalesman = salesmen.find(
      (s) => s.username.toLowerCase() === cleanUser && (s.password === cleanPass || (!s.password && cleanPass === '123'))
    );

    if (foundSalesman) {
      const salesmanUser: AuthUser = {
        id: `usr-${foundSalesman.id}`,
        name: foundSalesman.name,
        username: foundSalesman.username,
        role: 'SALESMAN',
        salesmanId: foundSalesman.id,
      };
      setCurrentUser(salesmanUser);
      setCurrentRoute('/salesman');
      return { success: true };
    }

    return {
      success: false,
      message: 'Invalid credentials. Please enter a valid username/password or use demo credentials.',
    };
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    } catch (e) {
      console.error('Error removing auth from localStorage', e);
    }
    // Set route to /admin as neutral default
    setCurrentRouteState('/admin');
  };

  const setCurrentRoute = (route: RoleRoute) => {
    setCurrentRouteState(route);
    if (window.location.pathname !== route) {
      window.history.pushState(null, '', route);
    }
  };

  const updateStock = (productId: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p))
    );
  };

  const toggleFocusProduct = (productId: string, note?: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const willBeFocus = !p.isFocusProduct;
          return {
            ...p,
            isFocusProduct: willBeFocus,
            focusNote: note !== undefined ? note : (willBeFocus ? (p.focusNote || 'Priority focus SKU') : ''),
          };
        }
        return p;
      })
    );
  };

  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newId = `p${Date.now().toString().slice(-4)}`;
    setProducts((prev) => [...prev, { ...productData, id: newId }]);
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
  };

  const updateSalesmanTargets = (salesmanId: string, targetSales: number, targetCollection: number) => {
    setSalesmen((prev) =>
      prev.map((s) =>
        s.id === salesmanId
          ? {
              ...s,
              targetSales: Math.max(0, targetSales),
              targetCollection: Math.max(0, targetCollection),
            }
          : s
      )
    );
  };

  const createSalesman = (data: {
    name: string;
    username: string;
    password?: string;
    targetSales: number;
    targetCollection: number;
  }): { success: boolean; message?: string } => {
    const cleanUsername = data.username.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, message: 'Username is required' };
    }
    if (!data.name.trim()) {
      return { success: false, message: 'Salesman Name is required' };
    }
    if (cleanUsername === 'admin' || salesmen.some((s) => s.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: `Username "${data.username}" is already taken. Please choose another.` };
    }

    const newId = `s${Date.now().toString().slice(-4)}`;
    const newSalesman: Salesman = {
      id: newId,
      name: data.name.trim(),
      username: cleanUsername,
      password: data.password?.trim() || '123',
      targetSales: Math.max(0, data.targetSales),
      achievedSales: 0,
      targetCollection: Math.max(0, data.targetCollection),
      achievedCollection: 0,
    };

    setSalesmen((prev) => [...prev, newSalesman]);
    return { success: true };
  };

  const createOrder = (orderData: Omit<Order, 'id' | 'createdAt'>): string => {
    const newOrderId = `ORD-${Date.now().toString().slice(-4)}`;
    const invoiceNum = orderData.invoiceNumber || `INV-2026-${Date.now().toString().slice(-4)}`;
    const resolvedSalesmanName = orderData.salesmanName || 
      (orderData.salesmanId ? salesmen.find((s) => s.id === orderData.salesmanId)?.name : (orderData.orderType === 'wholesale' ? activeSalesman.name : undefined));

    const newOrder: Order = {
      ...orderData,
      id: newOrderId,
      invoiceNumber: invoiceNum,
      salesmanName: resolvedSalesmanName,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Automatically deduct product stock
    setProducts((prev) =>
      prev.map((prod) => {
        const item = orderData.items.find((i) => i.productId === prod.id);
        if (item) {
          return { ...prod, stock: Math.max(0, prod.stock - item.quantity) };
        }
        return prod;
      })
    );

    // Update specific salesman achieved sales if order has salesmanId or activeSalesman
    const targetSalesmanId = orderData.salesmanId || (orderData.orderType === 'wholesale' ? activeSalesman.id : undefined);
    if (targetSalesmanId && orderData.orderType === 'wholesale') {
      setSalesmen((prev) =>
        prev.map((s) =>
          s.id === targetSalesmanId
            ? { ...s, achievedSales: s.achievedSales + orderData.totalAmount }
            : s
        )
      );
    }

    return newOrderId;
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  const addIssue = (issueData: Omit<Issue, 'id' | 'timestamp'>) => {
    const newIssue: Issue = {
      ...issueData,
      id: `iss-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    setIssues((prev) => [newIssue, ...prev]);
  };

  const updateIssueStatus = (issueId: string, status: Issue['status']) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status } : i))
    );
  };

  const recordCollection = (amount: number, targetSalesmanId?: string) => {
    const sid = targetSalesmanId || activeSalesman.id;
    setSalesmen((prev) =>
      prev.map((s) =>
        s.id === sid
          ? { ...s, achievedCollection: s.achievedCollection + amount }
          : s
      )
    );
  };

  const resetDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setSalesmen(INITIAL_SALESMEN);
    setOrders(INITIAL_ORDERS);
    setIssues(INITIAL_ISSUES);
    setCompanyProfile(DEFAULT_COMPANY_PROFILE);
    try {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.SALESMEN);
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
      localStorage.removeItem(STORAGE_KEYS.ISSUES);
      localStorage.removeItem(STORAGE_KEYS.COMPANY_PROFILE);
    } catch (e) {
      console.error('Error clearing demo data', e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        login,
        logout,
        currentRoute,
        setCurrentRoute,
        companyProfile,
        updateCompanyProfile,
        products,
        salesman: activeSalesman,
        salesmen,
        orders,
        issues,
        isMobilePreview,
        setIsMobilePreview,
        updateStock,
        toggleFocusProduct,
        addProduct,
        updateProduct,
        updateSalesmanTargets,
        createSalesman,
        createOrder,
        updateOrderStatus,
        addIssue,
        updateIssueStatus,
        recordCollection,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
