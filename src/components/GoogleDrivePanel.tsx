import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { 
  googleSignIn, 
  googleLogout, 
  getAccessToken, 
  initAuth, 
  getCurrentGoogleUser,
  setAccessTokenInMemory
} from '../services/googleDriveAuth.ts';
import { 
  listDriveFiles, 
  uploadDriveFile, 
  findOrCreateFolder, 
  createDriveFolder,
  trashDriveFile, 
  formatBytes, 
  GoogleDriveFile 
} from '../services/googleDriveApi.ts';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';
import { GoogleDriveConfirmModal } from './GoogleDriveConfirmModal.tsx';
import { GoogleDriveProductSyncModal } from './GoogleDriveProductSyncModal.tsx';
import { 
  Cloud, 
  Folder, 
  FolderPlus, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Image as ImageIcon,
  File,
  ShieldCheck,
  LogOut,
  Clock,
  HardDrive
} from 'lucide-react';
import { User } from 'firebase/auth';

interface GoogleDrivePanelProps {
  onClose?: () => void;
  asModal?: boolean;
}

export const GoogleDrivePanel: React.FC<GoogleDrivePanelProps> = ({ onClose, asModal = false }) => {
  const { products, orders, salesmen, companyProfile, issues } = useApp();

  // Auth State
  const [googleUser, setGoogleUser] = useState<User | null>(() => getCurrentGoogleUser());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string>('');

  // Drive Files State
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BACKUPS' | 'SHEETS' | 'DOCS' | 'FOLDERS'>('ALL');
  const [backupFolderId, setBackupFolderId] = useState<string | null>(null);

  // Operation States
  const [isBackingUp, setIsBackingUp] = useState<string | null>(null); // 'orders' | 'system' | 'catalog'
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; link?: string } | null>(null);

  // New Folder Modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Destructive Delete Confirmation Modal State (MANDATORY Safety Requirement)
  const [fileToDelete, setFileToDelete] = useState<GoogleDriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Product Catalog Drive Folder Sync Modal State
  const [showProductSyncModal, setShowProductSyncModal] = useState(false);

  // Hidden File Input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Auth Listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        setAuthError('');
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );

    // Check if token already present in memory
    getAccessToken().then((tok) => {
      if (tok) {
        setAccessToken(tok);
        setGoogleUser(getCurrentGoogleUser());
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch Drive Files when accessToken is present
  const fetchFiles = async (token: string, folderId?: string, query?: string) => {
    setIsLoadingFiles(true);
    try {
      let q = query || '';
      if (filterType === 'BACKUPS' && backupFolderId) {
        q = `'${backupFolderId}' in parents`;
      }

      const res = await listDriveFiles(token, {
        pageSize: 40,
        query: q || undefined,
        folderId: filterType === 'BACKUPS' && backupFolderId ? backupFolderId : undefined
      });
      setFiles(res.files || []);
    } catch (err: unknown) {
      console.error('Failed to load Google Drive files:', err);
      const msg = err instanceof Error ? err.message : 'Error fetching files from Google Drive';
      if (msg.includes('401') || msg.includes('token') || msg.includes('UNAUTHENTICATED')) {
        setAccessToken(null);
        setAccessTokenInMemory(null);
        setAuthError('Session expired or token invalid. Please sign in again.');
      }
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchFiles(accessToken, undefined, searchQuery);
      // Ensure FMCG backup folder exists in user's Drive
      findOrCreateFolder(accessToken, 'FMCG Distro OS Backups')
        .then((f) => setBackupFolderId(f.id))
        .catch((e) => console.warn('Could not locate FMCG Backups folder:', e));
    }
  }, [accessToken]);

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        setStatusMessage({
          type: 'success',
          text: `Successfully connected Google Drive for ${res.user.email || res.user.displayName || 'Account'}!`
        });
      }
    } catch (err: unknown) {
      console.error('Sign-in failed:', err);
      const msg = err instanceof Error ? err.message : 'Google Drive Sign-in failed. Please try again.';
      setAuthError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Google Sign-Out
  const handleGoogleSignOut = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setAccessToken(null);
      setFiles([]);
      setStatusMessage({
        type: 'success',
        text: 'Disconnected Google Drive account.'
      });
    } catch (err: unknown) {
      console.error('Logout error:', err);
    }
  };

  // 1. One-Click Backup: Live Orders CSV to Google Drive
  const handleBackupOrdersCSVToDrive = async () => {
    if (!accessToken) return;
    setIsBackingUp('orders');
    setStatusMessage(null);
    try {
      // Ensure target folder
      const folder = await findOrCreateFolder(accessToken, 'FMCG Distro OS Backups');
      setBackupFolderId(folder.id);

      const headers = [
        'Invoice Number',
        'Order ID',
        'Date & Time',
        'Order Type',
        'Customer / Store Name',
        'Contact Mobile',
        'Retailer GSTIN',
        'Delivery Address',
        'Sales Representative',
        'Items Detail',
        'Total Line Items',
        'Total Units',
        'Total Amount (INR)',
        'Order Status',
        'Payment Status'
      ];

      const escapeCsv = (val: string | number | undefined | null) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = orders.map((ord) => {
        const itemsDetail = ord.items
          .map((i) => `${i.productName} (Qty: ${i.quantity} @ Rs.${i.unitPrice})`)
          .join('; ');
        const totalUnits = ord.items.reduce((sum, i) => sum + i.quantity, 0);

        return [
          escapeCsv(ord.invoiceNumber || ord.id),
          escapeCsv(ord.id),
          escapeCsv(ord.createdAt),
          escapeCsv(ord.orderType || 'wholesale'),
          escapeCsv(ord.storeName || ord.customerName || 'N/A'),
          escapeCsv(ord.customerMobile || 'N/A'),
          escapeCsv(ord.retailerGstin || 'N/A'),
          escapeCsv(ord.deliveryAddress || 'N/A'),
          escapeCsv(ord.salesmanName || 'Field Sales Rep'),
          escapeCsv(itemsDetail),
          escapeCsv(ord.items.length),
          escapeCsv(totalUnits),
          escapeCsv(ord.totalAmount),
          escapeCsv(ord.status),
          escapeCsv(ord.paymentStatus)
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `FMCG_Live_Orders_Ledger_${timestamp}.csv`;

      const uploaded = await uploadDriveFile(accessToken, {
        name: filename,
        mimeType: 'text/csv',
        content: csvContent,
        parentFolderId: folder.id,
        description: `Export of ${orders.length} live FMCG orders backed up from FMCG Distro OS.`
      });

      setStatusMessage({
        type: 'success',
        text: `✓ Successfully saved ${orders.length} orders to Google Drive as "${filename}"!`,
        link: uploaded.webViewLink
      });

      fetchFiles(accessToken, folder.id);
    } catch (err: unknown) {
      console.error('Failed to backup orders to Google Drive:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save orders to Google Drive'
      });
    } finally {
      setIsBackingUp(null);
    }
  };

  // 2. One-Click Backup: Full System JSON Snapshot to Google Drive
  const handleBackupSystemStateToDrive = async () => {
    if (!accessToken) return;
    setIsBackingUp('system');
    setStatusMessage(null);
    try {
      const folder = await findOrCreateFolder(accessToken, 'FMCG Distro OS Backups');
      setBackupFolderId(folder.id);

      const systemState = {
        exportedAt: new Date().toISOString(),
        companyProfile,
        productsCount: products.length,
        products,
        ordersCount: orders.length,
        orders,
        salesmenCount: salesmen.length,
        salesmen,
        issuesCount: issues.length,
        issues,
        schemaVersion: '2.0.0-fmcg-distro-os'
      };

      const jsonString = JSON.stringify(systemState, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `FMCG_System_Full_Snapshot_${timestamp}.json`;

      const uploaded = await uploadDriveFile(accessToken, {
        name: filename,
        mimeType: 'application/json',
        content: jsonString,
        parentFolderId: folder.id,
        description: 'Comprehensive system state snapshot from FMCG Distro OS.'
      });

      setStatusMessage({
        type: 'success',
        text: `✓ Full system snapshot saved to Google Drive as "${filename}"!`,
        link: uploaded.webViewLink
      });

      fetchFiles(accessToken, folder.id);
    } catch (err: unknown) {
      console.error('Failed to backup system state:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save system snapshot to Google Drive'
      });
    } finally {
      setIsBackingUp(null);
    }
  };

  // 3. One-Click Backup: Product & Pricing Master Catalog CSV to Drive
  const handleBackupCatalogCSVToDrive = async () => {
    if (!accessToken) return;
    setIsBackingUp('catalog');
    setStatusMessage(null);
    try {
      const folder = await findOrCreateFolder(accessToken, 'FMCG Distro OS Backups');
      setBackupFolderId(folder.id);

      const headers = [
        'SKU Code',
        'Product Name',
        'HSN Code',
        'Current Warehouse Stock (Units)',
        'Wholesale Trade Price (INR)',
        'Retail Consumer MRP (INR)',
        'Trade Wholesale Scheme',
        'Consumer Retail Offer',
        'Focus SKU Status',
        'Field Directive Note'
      ];

      const escapeCsv = (val: string | number | undefined | null) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = products.map((p) => [
        escapeCsv(p.sku),
        escapeCsv(p.name),
        escapeCsv(p.hsn || '2106'),
        escapeCsv(p.stock),
        escapeCsv(p.wholesalePrice),
        escapeCsv(p.retailPrice),
        escapeCsv(p.wholesaleScheme || 'None'),
        escapeCsv(p.retailOffer || 'None'),
        escapeCsv(p.isFocusProduct ? 'YES' : 'NO'),
        escapeCsv(p.focusNote || '')
      ].join(','));

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `FMCG_Product_Catalog_Master_${timestamp}.csv`;

      const uploaded = await uploadDriveFile(accessToken, {
        name: filename,
        mimeType: 'text/csv',
        content: csvContent,
        parentFolderId: folder.id,
        description: `Export of ${products.length} catalog SKUs from FMCG Distro OS.`
      });

      setStatusMessage({
        type: 'success',
        text: `✓ Product catalog master saved to Google Drive as "${filename}"!`,
        link: uploaded.webViewLink
      });

      fetchFiles(accessToken, folder.id);
    } catch (err: unknown) {
      console.error('Failed to backup catalog:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save catalog to Google Drive'
      });
    } finally {
      setIsBackingUp(null);
    }
  };

  // Upload custom file from user's disk to Google Drive
  const handleCustomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    setIsUploading(true);
    setStatusMessage(null);
    try {
      const folder = backupFolderId 
        ? { id: backupFolderId } 
        : await findOrCreateFolder(accessToken, 'FMCG Distro OS Backups');

      const uploaded = await uploadDriveFile(accessToken, {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        content: file,
        parentFolderId: folder.id,
        description: `User uploaded document (${file.name}) via FMCG Distro OS.`
      });

      setStatusMessage({
        type: 'success',
        text: `✓ Successfully uploaded "${file.name}" to Google Drive!`,
        link: uploaded.webViewLink
      });

      fetchFiles(accessToken, folder.id);
    } catch (err: unknown) {
      console.error('File upload failed:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to upload file to Google Drive'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Create new folder in Drive
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      await createDriveFolder(accessToken, newFolderName.trim());
      setShowNewFolderModal(false);
      setNewFolderName('');
      setStatusMessage({
        type: 'success',
        text: `✓ Created folder "${newFolderName.trim()}" in Google Drive.`
      });
      fetchFiles(accessToken);
    } catch (err: unknown) {
      console.error('Folder creation failed:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create folder in Google Drive'
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Execute Destructive Delete / Trash Operation (Triggered ONLY after explicit confirmation in modal)
  const handleConfirmDelete = async () => {
    if (!accessToken || !fileToDelete) return;
    setIsDeleting(true);
    try {
      await trashDriveFile(accessToken, fileToDelete.id);
      setStatusMessage({
        type: 'success',
        text: `✓ Moved "${fileToDelete.name}" to Google Drive trash.`
      });
      setFileToDelete(null);
      fetchFiles(accessToken);
    } catch (err: unknown) {
      console.error('Failed to trash file:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to remove file from Google Drive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter Files
  const filteredFiles = files.filter((f) => {
    if (filterType === 'SHEETS') {
      return f.mimeType.includes('spreadsheet') || f.mimeType.includes('csv') || f.name.endsWith('.csv');
    }
    if (filterType === 'DOCS') {
      return f.mimeType.includes('document') || f.mimeType.includes('pdf') || f.mimeType.includes('text');
    }
    if (filterType === 'FOLDERS') {
      return f.mimeType === 'application/vnd.google-apps.folder';
    }
    return true;
  });

  const getFileIcon = (f: GoogleDriveFile) => {
    if (f.mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-100 flex-shrink-0" />;
    }
    if (f.mimeType.includes('spreadsheet') || f.mimeType.includes('csv') || f.name.endsWith('.csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
    }
    if (f.mimeType.includes('image')) {
      return <ImageIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />;
    }
    if (f.mimeType.includes('pdf') || f.mimeType.includes('document') || f.mimeType.includes('text')) {
      return <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />;
    }
    return <File className="w-5 h-5 text-neutral-600 flex-shrink-0" />;
  };

  return (
    <div id="google-drive-hub" className="space-y-4 font-mono">
      {/* Top Banner & Drive Authentication Status */}
      <div className="bg-white border-2 border-black p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-black text-amber-400 border-2 border-black flex items-center justify-center flex-shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black uppercase text-neutral-900 tracking-tight">
                Google Drive Cloud Hub
              </h2>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                accessToken ? 'bg-emerald-100 text-emerald-900 border-emerald-500' : 'bg-neutral-100 text-neutral-600 border-neutral-400'
              }`}>
                {accessToken ? '● CONNECTED' : '○ DISCONNECTED'}
              </span>
            </div>
            <p className="text-xs text-neutral-600 mt-0.5">
              Direct cloud sync for wholesale orders, GST invoices, catalogs, and full system disaster backups.
            </p>
          </div>
        </div>

        {/* Auth Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {accessToken && googleUser ? (
            <div className="flex items-center gap-3 bg-neutral-50 border-2 border-black p-2">
              {googleUser.photoURL ? (
                <img 
                  src={googleUser.photoURL} 
                  alt={googleUser.displayName || 'Google User'} 
                  className="w-8 h-8 rounded-full border border-black"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs border border-black">
                  {(googleUser.displayName || googleUser.email || 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <span className="text-xs font-bold text-black block leading-tight truncate max-w-[160px]">
                  {googleUser.displayName || 'Google User'}
                </span>
                <span className="text-[10px] text-neutral-500 block leading-none truncate max-w-[160px]">
                  {googleUser.email}
                </span>
              </div>
              <button
                type="button"
                id="btn-google-signout"
                onClick={handleGoogleSignOut}
                className="p-1.5 bg-white hover:bg-neutral-200 text-neutral-700 hover:text-black border border-black cursor-pointer"
                title="Disconnect Google Drive"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-1">
              <GoogleSignInButton 
                onClick={handleGoogleSignIn} 
                disabled={isLoggingIn}
                label={isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
              />
              <span className="text-[10px] text-neutral-500">
                Grant permission to sync FMCG files
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Auth Error alert if any */}
      {authError && (
        <div className="p-3 bg-red-50 border-2 border-red-600 text-red-900 text-xs flex items-start gap-2 font-bold">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{authError}</span>
            <div className="mt-1">
              <button
                onClick={handleGoogleSignIn}
                className="underline uppercase font-black hover:text-red-700 cursor-pointer"
              >
                Retry Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Notifications */}
      {statusMessage && (
        <div className={`p-3 border-2 text-xs flex items-center justify-between gap-2 font-bold ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-600 text-emerald-900' 
            : 'bg-red-50 border-red-600 text-red-900'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          {statusMessage.link && (
            <a
              href={statusMessage.link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-black text-white hover:bg-neutral-800 text-[11px] uppercase font-bold flex items-center gap-1 border border-black"
            >
              <span>View in Drive</span>
              <ExternalLink className="w-3 h-3 text-amber-400" />
            </a>
          )}
        </div>
      )}

      {/* When Not Signed In: Clear Explanatory Card */}
      {!accessToken && (
        <div className="bg-neutral-50 border-2 border-black p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white border-2 border-black text-neutral-800">
            <HardDrive className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-black uppercase text-black">
              Connect Your Google Drive
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Authenticate with your Google account to automatically store live billing CSVs, manage invoices, download spreadsheets, and safely store data backups in the cloud.
            </p>
          </div>
          <div className="pt-2">
            <GoogleSignInButton 
              onClick={handleGoogleSignIn} 
              disabled={isLoggingIn}
              label={isLoggingIn ? 'Connecting to Google Drive...' : 'Connect Google Drive'}
            />
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Files are stored directly in your personal/organization Google Drive.</span>
          </div>
        </div>
      )}

      {/* When Signed In: Complete Drive Operations Bar & File Browser */}
      {accessToken && (
        <>
          {/* Linked Product Details Google Drive Folder */}
          <div
            id="panel-linked-drive-folder"
            className="bg-blue-50 border-2 border-blue-900 p-4 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  <Folder className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-blue-950 uppercase text-xs sm:text-sm">
                      Linked Product Catalog Drive Folder
                    </span>
                    <span className="px-1.5 py-0.2 bg-blue-200 text-blue-900 text-[10px] font-black uppercase border border-blue-400">
                      Catalog Source
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-600 block">
                    Source for wholesale price lists, inventory balances, retail MRPs, and trade schemes
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href="https://drive.google.com/drive/folders/1K1WNrLSZcxW25eaHYP_skBC3g3lVAb5v"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-blue-900 text-xs font-bold uppercase border border-blue-400 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Folder</span>
                </a>
                <button
                  type="button"
                  id="btn-open-sync-modal-from-panel"
                  onClick={() => setShowProductSyncModal(true)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase border-2 border-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan & Import Products</span>
                </button>
              </div>
            </div>

            <div className="bg-white border border-blue-300 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-neutral-700 truncate">
                <span className="font-bold flex-shrink-0">Folder URL:</span>
                <code className="bg-neutral-100 px-1.5 py-0.5 border border-neutral-300 text-blue-900 font-mono text-[11px] truncate">
                  https://drive.google.com/drive/folders/1K1WNrLSZcxW25eaHYP_skBC3g3lVAb5v
                </code>
              </div>
              <div className="text-[11px] text-neutral-600 flex-shrink-0">
                Active Catalog: <strong className="text-black">{products.length} SKUs</strong>
              </div>
            </div>
          </div>

          {/* Action Row: 1-Click Backups & Cloud Sync Operations */}
          <div className="bg-white border-2 border-black p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-emerald-600" />
                1-Click FMCG Backups to Google Drive
              </span>
              <span className="text-[10px] text-neutral-500 uppercase font-bold">
                Target Folder: /FMCG Distro OS Backups
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Button 1: Backup Orders CSV */}
              <button
                type="button"
                id="btn-drive-backup-orders"
                onClick={handleBackupOrdersCSVToDrive}
                disabled={isBackingUp !== null}
                className="p-3 bg-neutral-900 hover:bg-black text-white border-2 border-black text-left cursor-pointer transition-none flex flex-col justify-between group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 border border-neutral-700 uppercase">
                    CSV Spreadsheet
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black uppercase text-white block group-hover:text-amber-400">
                    {isBackingUp === 'orders' ? 'Uploading Orders...' : 'Backup Live Orders'}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    Exports {orders.length} orders to Drive spreadsheet
                  </span>
                </div>
              </button>

              {/* Button 2: Full System Snapshot JSON */}
              <button
                type="button"
                id="btn-drive-backup-system"
                onClick={handleBackupSystemStateToDrive}
                disabled={isBackingUp !== null}
                className="p-3 bg-neutral-900 hover:bg-black text-white border-2 border-black text-left cursor-pointer transition-none flex flex-col justify-between group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <HardDrive className="w-5 h-5 text-amber-400" />
                  <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 border border-neutral-700 uppercase">
                    Full JSON State
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black uppercase text-white block group-hover:text-amber-400">
                    {isBackingUp === 'system' ? 'Generating Snapshot...' : 'Backup Full System'}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    SKUs, Pricing, Reps, Quotas, Issues
                  </span>
                </div>
              </button>

              {/* Button 3: Product Catalog Master */}
              <button
                type="button"
                id="btn-drive-backup-catalog"
                onClick={handleBackupCatalogCSVToDrive}
                disabled={isBackingUp !== null}
                className="p-3 bg-neutral-900 hover:bg-black text-white border-2 border-black text-left cursor-pointer transition-none flex flex-col justify-between group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 border border-neutral-700 uppercase">
                    Trade Price Master
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black uppercase text-white block group-hover:text-amber-400">
                    {isBackingUp === 'catalog' ? 'Saving Catalog...' : 'Backup Price Catalog'}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {products.length} SKUs, HSN codes, Schemes
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Drive File Browser & Search Toolbar */}
          <div className="bg-white border-2 border-black p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <Search className="w-4 h-4 text-neutral-500" />
                <input
                  id="input-drive-search"
                  type="text"
                  placeholder="Search files in Google Drive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchFiles(accessToken, undefined, searchQuery);
                  }}
                  className="w-full border border-black px-2.5 py-1.5 text-xs font-mono bg-neutral-50 focus:bg-white"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-2.5 py-1 uppercase font-bold border ${
                    filterType === 'ALL' ? 'bg-black text-white border-black' : 'bg-white text-black border-neutral-300 hover:border-black'
                  }`}
                >
                  All Files
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('BACKUPS')}
                  className={`px-2.5 py-1 uppercase font-bold border ${
                    filterType === 'BACKUPS' ? 'bg-black text-amber-300 border-black' : 'bg-white text-black border-neutral-300 hover:border-black'
                  }`}
                >
                  FMCG Backups
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('SHEETS')}
                  className={`px-2.5 py-1 uppercase font-bold border ${
                    filterType === 'SHEETS' ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-white text-black border-neutral-300 hover:border-black'
                  }`}
                >
                  Spreadsheets
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('DOCS')}
                  className={`px-2.5 py-1 uppercase font-bold border ${
                    filterType === 'DOCS' ? 'bg-indigo-700 text-white border-indigo-800' : 'bg-white text-black border-neutral-300 hover:border-black'
                  }`}
                >
                  Docs & Invoices
                </button>
              </div>

              {/* Toolbar Buttons: Upload, New Folder, Refresh */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCustomFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  id="btn-drive-upload-custom"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-black border-2 border-black text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Upload local GST certificate, invoice, or KYC file to Google Drive"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                </button>

                <button
                  type="button"
                  id="btn-drive-new-folder"
                  onClick={() => setShowNewFolderModal(true)}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-black border-2 border-black text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
                  title="Create new folder in Google Drive"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>New Folder</span>
                </button>

                <button
                  type="button"
                  id="btn-drive-refresh"
                  onClick={() => fetchFiles(accessToken, undefined, searchQuery)}
                  disabled={isLoadingFiles}
                  className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-black border border-black cursor-pointer"
                  title="Refresh files list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Files List Table */}
            <div className="border-2 border-black bg-white overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white border-b-2 border-black uppercase text-[11px] select-none">
                    <th className="p-3 border-r border-neutral-700">Item Name</th>
                    <th className="p-3 border-r border-neutral-700 w-32">Size</th>
                    <th className="p-3 border-r border-neutral-700 w-48">Last Modified</th>
                    <th className="p-3 text-center w-40">Drive Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {isLoadingFiles ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-neutral-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-black" />
                          <span>Loading files from Google Drive...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-neutral-500 font-mono text-xs">
                        No files found matching the filter. Use the <strong>"1-Click FMCG Backups"</strong> buttons above to generate and upload live records to Google Drive!
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-neutral-50">
                        {/* Name + Icon */}
                        <td className="p-3 border-r border-black">
                          <div className="flex items-center gap-2.5">
                            {getFileIcon(file)}
                            <div>
                              <span className="font-bold text-black block truncate max-w-sm sm:max-w-md">
                                {file.name}
                              </span>
                              <span className="text-[10px] text-neutral-500 uppercase block truncate">
                                {file.mimeType.split('.').pop() || file.mimeType}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Size */}
                        <td className="p-3 border-r border-black text-neutral-700">
                          {file.mimeType === 'application/vnd.google-apps.folder' ? 'Folder' : formatBytes(file.size)}
                        </td>

                        {/* Modified Time */}
                        <td className="p-3 border-r border-black text-neutral-600 text-[11px]">
                          {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : '—'}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-white hover:bg-neutral-200 border border-black text-[11px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                                title="Open in Google Drive"
                              >
                                <ExternalLink className="w-3 h-3 text-blue-600" />
                                <span>Open</span>
                              </a>
                            )}

                            {/* MANDATORY Safety Requirement: Trashing opens confirmation modal */}
                            <button
                              type="button"
                              onClick={() => setFileToDelete(file)}
                              className="p-1 text-red-600 hover:bg-red-50 border border-neutral-300 hover:border-red-600 cursor-pointer"
                              title="Delete from Google Drive (requires confirmation)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
              <span>Showing {filteredFiles.length} item(s)</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-400" />
                Live synchronized via Google Drive API v3
              </span>
            </div>
          </div>
        </>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border-4 border-black p-5 space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h4 className="text-sm font-black uppercase text-black flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-amber-500" />
              Create New Folder in Google Drive
            </h4>
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Sales Invoices 2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full border-2 border-black p-2 text-xs bg-neutral-50 font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3 py-1.5 bg-white border-2 border-black text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-4 py-1.5 bg-black text-white border-2 border-black text-xs font-black uppercase cursor-pointer disabled:opacity-50"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Catalog Sync Modal */}
      {showProductSyncModal && (
        <GoogleDriveProductSyncModal
          onClose={() => setShowProductSyncModal(false)}
          onSuccess={() => setShowProductSyncModal(false)}
        />
      )}

      {/* MANDATORY Safety Modal for Destructive Delete Action on Google Drive files */}
      <GoogleDriveConfirmModal
        isOpen={Boolean(fileToDelete)}
        title="Delete Google Drive Item?"
        description={`Are you sure you want to remove "${fileToDelete?.name}" from your Google Drive? This will move the item to your Google Drive trash.`}
        itemNames={fileToDelete ? [fileToDelete.name] : []}
        confirmLabel="Confirm Delete"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setFileToDelete(null)}
      />
    </div>
  );
};
