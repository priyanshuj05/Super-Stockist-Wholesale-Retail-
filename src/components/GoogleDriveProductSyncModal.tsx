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
  downloadDriveFileContent, 
  extractDriveId, 
  parseProductCatalogFromText, 
  ParsedProductItem,
  GoogleDriveFile, 
  formatBytes 
} from '../services/googleDriveApi.ts';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';
import { 
  Cloud, 
  Folder, 
  FileSpreadsheet, 
  FileText, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  ArrowRight,
  Database,
  Check,
  Package,
  Layers,
  Sparkles,
  ClipboardList,
  FileCode,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { User } from 'firebase/auth';

const DEFAULT_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1K1WNrLSZcxW25eaHYP_skBC3g3lVAb5v?usp=drive_link';
const DEFAULT_FOLDER_ID = '1K1WNrLSZcxW25eaHYP_skBC3g3lVAb5v';

interface GoogleDriveProductSyncModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const GoogleDriveProductSyncModal: React.FC<GoogleDriveProductSyncModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { products, importProducts } = useApp();

  // Folder Configuration
  const [folderInput, setFolderInput] = useState<string>(DEFAULT_DRIVE_FOLDER_URL);
  const [activeFolderId, setActiveFolderId] = useState<string>(DEFAULT_FOLDER_ID);

  // Auth State
  const [googleUser, setGoogleUser] = useState<User | null>(() => getCurrentGoogleUser());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string>('');

  // Mode Selection
  const [activeMethod, setActiveMethod] = useState<'drive' | 'paste' | 'upload'>('drive');

  // Files in Drive Folder
  const [folderFiles, setFolderFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [scannedOnce, setScannedOnce] = useState(false);
  const [activeFileReading, setActiveFileReading] = useState<string | null>(null);

  // Parsed Products State
  const [parsedProducts, setParsedProducts] = useState<ParsedProductItem[]>([]);
  const [selectedProductIndexes, setSelectedProductIndexes] = useState<Set<number>>(new Set());
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [sourceFileName, setSourceFileName] = useState<string>('');

  // Manual Paste State
  const [pastedContent, setPastedContent] = useState<string>('');
  const [pasteError, setPasteError] = useState<string>('');

  // Local File Upload
  const localFileInputRef = useRef<HTMLInputElement>(null);

  // Export to Drive State
  const [isExportingToDrive, setIsExportingToDrive] = useState(false);

  // Global Notification / Toast
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    link?: string;
  } | null>(null);

  // Initialize Auth Listener
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

    getAccessToken().then((tok) => {
      if (tok) {
        setAccessToken(tok);
        setGoogleUser(getCurrentGoogleUser());
      }
    });

    return () => unsubscribe();
  }, []);

  // Update folder ID when folder input changes
  useEffect(() => {
    const extracted = extractDriveId(folderInput);
    if (extracted) {
      setActiveFolderId(extracted);
    }
  }, [folderInput]);

  // Handle Google Sign-in
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
          text: `Connected to Google Drive as ${res.user.email || 'User'}. You can now scan the folder!`,
        });
        // Auto-scan folder
        scanDriveFolder(res.accessToken, activeFolderId);
      }
    } catch (err: unknown) {
      console.error('Sign-in failed:', err);
      const msg = err instanceof Error ? err.message : 'Google Sign-in failed. Please try again.';
      setAuthError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Scan Google Drive Folder for product spreadsheets & files
  const scanDriveFolder = async (token: string, folderId: string) => {
    if (!token || !folderId) return;
    setIsLoadingFiles(true);
    setStatusMessage(null);
    try {
      const res = await listDriveFiles(token, {
        folderId,
        pageSize: 50,
      });

      setFolderFiles(res.files || []);
      setScannedOnce(true);

      if (!res.files || res.files.length === 0) {
        setStatusMessage({
          type: 'info',
          text: `Connected to folder (ID: ${folderId}), but no files were found inside yet. You can upload a file, or export your current catalog to it!`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Found ${res.files.length} file(s) in Drive folder. Click "Import & Preview" on any spreadsheet/CSV below.`,
        });
      }
    } catch (err: unknown) {
      console.error('Failed to scan Drive folder:', err);
      const msg = err instanceof Error ? err.message : 'Error scanning Drive folder';
      if (msg.includes('401') || msg.includes('token') || msg.includes('UNAUTHENTICATED')) {
        setAccessToken(null);
        setAccessTokenInMemory(null);
        setAuthError('Session expired. Please click Sign in with Google again.');
      } else if (msg.includes('404') || msg.includes('File not found')) {
        setStatusMessage({
          type: 'error',
          text: `Folder not found or inaccessible (ID: ${folderId}). Make sure your signed-in Google account has view permission.`,
        });
      } else {
        setStatusMessage({ type: 'error', text: msg });
      }
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Download and Parse file from Google Drive
  const handleSelectDriveFile = async (file: GoogleDriveFile) => {
    if (!accessToken) return;
    setActiveFileReading(file.id);
    setStatusMessage(null);
    try {
      const content = await downloadDriveFileContent(accessToken, file.id, file.mimeType);
      const parsed = parseProductCatalogFromText(content);

      if (parsed.length === 0) {
        setStatusMessage({
          type: 'error',
          text: `Could not parse any product rows from "${file.name}". Please ensure it has columns for Product Name and Wholesale/Retail prices.`,
        });
        return;
      }

      setParsedProducts(parsed);
      setSelectedProductIndexes(new Set(parsed.map((_, i) => i)));
      setSourceFileName(file.name);
      setStatusMessage({
        type: 'success',
        text: `✓ Parsed ${parsed.length} products from "${file.name}"! Review below and confirm.`,
      });
    } catch (err: unknown) {
      console.error('Failed to download/parse file:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to read file from Drive',
      });
    } finally {
      setActiveFileReading(null);
    }
  };

  // Handle Manual Paste
  const handleParsePastedData = () => {
    setPasteError('');
    if (!pastedContent.trim()) {
      setPasteError('Please paste some CSV, tab-separated table rows, or JSON first.');
      return;
    }

    const parsed = parseProductCatalogFromText(pastedContent);
    if (parsed.length === 0) {
      setPasteError('Could not recognize product rows. Please ensure you have headers like SKU, Name, Wholesale, Retail, Stock.');
      return;
    }

    setParsedProducts(parsed);
    setSelectedProductIndexes(new Set(parsed.map((_, i) => i)));
    setSourceFileName('Pasted Table Data');
    setStatusMessage({
      type: 'success',
      text: `✓ Successfully parsed ${parsed.length} products from pasted text!`,
    });
  };

  // Handle Local File Upload
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;
      const parsed = parseProductCatalogFromText(content);
      if (parsed.length === 0) {
        setStatusMessage({
          type: 'error',
          text: `Could not recognize product rows in "${file.name}".`,
        });
        return;
      }

      setParsedProducts(parsed);
      setSelectedProductIndexes(new Set(parsed.map((_, i) => i)));
      setSourceFileName(file.name);
      setStatusMessage({
        type: 'success',
        text: `✓ Parsed ${parsed.length} products from "${file.name}"!`,
      });
    };
    reader.readAsText(file);
    if (localFileInputRef.current) localFileInputRef.current.value = '';
  };

  // Apply Changes to AppContext
  const handleConfirmImport = () => {
    if (parsedProducts.length === 0) return;

    const itemsToImport = parsedProducts.filter((_, idx) => selectedProductIndexes.has(idx));
    if (itemsToImport.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Please select at least one product row to import.',
      });
      return;
    }

    const { added, updated } = importProducts(itemsToImport, importMode);

    setStatusMessage({
      type: 'success',
      text: `🎉 Successfully updated product catalog! Added ${added} new SKUs, updated ${updated} existing SKUs.`,
    });

    if (onSuccess) {
      setTimeout(() => onSuccess(), 1500);
    }
  };

  // Push / Export current depot catalog to the user's Drive folder
  const handleExportCurrentCatalogToDriveFolder = async () => {
    if (!accessToken || !activeFolderId) return;
    setIsExportingToDrive(true);
    setStatusMessage(null);
    try {
      const headers = [
        'SKU Code',
        'Product Name',
        'HSN Code',
        'Warehouse Stock (Units)',
        'Wholesale Trade Price (INR)',
        'Retail Consumer MRP (INR)',
        'Trade Wholesale Scheme',
        'Consumer Retail Offer',
        'Focus SKU Status',
        'Field Directive Note',
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
        escapeCsv(p.focusNote || ''),
      ].join(','));

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Product_Catalog_Master_${timestamp}.csv`;

      const uploaded = await uploadDriveFile(accessToken, {
        name: filename,
        mimeType: 'text/csv',
        content: csvContent,
        parentFolderId: activeFolderId,
        description: `Export of ${products.length} products from FMCG Distro OS.`,
      });

      setStatusMessage({
        type: 'success',
        text: `✓ Successfully saved current catalog (${products.length} SKUs) to this Drive folder as "${filename}"!`,
        link: uploaded.webViewLink,
      });

      // Refresh folder files list
      scanDriveFolder(accessToken, activeFolderId);
    } catch (err: unknown) {
      console.error('Failed to export catalog to Drive folder:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to export to Google Drive',
      });
    } finally {
      setIsExportingToDrive(false);
    }
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedProductIndexes.size === parsedProducts.length) {
      setSelectedProductIndexes(new Set());
    } else {
      setSelectedProductIndexes(new Set(parsedProducts.map((_, i) => i)));
    }
  };

  const toggleProductSelect = (idx: number) => {
    setSelectedProductIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div
      id="modal-google-drive-sync"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs font-mono"
    >
      <div className="bg-white border-4 border-black w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="bg-black text-white p-3.5 sm:p-4 flex items-center justify-between border-b-2 border-black flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 border border-white flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black uppercase text-sm sm:text-base tracking-wide flex items-center gap-2">
                Google Drive Product Details Sync & Importer
              </h2>
              <p className="text-[11px] text-neutral-300 font-sans">
                Sync depot inventory, wholesale rates & retail MRP directly from your Google Drive folder
              </p>
            </div>
          </div>
          <button
            id="btn-close-drive-sync-modal"
            onClick={onClose}
            className="w-8 h-8 bg-white hover:bg-neutral-200 text-black border-2 border-black flex items-center justify-center font-black text-sm cursor-pointer transition-none"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Target Drive Folder Ribbon */}
          <div className="bg-blue-50 border-2 border-blue-900 p-3.5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-700 flex-shrink-0" />
                <span className="font-black uppercase text-blue-950 text-xs">
                  Target Google Drive Folder:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://drive.google.com/drive/folders/${activeFolderId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-800 font-bold hover:underline bg-white px-2 py-0.5 border border-blue-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in Google Drive
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setFolderInput(DEFAULT_DRIVE_FOLDER_URL);
                    setActiveFolderId(DEFAULT_FOLDER_ID);
                  }}
                  className="text-[10px] text-neutral-600 hover:text-black underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                id="input-drive-folder-url"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="flex-1 border-2 border-black p-2 bg-white text-xs font-mono font-bold focus:outline-none focus:bg-amber-50"
              />
              <button
                type="button"
                id="btn-scan-folder"
                disabled={isLoadingFiles}
                onClick={() => {
                  if (accessToken) {
                    scanDriveFolder(accessToken, activeFolderId);
                  } else {
                    handleGoogleSignIn();
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs border-2 border-black flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                <span>{accessToken ? 'Scan Folder' : 'Connect & Scan'}</span>
              </button>
            </div>

            <div className="text-[10px] text-neutral-600 flex items-center justify-between">
              <span>Folder ID: <strong className="font-mono text-black">{activeFolderId || 'None detected'}</strong></span>
              <span>Current Catalog: <strong className="text-black font-bold">{products.length} Products</strong></span>
            </div>
          </div>

          {/* Status Message Banner */}
          {statusMessage && (
            <div
              className={`p-3 border-2 flex items-start justify-between gap-2 text-xs font-bold ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                  : statusMessage.type === 'error'
                  ? 'bg-red-50 border-red-600 text-red-950'
                  : 'bg-amber-50 border-amber-600 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              {statusMessage.link && (
                <a
                  href={statusMessage.link}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-blue-700 flex items-center gap-1 flex-shrink-0"
                >
                  View File <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Method Selector Tabs */}
          <div className="flex border-b-2 border-black gap-1">
            <button
              type="button"
              id="tab-method-drive"
              onClick={() => setActiveMethod('drive')}
              className={`px-3 py-2 text-xs font-black uppercase cursor-pointer border-t-2 border-x-2 border-black -mb-[2px] flex items-center gap-1.5 transition-none ${
                activeMethod === 'drive' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Google Drive Folder Files</span>
              {folderFiles.length > 0 && (
                <span className="ml-1 bg-black text-white text-[10px] px-1.5 py-0.2 rounded-xs">
                  {folderFiles.length}
                </span>
              )}
            </button>

            <button
              type="button"
              id="tab-method-upload"
              onClick={() => setActiveMethod('upload')}
              className={`px-3 py-2 text-xs font-black uppercase cursor-pointer border-t-2 border-x-2 border-black -mb-[2px] flex items-center gap-1.5 transition-none ${
                activeMethod === 'upload' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-700" />
              <span>2. Upload File (CSV / XLSX)</span>
            </button>

            <button
              type="button"
              id="tab-method-paste"
              onClick={() => setActiveMethod('paste')}
              className={`px-3 py-2 text-xs font-black uppercase cursor-pointer border-t-2 border-x-2 border-black -mb-[2px] flex items-center gap-1.5 transition-none ${
                activeMethod === 'paste' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-purple-700" />
              <span>3. Paste Spreadsheet Rows</span>
            </button>
          </div>

          {/* TAB 1: GOOGLE DRIVE DIRECT FOLDER INTEGRATION */}
          {activeMethod === 'drive' && (
            <div className="space-y-3 bg-neutral-50 p-3.5 border-2 border-black">
              {/* Auth status bar */}
              <div className="bg-white border border-neutral-300 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${googleUser ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-neutral-700">
                    Google Connection:{' '}
                    {googleUser ? (
                      <strong className="text-black font-bold">{googleUser.email || googleUser.displayName}</strong>
                    ) : (
                      <span className="text-amber-800 font-bold">Not Signed In</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {!googleUser ? (
                    <GoogleSignInButton
                      onClick={handleGoogleSignIn}
                      disabled={isLoggingIn}
                      label={isLoggingIn ? 'Connecting...' : 'Sign in to Access Drive Folder'}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await googleLogout();
                        setGoogleUser(null);
                        setAccessToken(null);
                        setFolderFiles([]);
                      }}
                      className="text-[11px] text-neutral-600 hover:text-black underline"
                    >
                      Switch Account
                    </button>
                  )}
                </div>
              </div>

              {authError && (
                <div className="p-2 bg-red-100 border border-red-400 text-red-900 font-bold text-xs">
                  ⚠️ {authError}
                </div>
              )}

              {/* Folder Files List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-neutral-900 text-xs">
                    Files Detected in Folder ({folderFiles.length}):
                  </span>
                  {accessToken && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="btn-export-to-drive-folder"
                        disabled={isExportingToDrive}
                        onClick={handleExportCurrentCatalogToDriveFolder}
                        className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-black border border-black text-[11px] font-bold uppercase flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Upload current products into this Drive folder"
                      >
                        <Upload className="w-3 h-3 text-blue-700" />
                        <span>{isExportingToDrive ? 'Exporting...' : 'Export Current Catalog to Folder'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => scanDriveFolder(accessToken, activeFolderId)}
                        className="px-2 py-1 bg-white hover:bg-neutral-100 border border-black text-[11px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Refresh</span>
                      </button>
                    </div>
                  )}
                </div>

                {isLoadingFiles ? (
                  <div className="p-8 text-center bg-white border border-neutral-300 text-neutral-600 font-bold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Connecting to Google Drive folder and scanning files...
                  </div>
                ) : folderFiles.length === 0 ? (
                  <div className="p-6 bg-white border border-neutral-300 text-center space-y-3">
                    <Folder className="w-8 h-8 text-neutral-400 mx-auto" />
                    <div>
                      <p className="font-bold text-neutral-800">No product files listed yet in this folder.</p>
                      <p className="text-[11px] text-neutral-500 max-w-md mx-auto mt-1">
                        If this folder is in your Google Drive, make sure you are signed in with the right Google account,
                        or use the <strong>Upload File</strong> or <strong>Paste Rows</strong> tabs to update products immediately.
                      </p>
                    </div>
                    {accessToken && (
                      <button
                        type="button"
                        onClick={handleExportCurrentCatalogToDriveFolder}
                        disabled={isExportingToDrive}
                        className="px-4 py-2 bg-black text-white hover:bg-neutral-800 text-xs font-black uppercase cursor-pointer"
                      >
                        Push Current Depot Catalog (3 Products) to this Folder
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="border border-neutral-300 bg-white max-h-48 overflow-y-auto divide-y divide-neutral-200">
                    {folderFiles.map((file) => {
                      const isSheet = file.mimeType.includes('spreadsheet') || file.name.endsWith('.csv') || file.name.endsWith('.xlsx');
                      return (
                        <div
                          key={file.id}
                          className="p-2.5 flex items-center justify-between hover:bg-neutral-50 gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isSheet ? (
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-neutral-900 block truncate text-xs" title={file.name}>
                                {file.name}
                              </span>
                              <span className="text-[10px] text-neutral-500">
                                {formatBytes(file.size)} | Modified: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 text-[10px] font-bold uppercase"
                              >
                                View
                              </a>
                            )}
                            <button
                              type="button"
                              id={`btn-import-file-${file.id}`}
                              disabled={activeFileReading === file.id}
                              onClick={() => handleSelectDriveFile(file)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white border border-black text-[10px] font-black uppercase cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                              <ArrowRight className="w-3 h-3" />
                              <span>{activeFileReading === file.id ? 'Reading...' : 'Import & Preview'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LOCAL FILE UPLOAD */}
          {activeMethod === 'upload' && (
            <div className="space-y-3 bg-neutral-50 p-4 border-2 border-black text-center">
              <input
                ref={localFileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,.json"
                onChange={handleLocalFileSelect}
                className="hidden"
                id="input-product-file"
              />
              <div className="border-2 border-dashed border-neutral-400 p-6 bg-white space-y-2">
                <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="font-bold text-neutral-900 text-xs">
                  Upload downloaded Google Sheet CSV, TSV, or JSON file
                </p>
                <p className="text-[11px] text-neutral-500">
                  Export from your Google Drive folder via: <em>File &gt; Download &gt; Comma-separated values (.csv)</em>
                </p>
                <button
                  type="button"
                  onClick={() => localFileInputRef.current?.click()}
                  className="mt-2 px-4 py-2 bg-black hover:bg-neutral-800 text-white font-black uppercase text-xs cursor-pointer border border-black"
                >
                  Choose File from Computer
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PASTE SPREADSHEET ROWS */}
          {activeMethod === 'paste' && (
            <div className="space-y-2.5 bg-neutral-50 p-3.5 border-2 border-black">
              <div className="flex items-center justify-between">
                <span className="font-black uppercase text-neutral-900 text-xs">
                  Copy & Paste Table Cells from Google Sheets:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPastedContent(
                      `SKU\tProduct Name\tStock\tWholesale Price\tRetail Price\tHSN\tWholesale Scheme\tRetail Offer\n` +
                      `OIL-001\tRefined Oil 1L Pouch\t200\t120\t140\t1515\tBuy 10 Cases Get 1 Free\tRs.15 Instant Discount\n` +
                      `ATA-010\tWheat Flour 10kg Bag\t100\t335\t380\t1101\t5% Extra Cash Discount\tFlat 10% Off on 2+ bags\n` +
                      `DET-001\tWashing Powder 1kg\t250\t75\t95\t3402\tBuy 24 Units Get 2 Free\tBuy 2 Get 1 Free\n` +
                      `TEA-001\tPremium CTC Tea 250g\t150\t85\t110\t0902\tBuy 12 Get 1 Free\tRs.10 Instant Discount`
                    );
                  }}
                  className="text-[10px] text-blue-700 font-bold hover:underline"
                >
                  Load Sample FMCG Table
                </button>
              </div>

              <textarea
                id="textarea-paste-products"
                rows={5}
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder="Paste tab-separated rows copied from your Google Sheet or CSV here..."
                className="w-full border-2 border-black p-2 font-mono text-xs bg-white focus:outline-none"
              />

              {pasteError && (
                <div className="p-2 bg-red-100 border border-red-400 text-red-900 font-bold text-xs">
                  ⚠️ {pasteError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  id="btn-parse-pasted"
                  onClick={handleParsePastedData}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-black uppercase text-xs border border-black cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Parse Product Data</span>
                </button>
              </div>
            </div>
          )}

          {/* PARSED PRODUCTS PREVIEW & COMMIT TABLE */}
          {parsedProducts.length > 0 && (
            <div className="border-2 border-black bg-white p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-neutral-300 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-700" />
                    <span className="font-black uppercase text-sm text-neutral-950">
                      Parsed Products Catalog ({parsedProducts.length} Items)
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500 block">
                    Source: <strong className="text-black">{sourceFileName}</strong> | Selected:{' '}
                    <strong className="text-emerald-700">{selectedProductIndexes.size} of {parsedProducts.length}</strong>
                  </span>
                </div>

                {/* Import Mode Radio Toggle */}
                <div className="flex items-center gap-3 bg-neutral-100 p-1.5 border border-black text-xs font-bold">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-black"
                    />
                    <span>Merge / Update Matching SKUs</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-black"
                    />
                    <span className="text-red-700">Replace Entire Catalog</span>
                  </label>
                </div>
              </div>

              {/* Products Table */}
              <div className="border border-neutral-400 overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead className="bg-black text-white sticky top-0 uppercase text-[10px]">
                    <tr>
                      <th className="p-2 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProductIndexes.size === parsedProducts.length && parsedProducts.length > 0}
                          onChange={toggleSelectAll}
                          className="accent-amber-400 cursor-pointer"
                        />
                      </th>
                      <th className="p-2 border-r border-neutral-700">SKU Code</th>
                      <th className="p-2 border-r border-neutral-700">Product Name</th>
                      <th className="p-2 border-r border-neutral-700 text-right">Wholesale (₹)</th>
                      <th className="p-2 border-r border-neutral-700 text-right">Retail MRP (₹)</th>
                      <th className="p-2 border-r border-neutral-700 text-center">Stock</th>
                      <th className="p-2 border-r border-neutral-700">Trade Scheme / Offer</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {parsedProducts.map((p, idx) => {
                      const isSelected = selectedProductIndexes.has(idx);
                      const existingMatch = products.find(
                        (ep) => ep.sku.toLowerCase() === p.sku.toLowerCase() || ep.name.toLowerCase() === p.name.toLowerCase()
                      );

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-neutral-50 ${!isSelected ? 'opacity-50 bg-neutral-50' : ''}`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleProductSelect(idx)}
                              className="accent-black cursor-pointer"
                            />
                          </td>
                          <td className="p-2 font-bold text-black border-r border-neutral-200 uppercase">
                            {p.sku}
                          </td>
                          <td className="p-2 font-bold text-neutral-900 border-r border-neutral-200">
                            {p.name}
                            {p.hsn && <span className="text-[9px] text-neutral-500 block">HSN: {p.hsn}</span>}
                          </td>
                          <td className="p-2 text-right font-bold text-neutral-900 border-r border-neutral-200">
                            ₹{p.wholesalePrice.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-800 border-r border-neutral-200">
                            ₹{p.retailPrice.toFixed(2)}
                          </td>
                          <td className="p-2 text-center font-bold border-r border-neutral-200">
                            {p.stock}
                          </td>
                          <td className="p-2 border-r border-neutral-200 text-[10px]">
                            {p.wholesaleScheme && (
                              <span className="text-amber-800 block truncate max-w-xs font-bold">
                                🎁 {p.wholesaleScheme}
                              </span>
                            )}
                            {p.retailOffer && (
                              <span className="text-emerald-700 block truncate max-w-xs">
                                🏷️ {p.retailOffer}
                              </span>
                            )}
                            {!p.wholesaleScheme && !p.retailOffer && <span className="text-neutral-400">—</span>}
                          </td>
                          <td className="p-2 text-center">
                            {existingMatch ? (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 text-[9px] font-bold uppercase border border-blue-300">
                                Updates SKU
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 text-[9px] font-bold uppercase border border-emerald-300">
                                New SKU
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Confirm Import Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-neutral-200">
                <div className="text-[11px] text-neutral-600">
                  Ready to update <strong>{selectedProductIndexes.size}</strong> product(s) into FMCG Distro OS.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedProducts([]);
                      setSelectedProductIndexes(new Set());
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-400 text-xs font-bold uppercase cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-import-products"
                    onClick={handleConfirmImport}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs border-2 border-black flex items-center gap-1.5 cursor-pointer shadow-md tracking-tight"
                  >
                    <Check className="w-4 h-4 text-white" />
                    <span>Confirm & Update Catalog</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-neutral-100 p-3 border-t-2 border-black flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-neutral-600 text-[11px]">
            Google Drive Link: <code className="bg-white px-1 py-0.5 border border-neutral-300">{DEFAULT_FOLDER_ID}</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-neutral-200 text-black border border-black font-bold uppercase cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
