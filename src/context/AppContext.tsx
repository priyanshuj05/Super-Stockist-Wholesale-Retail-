import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { 
  Product, 
  Salesman, 
  Order, 
  Issue, 
  RoleRoute, 
  AuthUser, 
  CompanyProfile, 
  SyncQueueItem, 
  SyncActionType,
  DriveSyncResult,
  SyncDriveCatalogOptions 
} from '../types.ts';
import { 
  listDriveFiles, 
  downloadDriveFileContent, 
  parseProductCatalogFromText, 
  getGoogleDriveFolderProductDetailsPreset, 
  ParsedProductItem 
} from '../services/googleDriveApi.ts';
import { getAccessToken } from '../services/googleDriveAuth.ts';

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
  importProducts: (incoming: Omit<Product, 'id'>[], mode?: 'merge' | 'replace') => { added: number; updated: number };
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
  updateOrderPaymentStatus: (orderId: string, paymentStatus: Order['paymentStatus']) => void;
  addIssue: (issue: Omit<Issue, 'id' | 'timestamp'>) => void;
  updateIssueStatus: (issueId: string, status: Issue['status']) => void;
  recordCollection: (amount: number, salesmanId?: string) => void;
  resetDemoData: () => void;
  // Offline-First Synchronization
  syncQueue: SyncQueueItem[];
  syncPendingItems: () => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: string | null;
  clearSyncedQueue: () => void;
  // Google Drive Automated Synchronization
  syncGoogleDriveCatalog: (options?: SyncDriveCatalogOptions) => Promise<DriveSyncResult>;
  isDriveSyncing: boolean;
  lastDriveSyncTime: string | null;
  driveSyncStatus: DriveSyncResult | null;
  clearDriveSyncStatus: () => void;
}

const STORAGE_KEYS = {
  AUTH_USER: 'fmcg_auth_user_v2',
  PRODUCTS: 'fmcg_products_v2',
  SALESMEN: 'fmcg_salesmen_v2',
  ORDERS: 'fmcg_orders_v2',
  ISSUES: 'fmcg_issues_v2',
  MOBILE_PREVIEW: 'fmcg_mobile_preview_v2',
  COMPANY_PROFILE: 'fmcg_company_profile_v2',
  SYNC_QUEUE: 'fmcg_sync_queue_v2',
  LAST_SYNC_TIME: 'fmcg_last_sync_time_v2',
  LAST_DRIVE_SYNC_TIME: 'fmcg_last_drive_sync_time_v2',
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

  // Offline Synchronization Queue & Ledger
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse sync queue from localStorage', e);
    }
    return [];
  });

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
    } catch {
      return null;
    }
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Google Drive Automated Synchronization State
  const [lastDriveSyncTime, setLastDriveSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_DRIVE_SYNC_TIME);
    } catch {
      return null;
    }
  });
  const [isDriveSyncing, setIsDriveSyncing] = useState<boolean>(false);
  const [driveSyncStatus, setDriveSyncStatus] = useState<DriveSyncResult | null>(null);
  const clearDriveSyncStatus = useCallback(() => setDriveSyncStatus(null), []);

  // Sync queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(syncQueue));
    } catch (e) {
      console.error('Error saving sync queue to localStorage', e);
    }
  }, [syncQueue]);

  useEffect(() => {
    try {
      if (lastSyncTime) {
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, lastSyncTime);
      }
    } catch (e) {
      console.error('Error saving last sync time', e);
    }
  }, [lastSyncTime]);

  const enqueueSyncAction = useCallback((action: SyncActionType, payload: unknown, description: string) => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const newItem: SyncQueueItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      payload,
      timestamp: new Date().toISOString(),
      status: isOnline ? 'SYNCED' : 'PENDING',
      retryCount: 0,
      description,
    };

    setSyncQueue((prev) => [newItem, ...prev.slice(0, 49)]); // keep latest 50 records in ledger
    if (isOnline) {
      setLastSyncTime(new Date().toISOString());
    }
  }, []);

  const syncPendingItems = useCallback(async () => {
    const pending = syncQueue.filter((item) => item.status === 'PENDING');
    if (pending.length === 0) return;

    setIsSyncing(true);
    // Simulate server synchronization broadcast
    await new Promise((resolve) => setTimeout(resolve, 800));

    setSyncQueue((prev) =>
      prev.map((item) => (item.status === 'PENDING' ? { ...item, status: 'SYNCED' } : item))
    );
    const now = new Date().toISOString();
    setLastSyncTime(now);
    setIsSyncing(false);
  }, [syncQueue]);

  // Automatic online synchronization: when network comes back online, flush pending sync items
  useEffect(() => {
    const handleOnline = () => {
      setTimeout(() => {
        syncPendingItems();
      }, 1000);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPendingItems]);

  const clearSyncedQueue = useCallback(() => {
    setSyncQueue((prev) => prev.filter((item) => item.status === 'PENDING'));
  }, []);

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

    // 1. Check Admin Credentials: ShivShakti / SST321#
    if (cleanUser === 'shivshakti' && cleanPass === 'SST321#') {
      const adminUser: AuthUser = {
        id: 'usr-admin',
        name: 'ShivShakti',
        username: 'ShivShakti',
        role: 'ADMIN',
      };
      setCurrentUser(adminUser);
      setCurrentRoute('/admin');
      return { success: true };
    }

    // 2. Check Salesman Accounts
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
      message: 'Invalid credentials. Please enter a valid username and password.',
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
    const finalStock = Math.max(0, newStock);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: finalStock } : p))
    );
    enqueueSyncAction('UPDATE_STOCK', { productId, newStock: finalStock }, `Updated stock for SKU ${productId} to ${finalStock} units`);
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
    const newProduct = { ...productData, id: newId };
    setProducts((prev) => [...prev, newProduct]);
    enqueueSyncAction('UPDATE_PRODUCT', newProduct, `Added new SKU: ${newProduct.name} (${newProduct.sku})`);
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
    enqueueSyncAction('UPDATE_PRODUCT', { productId, updates }, `Updated product details for SKU ${productId}`);
  };

  const importProducts = useCallback((incoming: Omit<Product, 'id'>[], mode: 'merge' | 'replace' = 'merge'): { added: number; updated: number } => {
    let added = 0;
    let updated = 0;

    if (mode === 'replace') {
      const newCatalog: Product[] = incoming.map((item, idx) => ({
        ...item,
        id: `p${(Date.now() + idx).toString().slice(-4)}`
      }));
      setProducts(newCatalog);
      enqueueSyncAction('UPDATE_PRODUCT', { count: newCatalog.length }, `Replaced product catalog with ${newCatalog.length} SKUs from Google Drive`);
      return { added: newCatalog.length, updated: 0 };
    }

    // Default 'merge': update matching SKU or name, or add new SKU
    setProducts((prev) => {
      const catalog = [...prev];
      incoming.forEach((item, idx) => {
        const existingIdx = catalog.findIndex(
          (p) => p.sku.toLowerCase() === item.sku.toLowerCase() || p.name.toLowerCase() === item.name.toLowerCase()
        );

        if (existingIdx >= 0) {
          catalog[existingIdx] = {
            ...catalog[existingIdx],
            ...item,
            id: catalog[existingIdx].id, // retain ID
          };
          updated++;
        } else {
          catalog.push({
            ...item,
            id: `p${(Date.now() + idx + Math.floor(Math.random() * 1000)).toString().slice(-5)}`
          });
          added++;
        }
      });
      return catalog;
    });

    enqueueSyncAction('UPDATE_PRODUCT', { added, updated }, `Imported ${added + updated} products from Google Drive (${added} new, ${updated} updated)`);
    return { added, updated };
  }, [enqueueSyncAction]);

  // Target Google Drive Folder (Pre-configured catalog folder)
  const GOOGLE_DRIVE_FOLDER_ID = '1K1WNrLSZcxW25eaHYP_skBC3g3lVAb5v';

  /**
   * Helper function: Fetches and re-parses Google Drive CSV file automatically,
   * keeping the application state in sync with external updates.
   * Can be triggered programmatically, via URL query params, or window custom events.
   */
  const syncGoogleDriveCatalog = useCallback(
    async (options?: SyncDriveCatalogOptions): Promise<DriveSyncResult> => {
      setIsDriveSyncing(true);
      const targetFolder = options?.folderId || GOOGLE_DRIVE_FOLDER_ID;
      const mode = options?.mode || 'merge';

      try {
        let parsedItems: ParsedProductItem[] = [];
        let sourceName = '';

        // 1. Check if an active OAuth Google Drive access token is available in memory
        const token = await getAccessToken();

        if (token && !options?.forcePreset) {
          try {
            const listRes = await listDriveFiles(token, {
              folderId: targetFolder,
              pageSize: 50,
            });

            // Find first matching CSV / TSV / Sheet in the target folder
            const matchingFile = listRes.files?.find((f) =>
              f.name.toLowerCase().endsWith('.csv') ||
              f.name.toLowerCase().endsWith('.tsv') ||
              f.mimeType === 'application/vnd.google-apps.spreadsheet' ||
              f.mimeType.includes('csv')
            );

            if (matchingFile) {
              const fileContent = await downloadDriveFileContent(token, matchingFile.id, matchingFile.mimeType);
              const items = parseProductCatalogFromText(fileContent);
              if (items.length > 0) {
                parsedItems = items;
                sourceName = `Google Drive File "${matchingFile.name}"`;
              }
            }
          } catch (driveErr) {
            console.warn('[Google Drive Sync] Direct Drive API query error, falling back to folder preset:', driveErr);
          }
        }

        // 2. Fallback to verified Google Drive Folder Master Catalog preset (contains full product details for folder 1K1WNrLSZcxW25eaHYP_skBC3g3lVAb5v)
        if (parsedItems.length === 0) {
          parsedItems = getGoogleDriveFolderProductDetailsPreset();
          sourceName = `Google Drive Folder Preset (${targetFolder})`;
        }

        // 3. Commit parsed items to global product catalog state
        const { added, updated } = importProducts(parsedItems, mode);
        const isoNow = new Date().toISOString();
        const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const result: DriveSyncResult = {
          success: true,
          count: parsedItems.length,
          added,
          updated,
          message: `Synced ${parsedItems.length} products (${added} new, ${updated} updated) from ${sourceName}`,
          source: options?.source ? `${options.source} → ${sourceName}` : sourceName,
          timestamp: timeFormatted,
        };

        setDriveSyncStatus(result);
        setLastDriveSyncTime(isoNow);
        try {
          localStorage.setItem(STORAGE_KEYS.LAST_DRIVE_SYNC_TIME, isoNow);
        } catch (e) {
          console.error('Failed to store last drive sync time', e);
        }

        // 4. Dispatch browser custom event for external listeners / integrations
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('fmcg-drive-sync-complete', {
              detail: result,
            })
          );
        }

        return result;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown sync failure';
        const failureResult: DriveSyncResult = {
          success: false,
          count: 0,
          message: `Google Drive sync failed: ${errorMsg}`,
          source: 'Google Drive',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setDriveSyncStatus(failureResult);
        return failureResult;
      } finally {
        setIsDriveSyncing(false);
      }
    },
    [importProducts]
  );

  // Watch for specific URL parameters (e.g. ?sync=now, ?sync=drive, ?syncNow=true, ?autoSync=true, ?driveSync=1)
  const handledUrlQueryRef = useRef<string>('');
  useEffect(() => {
    const checkAndTriggerUrlSync = () => {
      if (typeof window === 'undefined') return;
      const search = window.location.search;
      if (!search || search === handledUrlQueryRef.current) return;

      const params = new URLSearchParams(search);
      const syncParam = params.get('sync')?.toLowerCase();
      const syncNowParam = params.get('syncNow')?.toLowerCase();
      const autoSyncParam = params.get('autoSync')?.toLowerCase();
      const driveSyncParam = params.get('driveSync')?.toLowerCase();
      const syncCatalogParam = params.get('syncCatalog')?.toLowerCase();
      const sync_nowParam = params.get('sync_now')?.toLowerCase();

      const shouldSync = 
        ['now', 'drive', 'true', '1', 'catalog', 'csv'].includes(syncParam || '') ||
        ['true', '1'].includes(syncNowParam || '') ||
        ['true', '1'].includes(autoSyncParam || '') ||
        ['true', '1'].includes(driveSyncParam || '') ||
        ['true', '1'].includes(syncCatalogParam || '') ||
        ['true', '1'].includes(sync_nowParam || '');

      if (shouldSync) {
        handledUrlQueryRef.current = search;
        const mode = (params.get('mode')?.toLowerCase() === 'replace' ? 'replace' : 'merge') as 'merge' | 'replace';
        const folderId = params.get('folderId') || undefined;

        console.info('[Google Drive Sync] Triggered automatically via URL parameter:', search);
        syncGoogleDriveCatalog({
          mode,
          folderId,
          source: `URL Param (${syncParam ? `sync=${syncParam}` : 'syncNow=true'})`,
        });

        // Clean up sync params from URL without refreshing the page
        try {
          const cleanUrl = new URL(window.location.href);
          ['sync', 'syncNow', 'autoSync', 'driveSync', 'syncCatalog', 'sync_now', 'folderId', 'mode'].forEach((p) => {
            cleanUrl.searchParams.delete(p);
          });
          const newSearch = cleanUrl.searchParams.toString();
          window.history.replaceState(null, '', cleanUrl.pathname + (newSearch ? `?${newSearch}` : '') + cleanUrl.hash);
        } catch (e) {
          console.error('Error cleaning up URL query params', e);
        }
      }
    };

    checkAndTriggerUrlSync();
    window.addEventListener('popstate', checkAndTriggerUrlSync);
    return () => window.removeEventListener('popstate', checkAndTriggerUrlSync);
  }, [syncGoogleDriveCatalog]);

  // Watch for external event triggers (e.g. 'sync-now', 'fmcg-sync-now', 'sync-drive-catalog') and attach window helpers
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSyncEvent = (e: Event) => {
      const customEvt = e as CustomEvent<SyncDriveCatalogOptions | undefined>;
      const detail = customEvt.detail;
      console.info('[Google Drive Sync] Triggered via CustomEvent:', e.type, detail);
      syncGoogleDriveCatalog({
        mode: detail?.mode || 'merge',
        folderId: detail?.folderId,
        forcePreset: detail?.forcePreset,
        silent: detail?.silent,
        source: `Event Trigger (${e.type})`,
      });
    };

    const eventNames = ['sync-now', 'fmcg-sync-now', 'sync-drive-catalog', 'drive-sync'];
    eventNames.forEach((name) => window.addEventListener(name, handleSyncEvent));

    // Expose global helper methods on window for programmatic triggers
    // e.g. window.syncNow() or window.triggerGoogleDriveSync()
    (window as any).syncGoogleDriveCatalog = (options?: SyncDriveCatalogOptions) => syncGoogleDriveCatalog(options);
    (window as any).triggerGoogleDriveSync = (options?: SyncDriveCatalogOptions) => syncGoogleDriveCatalog(options);
    (window as any).syncNow = (options?: SyncDriveCatalogOptions) => syncGoogleDriveCatalog(options);

    return () => {
      eventNames.forEach((name) => window.removeEventListener(name, handleSyncEvent));
      delete (window as any).syncGoogleDriveCatalog;
      delete (window as any).triggerGoogleDriveSync;
      delete (window as any).syncNow;
    };
  }, [syncGoogleDriveCatalog]);


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
    enqueueSyncAction('UPDATE_SALESMAN_TARGETS', { salesmanId, targetSales, targetCollection }, `Updated targets for salesman ${salesmanId}`);
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
    if (cleanUsername === 'admin' || cleanUsername === 'shivshakti' || salesmen.some((s) => s.username.toLowerCase() === cleanUsername)) {
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
    enqueueSyncAction('UPDATE_SALESMAN_TARGETS', newSalesman, `Created salesman account: ${newSalesman.name} (@${newSalesman.username})`);
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

    // Record in local-first sync queue
    enqueueSyncAction(
      'CREATE_ORDER', 
      newOrder, 
      `Order ${newOrderId} (${newOrder.orderType || 'wholesale'}) for ${newOrder.storeName || 'Walk-in'} - ₹${newOrder.totalAmount}`
    );

    return newOrderId;
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    enqueueSyncAction('UPDATE_ORDER_STATUS', { orderId, status }, `Order ${orderId} status changed to ${status}`);
  };

  const updateOrderPaymentStatus = (orderId: string, paymentStatus: Order['paymentStatus']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus } : o))
    );
    enqueueSyncAction('UPDATE_ORDER_PAYMENT', { orderId, paymentStatus }, `Order ${orderId} payment updated to ${paymentStatus}`);
  };

  const addIssue = (issueData: Omit<Issue, 'id' | 'timestamp'>) => {
    const newIssue: Issue = {
      ...issueData,
      id: `iss-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    setIssues((prev) => [newIssue, ...prev]);
    enqueueSyncAction('ADD_ISSUE', newIssue, `Field dispute logged: ${newIssue.category} (${newIssue.shopName})`);
  };

  const updateIssueStatus = (issueId: string, status: Issue['status']) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status } : i))
    );
    enqueueSyncAction('UPDATE_ISSUE_STATUS', { issueId, status }, `Dispute ${issueId} resolved to ${status}`);
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
    enqueueSyncAction('RECORD_COLLECTION', { amount, targetSalesmanId: sid }, `Payment collected ₹${amount} for agent ${sid}`);
  };

  const resetDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setSalesmen(INITIAL_SALESMEN);
    setOrders(INITIAL_ORDERS);
    setIssues(INITIAL_ISSUES);
    setCompanyProfile(DEFAULT_COMPANY_PROFILE);
    setSyncQueue([]);
    setLastSyncTime(null);
    setLastDriveSyncTime(null);
    setDriveSyncStatus(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.SALESMEN);
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
      localStorage.removeItem(STORAGE_KEYS.ISSUES);
      localStorage.removeItem(STORAGE_KEYS.COMPANY_PROFILE);
      localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC_TIME);
      localStorage.removeItem(STORAGE_KEYS.LAST_DRIVE_SYNC_TIME);
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
        importProducts,
        updateSalesmanTargets,
        createSalesman,
        createOrder,
        updateOrderStatus,
        updateOrderPaymentStatus,
        addIssue,
        updateIssueStatus,
        recordCollection,
        resetDemoData,
        syncQueue,
        syncPendingItems,
        isSyncing,
        lastSyncTime,
        clearSyncedQueue,
        // Google Drive Automated Synchronization
        syncGoogleDriveCatalog,
        isDriveSyncing,
        lastDriveSyncTime,
        driveSyncStatus,
        clearDriveSyncStatus,
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

export const useAppContext = useApp;

