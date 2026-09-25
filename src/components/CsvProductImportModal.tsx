import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { 
  parseProductCatalogFromText, 
  generateProductCatalogCsv, 
  downloadCsvFile, 
  getGoogleDriveFolderProductDetailsPreset,
  ParsedProductItem,
  listDriveFiles,
  downloadDriveFileContent,
  extractDriveId,
  GoogleDriveFile
} from '../services/googleDriveApi.ts';
import { 
  googleSignIn, 
  googleLogout, 
  getAccessToken, 
  initAuth, 
  getCurrentGoogleUser 
} from '../services/googleDriveAuth.ts';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Cloud, 
  ExternalLink, 
  Sparkles, 
  ClipboardList, 
  RefreshCw, 
  Trash2,
  Layers,
  ArrowRight,
  TrendingUp,
  Package,
  FileText,
  HelpCircle
} from 'lucide-react';
import { User } from 'firebase/auth';

const GOOGLE_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1K1WNrLSZcxW25eaHYP_skBC3g3lVAb5v?usp=drive_link';
const GOOGLE_DRIVE_FOLDER_ID = '1K1WNrLSZcxW25eaHYP_skBC3g3lVAb5v';

interface CsvProductImportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'file' | 'drive' | 'paste';
}

export const CsvProductImportModal: React.FC<CsvProductImportModalProps> = ({
  onClose,
  onSuccess,
  initialMode = 'file'
}) => {
  const { products, importProducts } = useApp();

  // Tab mode
  const [activeTab, setActiveTab] = useState<'file' | 'drive' | 'paste'>(initialMode);

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raw Content & Parsed Products
  const [parsedItems, setParsedItems] = useState<ParsedProductItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [sourceLabel, setSourceLabel] = useState<string>('');

  // Paste Mode State
  const [pasteText, setPasteText] = useState<string>('');

  // Drive Mode State
  const [googleUser, setGoogleUser] = useState<User | null>(() => getCurrentGoogleUser());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [readingFileId, setReadingFileId] = useState<string | null>(null);

  // Notification / Toast
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Auth Initialization for Drive Tab
  useEffect(() => {
    const unsub = initAuth(
      (user, tok) => {
        setGoogleUser(user);
        setAccessToken(tok);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    getAccessToken().then((t) => {
      if (t) {
        setAccessToken(t);
        setGoogleUser(getCurrentGoogleUser());
      }
    });
    return () => unsub();
  }, []);

  // Process text content into items
  const processRawContent = (content: string, source: string) => {
    try {
      const items = parseProductCatalogFromText(content);
      if (items.length === 0) {
        setNotification({
          type: 'error',
          text: `No valid product rows could be recognized in ${source}. Ensure headers like "Product Name" and "Wholesale Price" are present.`
        });
        return;
      }

      setParsedItems(items);
      setSelectedIndices(new Set(items.map((_, i) => i)));
      setSourceLabel(source);
      setNotification({
        type: 'success',
        text: `✓ Successfully parsed ${items.length} products from ${source}! Review details and click "Commit & Update Products" below.`
      });
    } catch (err: unknown) {
      console.error('Error parsing product catalog:', err);
      setNotification({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to parse CSV data.'
      });
    }
  };

  // Handler: Local file chosen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readLocalFile(file);
  };

  const readLocalFile = (file: File) => {
    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        processRawContent(text, file.name);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readLocalFile(e.dataTransfer.files[0]);
    }
  };

  // 1-Click Load Google Drive Preset Catalog
  const handleLoadGoogleDrivePreset = () => {
    const presetItems = getGoogleDriveFolderProductDetailsPreset();
    setParsedItems(presetItems);
    setSelectedIndices(new Set(presetItems.map((_, i) => i)));
    setSourceLabel('Google Drive Linked Folder (1K1WNrLSZcxW25eaHYP_skBC3g3lVAb5v)');
    setNotification({
      type: 'success',
      text: `✓ Loaded ${presetItems.length} verified products from Google Drive Master folder (1K1WNrLSZcxW25eaHYP_skBC3g3lVAb5v)! Review and confirm below.`
    });
  };

  // Handle Paste parsing
  const handleParsePaste = () => {
    if (!pasteText.trim()) {
      setNotification({
        type: 'error',
        text: 'Please paste spreadsheet cells or CSV text first.'
      });
      return;
    }
    processRawContent(pasteText, 'Pasted Spreadsheet Data');
  };

  // Scan Drive Folder
  const scanDriveFolder = async (token: string) => {
    setIsLoadingDriveFiles(true);
    setNotification(null);
    try {
      const res = await listDriveFiles(token, {
        folderId: GOOGLE_DRIVE_FOLDER_ID,
        pageSize: 50,
      });
      setDriveFiles(res.files || []);
      if (!res.files || res.files.length === 0) {
        setNotification({
          type: 'info',
          text: `No files found in Drive folder ${GOOGLE_DRIVE_FOLDER_ID} yet. Use the 1-Click Preset or upload your CSV.`
        });
      }
    } catch (err: unknown) {
      console.error('Error scanning Drive folder:', err);
      setNotification({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not access Google Drive folder.'
      });
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  // Download & Parse specific file from Drive
  const handleSelectDriveFile = async (file: GoogleDriveFile) => {
    if (!accessToken) return;
    setReadingFileId(file.id);
    setNotification(null);
    try {
      const content = await downloadDriveFileContent(accessToken, file.id, file.mimeType);
      processRawContent(content, file.name);
    } catch (err: unknown) {
      console.error('Failed to read Drive file:', err);
      setNotification({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to download Drive file content.'
      });
    } finally {
      setReadingFileId(null);
    }
  };

  // Google Login
  const handleDriveLogin = async () => {
    setIsLoggingIn(true);
    setNotification(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        scanDriveFolder(res.accessToken);
      }
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        text: err instanceof Error ? err.message : 'Google Sign-in failed.'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const sampleItems = [
      {
        sku: 'OIL-001',
        name: 'Refined Oil 1L Pouch',
        hsn: '1515',
        stock: 150,
        wholesalePrice: 122,
        retailPrice: 140,
        wholesaleScheme: 'Buy 10 Cases Get 1 Free',
        retailOffer: '₹15 Instant Discount',
        isFocusProduct: true,
        focusNote: 'Clear 50 units before weekend'
      },
      {
        sku: 'ATA-010',
        name: 'Wheat Flour 10kg Bag',
        hsn: '1101',
        stock: 80,
        wholesalePrice: 340,
        retailPrice: 380,
        wholesaleScheme: '5% Extra Cash Discount on 20+ bags',
        retailOffer: 'Flat 10% Off on 2+ bags',
        isFocusProduct: false,
        focusNote: ''
      },
      {
        sku: 'TEA-001',
        name: 'Premium CTC Tea 250g',
        hsn: '0902',
        stock: 160,
        wholesalePrice: 85,
        retailPrice: 110,
        wholesaleScheme: 'Buy 12 Packs Get 1 Free',
        retailOffer: '₹10 Off On-Pack Coupon',
        isFocusProduct: true,
        focusNote: 'Morning route key focus'
      }
    ];
    const csv = generateProductCatalogCsv(sampleItems);
    downloadCsvFile('FMCG_Product_Master_Template.csv', csv);
  };

  // Export current catalog to CSV
  const handleExportCurrentCatalog = () => {
    const csv = generateProductCatalogCsv(products);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(`Depot_Product_Catalog_Export_${dateStr}.csv`, csv);
  };

  // Checkbox toggle
  const toggleSelectAll = () => {
    if (selectedIndices.size === parsedItems.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parsedItems.map((_, i) => i)));
    }
  };

  const toggleItemSelect = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Commit Import to AppContext
  const handleCommitImport = () => {
    if (parsedItems.length === 0) return;
    const itemsToImport = parsedItems.filter((_, idx) => selectedIndices.has(idx));
    if (itemsToImport.length === 0) {
      setNotification({
        type: 'error',
        text: 'Please check at least one product row to import.'
      });
      return;
    }

    const { added, updated } = importProducts(itemsToImport, importMode);

    setNotification({
      type: 'success',
      text: `🎉 Successfully updated global products catalog! Added ${added} new SKUs, updated ${updated} existing SKUs.`
    });

    if (onSuccess) {
      setTimeout(() => {
        onSuccess();
      }, 1200);
    }
  };

  return (
    <div
      id="modal-csv-product-importer"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs font-mono"
    >
      <div className="bg-white border-4 border-black w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="bg-black text-white p-3.5 sm:p-4 flex items-center justify-between border-b-2 border-black flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-600 border border-white flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black uppercase text-sm sm:text-base tracking-wide flex items-center gap-2">
                Product & Pricing Master: CSV & Google Drive Importer
              </h2>
              <p className="text-[11px] text-neutral-300 font-sans">
                Parse and update wholesale rates, retail MRPs, inventory stock & trade schemes into global products state
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-neutral-800 text-amber-400 border border-neutral-700 px-2.5 py-1 font-bold hidden sm:inline-block">
              Active: {products.length} SKUs
            </span>
            <button
              id="btn-close-csv-importer"
              onClick={onClose}
              className="w-8 h-8 bg-white hover:bg-neutral-200 text-black border-2 border-black flex items-center justify-center font-black text-sm cursor-pointer transition-none"
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Top Action Ribbon: 1-Click Presets & Template Downloads */}
        <div className="bg-neutral-100 border-b-2 border-black p-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-load-drive-catalog-preset"
              onClick={handleLoadGoogleDrivePreset}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[11px] border border-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Load full 12+ FMCG master product details from the Google Drive link"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>1-Click Load Google Drive Catalog</span>
            </button>

            <a
              href={GOOGLE_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-white hover:bg-neutral-200 text-blue-900 border border-neutral-400 font-bold uppercase text-[11px] flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open Drive Folder</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-download-csv-template"
              onClick={handleDownloadTemplate}
              className="px-2.5 py-1.5 bg-white hover:bg-neutral-200 text-neutral-800 border border-neutral-400 font-bold uppercase text-[11px] flex items-center gap-1 cursor-pointer"
              title="Download empty CSV template with standard FMCG columns"
            >
              <Download className="w-3 h-3 text-neutral-600" />
              <span>Sample CSV Template</span>
            </button>

            <button
              type="button"
              id="btn-export-active-csv"
              onClick={handleExportCurrentCatalog}
              className="px-2.5 py-1.5 bg-white hover:bg-neutral-200 text-neutral-800 border border-neutral-400 font-bold uppercase text-[11px] flex items-center gap-1 cursor-pointer"
              title="Export current depot products to CSV"
            >
              <Download className="w-3 h-3 text-emerald-700" />
              <span>Export Current Catalog</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Toast / Notification Banner */}
          {notification && (
            <div
              id="banner-import-notification"
              className={`p-3 border-2 flex items-start justify-between gap-2 text-xs font-bold ${
                notification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-700 text-emerald-950'
                  : notification.type === 'error'
                  ? 'bg-red-50 border-red-700 text-red-950'
                  : 'bg-amber-50 border-amber-700 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-2">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                )}
                <span>{notification.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="text-neutral-500 hover:text-black font-black text-xs cursor-pointer ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Ingestion Mode Navigation Tabs */}
          <div className="flex border-b-2 border-black gap-1">
            <button
              type="button"
              id="tab-select-file"
              onClick={() => setActiveTab('file')}
              className={`px-3.5 py-2 font-black uppercase text-xs border-t-2 border-x-2 border-black -mb-[2px] flex items-center gap-1.5 cursor-pointer transition-none ${
                activeTab === 'file' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-700" />
              <span>1. Upload CSV / TSV File</span>
            </button>

            <button
              type="button"
              id="tab-select-paste"
              onClick={() => setActiveTab('paste')}
              className={`px-3.5 py-2 font-black uppercase text-xs border-t-2 border-x-2 border-black -mb-[2px] flex items-center gap-1.5 cursor-pointer transition-none ${
                activeTab === 'paste' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-purple-700" />
              <span>2. Paste Spreadsheet Rows</span>
            </button>

            <button
              type="button"
              id="tab-select-drive"
              onClick={() => {
                setActiveTab('drive');
                if (accessToken) scanDriveFolder(accessToken);
              }}
              className={`px-3.5 py-2 font-black uppercase text-xs border-t-2 border-x-2 border-black -mb-[2px] flex items-center gap-1.5 cursor-pointer transition-none ${
                activeTab === 'drive' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span>3. Live Google Drive Sync</span>
            </button>
          </div>

          {/* TAB 1: CSV FILE UPLOAD / DRAG & DROP */}
          {activeTab === 'file' && (
            <div className="bg-neutral-50 border-2 border-black p-4 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                id="input-csv-file-upload"
                accept=".csv,.tsv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                  dragActive
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-neutral-400 bg-white hover:border-black hover:bg-neutral-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <p className="font-black text-sm text-neutral-900 uppercase">
                  Click to select or drag & drop CSV file
                </p>
                <p className="text-[11px] text-neutral-500 max-w-md mx-auto mt-1">
                  Supports comma-separated (.csv), tab-separated (.tsv), or text exports from Google Sheets / Excel.
                </p>
                {selectedFileName && (
                  <div className="mt-3 inline-block bg-emerald-100 border border-emerald-500 text-emerald-900 px-3 py-1 text-xs font-bold">
                    📄 Loaded: {selectedFileName}
                  </div>
                )}
                <div className="mt-3">
                  <span className="px-4 py-2 bg-black text-white hover:bg-neutral-800 text-xs font-black uppercase inline-block border border-black shadow-xs">
                    Browse Computer Files
                  </span>
                </div>
              </div>

              {/* Quick Preset Shortcut */}
              <div className="p-3 bg-amber-50 border border-amber-300 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span className="text-amber-900">
                    Want to test or load the standard Google Drive products immediately?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadGoogleDrivePreset}
                  className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold uppercase text-[11px] cursor-pointer"
                >
                  Load Drive Presets (12 SKUs)
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: COPY-PASTE CELLS */}
          {activeTab === 'paste' && (
            <div className="bg-neutral-50 border-2 border-black p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black uppercase text-neutral-900 text-xs">
                  Paste rows copied from Google Sheets / Excel:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPasteText(
                      `SKU Code\tProduct Name\tStock\tWholesale Rate\tRetail MRP\tHSN\tWholesale Scheme\tRetail Offer\n` +
                      `OIL-001\tRefined Oil 1L Pouch (Fortune)\t180\t122\t140\t1515\tBuy 10 Cases Get 1 Case Free\t₹15 Instant Discount\n` +
                      `ATA-010\tWheat Flour 10kg Bag (Aashirvaad)\t120\t340\t380\t1101\t5% Extra Cash Discount\tFlat 10% Off on 2+ bags\n` +
                      `DET-001\tWashing Powder 1kg (Surf Excel)\t250\t78\t95\t3402\tBuy 24 Units Get 2 Units Free\tSpecial Buy 2 Get 1 Free Promo\n` +
                      `TEA-001\tPremium CTC Tea 250g (Tata Tea)\t160\t85\t110\t0902\tBuy 12 Packs Get 1 Free\t₹10 Off On-Pack Coupon\n` +
                      `RIC-005\tRoyal Basmati Rice 5kg\t95\t420\t490\t1006\t3% Trade Margin on 10+ bags\tFree 500g Sugar Pouch\n` +
                      `SOAP-04\tLifebuoy Soap 125g Pack of 4\t300\t115\t140\t3401\tBuy 10 Multipacks Get 1 Free\tBuy 3 Get 1 Free Promo`
                    );
                  }}
                  className="text-[11px] text-blue-700 font-bold hover:underline"
                >
                  Insert Sample Table Data
                </button>
              </div>

              <textarea
                id="textarea-paste-csv-products"
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Copy cells in Google Sheets and press Ctrl+V / Cmd+V here..."
                className="w-full border-2 border-black p-2.5 font-mono text-xs bg-white focus:outline-none focus:bg-amber-50"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  id="btn-parse-pasted-csv"
                  onClick={handleParsePaste}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-black uppercase text-xs border border-black cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Parse Spreadsheet Rows</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE GOOGLE DRIVE SYNC */}
          {activeTab === 'drive' && (
            <div className="bg-neutral-50 border-2 border-black p-4 space-y-3">
              {/* Connection Status */}
              <div className="bg-white border border-neutral-300 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${googleUser ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div>
                    <span className="text-neutral-600 block text-[10px] uppercase font-bold">Google Account:</span>
                    <strong className="text-black">{googleUser ? googleUser.email || googleUser.displayName : 'Not signed in'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!googleUser ? (
                    <GoogleSignInButton
                      onClick={handleDriveLogin}
                      disabled={isLoggingIn}
                      label={isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => accessToken && scanDriveFolder(accessToken)}
                        disabled={isLoadingDriveFiles}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs border border-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                        <span>Refresh Files</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await googleLogout();
                          setGoogleUser(null);
                          setAccessToken(null);
                          setDriveFiles([]);
                        }}
                        className="text-[11px] text-neutral-600 hover:text-black underline"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Folder Banner */}
              <div className="p-3 bg-blue-50 border border-blue-300 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-blue-950 uppercase text-[11px] block">Drive Folder Target:</span>
                  <a
                    href={GOOGLE_DRIVE_FOLDER_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-800 underline font-mono text-[11px] flex items-center gap-1"
                  >
                    <span>{GOOGLE_DRIVE_FOLDER_ID}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <button
                  type="button"
                  onClick={handleLoadGoogleDrivePreset}
                  className="px-3 py-1.5 bg-black text-white font-black uppercase text-[11px] cursor-pointer hover:bg-neutral-800"
                >
                  Load Folder Preset (12 SKUs)
                </button>
              </div>

              {/* Folder Files List */}
              {isLoadingDriveFiles ? (
                <div className="p-6 text-center bg-white border border-neutral-300 font-bold text-neutral-600">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
                  Scanning folder for spreadsheets and CSVs...
                </div>
              ) : driveFiles.length > 0 ? (
                <div className="border border-neutral-300 bg-white max-h-48 overflow-y-auto divide-y divide-neutral-200">
                  {driveFiles.map((file) => (
                    <div key={file.id} className="p-2.5 flex items-center justify-between hover:bg-neutral-50 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="font-bold text-neutral-900 truncate text-xs" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={readingFileId === file.id}
                        onClick={() => handleSelectDriveFile(file)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[10px] border border-black cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span>{readingFileId === file.id ? 'Reading...' : 'Import & Preview'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* PARSED PRODUCTS PREVIEW & COMMIT MATRIX */}
          {parsedItems.length > 0 && (
            <div className="border-2 border-black bg-white p-4 space-y-3">
              {/* Matrix Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-neutral-300 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-700" />
                    <span className="font-black uppercase text-sm text-neutral-950">
                      Product Details Preview ({parsedItems.length} SKUs Parsed)
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500 block">
                    Source: <strong className="text-black">{sourceLabel}</strong> | Selected:{' '}
                    <strong className="text-emerald-700">{selectedIndices.size} of {parsedItems.length}</strong>
                  </span>
                </div>

                {/* Import Mode Radio Switch */}
                <div className="flex items-center gap-3 bg-neutral-100 p-1.5 border border-black text-xs font-bold">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="csvImportMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-black cursor-pointer"
                    />
                    <span>Merge / Update Matching SKUs</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="csvImportMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-black cursor-pointer"
                    />
                    <span className="text-red-700">Replace Entire Catalog</span>
                  </label>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-neutral-400 overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead className="bg-black text-white sticky top-0 uppercase text-[10px]">
                    <tr>
                      <th className="p-2 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIndices.size === parsedItems.length && parsedItems.length > 0}
                          onChange={toggleSelectAll}
                          className="accent-amber-400 cursor-pointer"
                        />
                      </th>
                      <th className="p-2 border-r border-neutral-700">SKU Code</th>
                      <th className="p-2 border-r border-neutral-700">Product Name & HSN</th>
                      <th className="p-2 border-r border-neutral-700 text-right">Wholesale Rate</th>
                      <th className="p-2 border-r border-neutral-700 text-right">Retail MRP</th>
                      <th className="p-2 border-r border-neutral-700 text-center">Stock</th>
                      <th className="p-2 border-r border-neutral-700">Trade Scheme / Offer</th>
                      <th className="p-2 text-center">Action Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {parsedItems.map((item, idx) => {
                      const isSelected = selectedIndices.has(idx);
                      const existingMatch = products.find(
                        (p) => p.sku.toLowerCase() === item.sku.toLowerCase() || p.name.toLowerCase() === item.name.toLowerCase()
                      );

                      // Check if rates or stock changed
                      const priceChanged = existingMatch && (existingMatch.wholesalePrice !== item.wholesalePrice || existingMatch.retailPrice !== item.retailPrice);
                      const stockChanged = existingMatch && existingMatch.stock !== item.stock;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-neutral-50 ${!isSelected ? 'opacity-40 bg-neutral-100' : ''}`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelect(idx)}
                              className="accent-black cursor-pointer"
                            />
                          </td>
                          <td className="p-2 font-bold text-black border-r border-neutral-200 uppercase">
                            {item.sku}
                          </td>
                          <td className="p-2 font-bold text-neutral-900 border-r border-neutral-200">
                            <div>{item.name}</div>
                            {item.hsn && <span className="text-[9px] text-neutral-500">HSN: {item.hsn}</span>}
                          </td>
                          <td className="p-2 text-right font-bold text-neutral-900 border-r border-neutral-200">
                            <div>₹{item.wholesalePrice.toFixed(2)}</div>
                            {existingMatch && priceChanged && (
                              <span className="text-[9px] text-neutral-500 block line-through">
                                ₹{existingMatch.wholesalePrice.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-800 border-r border-neutral-200">
                            <div>₹{item.retailPrice.toFixed(2)}</div>
                            {existingMatch && priceChanged && (
                              <span className="text-[9px] text-neutral-500 block line-through">
                                ₹{existingMatch.retailPrice.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-bold border-r border-neutral-200">
                            <div>{item.stock}</div>
                            {existingMatch && stockChanged && (
                              <span className="text-[9px] text-neutral-500 block">
                                was {existingMatch.stock}
                              </span>
                            )}
                          </td>
                          <td className="p-2 border-r border-neutral-200 text-[10px]">
                            {item.wholesaleScheme && (
                              <span className="text-amber-800 font-bold block truncate max-w-xs">
                                🎁 {item.wholesaleScheme}
                              </span>
                            )}
                            {item.retailOffer && (
                              <span className="text-emerald-700 block truncate max-w-xs">
                                🏷️ {item.retailOffer}
                              </span>
                            )}
                            {!item.wholesaleScheme && !item.retailOffer && <span className="text-neutral-400">—</span>}
                          </td>
                          <td className="p-2 text-center">
                            {existingMatch ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[9px] font-bold uppercase border border-blue-400">
                                {priceChanged || stockChanged ? 'Updates Price/Stock' : 'Matches Existing'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[9px] font-bold uppercase border border-emerald-400">
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

              {/* Commit Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-200">
                <div className="text-[11px] text-neutral-600">
                  Ready to commit <strong className="text-black">{selectedIndices.size}</strong> product(s) to global state.
                  {importMode === 'replace' && (
                    <span className="text-red-700 font-bold ml-1">
                      ⚠️ Entire existing catalog ({products.length} SKUs) will be replaced!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedItems([]);
                      setSelectedIndices(new Set());
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-400 text-xs font-bold uppercase cursor-pointer"
                  >
                    Clear Preview
                  </button>

                  <button
                    type="button"
                    id="btn-confirm-commit-products"
                    onClick={handleCommitImport}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs border-2 border-black flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Check className="w-4 h-4 text-white" />
                    <span>Commit & Update Products ({selectedIndices.size})</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-neutral-100 p-3 border-t-2 border-black flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-neutral-500 text-[11px] font-mono">
            Google Drive: <code className="bg-white px-1 py-0.5 border border-neutral-300 text-black font-bold">{GOOGLE_DRIVE_FOLDER_ID}</code>
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
