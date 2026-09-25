/**
 * Google Drive v3 Client-Side API Utility
 * Uses OAuth 2.0 Bearer tokens in memory for Drive operations.
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  trashed?: boolean;
  parents?: string[];
}

export interface ListFilesOptions {
  query?: string;
  folderId?: string;
  pageSize?: number;
  pageToken?: string;
  includeTrashed?: boolean;
}

export interface ListFilesResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

export interface UploadFileOptions {
  name: string;
  mimeType: string;
  content: string | Blob;
  parentFolderId?: string;
  description?: string;
}

/**
 * List files from user's Google Drive
 */
export async function listDriveFiles(
  accessToken: string,
  options: ListFilesOptions = {}
): Promise<ListFilesResponse> {
  const params = new URLSearchParams();
  params.set('pageSize', String(options.pageSize || 50));
  params.set('fields', 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, parents, trashed)');
  params.set('orderBy', 'folder,modifiedTime desc');

  const qParts: string[] = [];
  if (!options.includeTrashed) {
    qParts.push('trashed = false');
  }
  if (options.folderId) {
    qParts.push(`'${options.folderId}' in parents`);
  }
  if (options.query && options.query.trim()) {
    const cleanQ = options.query.replace(/'/g, "\\'");
    qParts.push(`name contains '${cleanQ}'`);
  }

  if (qParts.length > 0) {
    params.set('q', qParts.join(' and '));
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Google Drive API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new folder in Google Drive
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<GoogleDriveFile> {
  const metadata: Record<string, unknown> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to create folder: ${response.status}`);
  }

  return response.json();
}

/**
 * Find or create a specific folder by name
 */
export async function findOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<GoogleDriveFile> {
  let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
  if (parentFolderId) {
    q += ` and '${parentFolderId}' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink)&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
  }

  return createDriveFolder(accessToken, folderName, parentFolderId);
}

/**
 * Upload a file (JSON, CSV, PDF, text, image) using multipart upload
 */
export async function uploadDriveFile(
  accessToken: string,
  options: UploadFileOptions
): Promise<GoogleDriveFile> {
  const boundary = `-------FMCG_DRIVE_UPLOAD_BOUNDARY_${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: Record<string, unknown> = {
    name: options.name,
    mimeType: options.mimeType,
  };

  if (options.parentFolderId) {
    metadata.parents = [options.parentFolderId];
  }
  if (options.description) {
    metadata.description = options.description;
  }

  let body: Blob;

  if (typeof options.content === 'string') {
    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${options.mimeType}\r\n\r\n` +
      options.content +
      closeDelimiter;

    body = new Blob([multipartRequestBody], { type: `multipart/related; boundary=${boundary}` });
  } else {
    // Blob/Binary content
    const metadataPart =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${options.mimeType}\r\n\r\n`;

    const closePart = closeDelimiter;
    body = new Blob([metadataPart, options.content, closePart], {
      type: `multipart/related; boundary=${boundary}`,
    });
  }

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to upload file to Google Drive: ${response.status}`);
  }

  return response.json();
}

/**
 * Move file to trash in Google Drive (Destructive operation - requires confirmation!)
 */
export async function trashDriveFile(accessToken: string, fileId: string): Promise<GoogleDriveFile> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to trash file: ${response.status}`);
  }

  return response.json();
}

/**
 * Permanently delete file from Google Drive (Destructive operation - requires confirmation!)
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to delete file: ${response.status}`);
  }
}

/**
 * Helper: Format byte sizes into readable KB / MB
 */
export function formatBytes(bytes?: string | number): string {
  if (!bytes) return '—';
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num)) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract folder or file ID from a Google Drive URL or raw ID
 */
export function extractDriveId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Match drive.google.com/drive/folders/<id>
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  // Match /d/<id>/
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch) return dMatch[1];

  // Match id query parameter ?id=<id>
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];

  // If already an ID (alphanumeric, dashes, underscores, typically 25-45 chars)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Download file content as text from Google Drive
 * Supports Google Sheets export to CSV and raw files (CSV, JSON, TXT)
 */
export async function downloadDriveFileContent(
  accessToken: string,
  fileId: string,
  mimeType?: string
): Promise<string> {
  let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  // If this is a Google Sheet, export as CSV
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
  } else if (mimeType === 'application/vnd.google-apps.document') {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Failed to download file (${response.status}): ${errText || response.statusText}`);
  }

  return response.text();
}

/**
 * Parse CSV, TSV, or JSON text into Product catalog objects
 */
export interface ParsedProductItem {
  sku: string;
  name: string;
  stock: number;
  retailPrice: number;
  wholesalePrice: number;
  hsn: string;
  wholesaleScheme: string;
  retailOffer: string;
  isFocusProduct: boolean;
  focusNote: string;
}

export function parseProductCatalogFromText(content: string): ParsedProductItem[] {
  // Strip UTF-8 BOM if present
  let cleanContent = content.replace(/^\uFEFF/, '').trim();
  if (!cleanContent) return [];

  // Try JSON parsing first if it starts with [ or {
  if (cleanContent.startsWith('[') || (cleanContent.startsWith('{') && cleanContent.includes('products'))) {
    try {
      const parsed = JSON.parse(cleanContent);
      const items = Array.isArray(parsed) ? parsed : (parsed.products || parsed.items || []);
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item: any, idx: number) => ({
          sku: String(item.sku || item.code || item.itemCode || `SKU-${idx + 101}`).trim().toUpperCase(),
          name: String(item.name || item.productName || item.title || item.description || `Product ${idx + 1}`).trim(),
          stock: Number(item.stock || item.quantity || item.units || item.qty || 0),
          retailPrice: Number(item.retailPrice || item.mrp || item.price || 0),
          wholesalePrice: Number(item.wholesalePrice || item.rate || item.tradePrice || item.dp || 0),
          hsn: String(item.hsn || item.hsnCode || '2106').trim(),
          wholesaleScheme: String(item.wholesaleScheme || item.scheme || item.tradeOffer || '').trim(),
          retailOffer: String(item.retailOffer || item.offer || item.consumerOffer || '').trim(),
          isFocusProduct: Boolean(item.isFocusProduct || item.focus || item.isFocus),
          focusNote: String(item.focusNote || item.note || '').trim(),
        }));
      }
    } catch {
      // Continue to CSV parsing if JSON parse failed
    }
  }

  // Parse CSV or TSV
  const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Determine delimiter: tab, semicolon, or comma
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';
  else if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';

  // Helper to split line taking quotes into account
  const splitLine = (line: string, delim: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delim && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headerRow = splitLine(lines[0], delimiter).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Column index finders with expansive synonyms
  const findCol = (patterns: string[]): number => {
    return headerRow.findIndex((col) => patterns.some((p) => col.includes(p)));
  };

  const skuCol = findCol(['sku', 'itemcode', 'productcode', 'code', 'barcode', 'partno']);
  const nameCol = findCol(['name', 'itemname', 'productname', 'title', 'description', 'item', 'particulars']);
  const retailCol = findCol(['mrp', 'retail', 'retailprice', 'consumerprice', 'sp', 'sellingprice', 'maxretail']);
  const wholesaleCol = findCol(['wholesale', 'wholesaleprice', 'tradeprice', 'rate', 'dp', 'dealer', 'cost', 'traderate']);
  const stockCol = findCol(['stock', 'qty', 'quantity', 'units', 'inventory', 'balance', 'openingstock']);
  const hsnCol = findCol(['hsn', 'hsncode', 'taxcode']);
  const schemeCol = findCol(['scheme', 'wholesalescheme', 'tradeoffer', 'b2boffer', 'dealerscheme']);
  const offerCol = findCol(['retailoffer', 'consumeroffer', 'offer', 'promo', 'discount', 'deal']);
  const focusCol = findCol(['focus', 'priority', 'isfocus', 'star']);
  const noteCol = findCol(['note', 'focusnote', 'remarks', 'directive', 'comment']);

  const parsedItems: ParsedProductItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitLine(lines[i], delimiter);
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rawName = nameCol >= 0 && row[nameCol] ? row[nameCol] : (row[1] || row[0] || `Product ${i}`);
    if (!rawName || rawName.trim().length === 0) continue;

    const rawSku = skuCol >= 0 && row[skuCol] ? row[skuCol] : `SKU-${100 + i}`;
    const rawWholesale = wholesaleCol >= 0 && row[wholesaleCol] ? parseFloat(row[wholesaleCol].replace(/[^0-9.]/g, '')) : 0;
    const rawRetail = retailCol >= 0 && row[retailCol] ? parseFloat(row[retailCol].replace(/[^0-9.]/g, '')) : (rawWholesale ? rawWholesale * 1.15 : 0);
    const rawStock = stockCol >= 0 && row[stockCol] ? parseInt(row[stockCol].replace(/[^0-9]/g, ''), 10) : 50;
    const rawHsn = hsnCol >= 0 && row[hsnCol] ? row[hsnCol] : '2106';
    const rawScheme = schemeCol >= 0 && row[schemeCol] ? row[schemeCol] : '';
    const rawOffer = offerCol >= 0 && row[offerCol] ? row[offerCol] : '';
    const rawFocus = focusCol >= 0 && row[focusCol] ? ['true', 'yes', '1', 'y', 'true'].includes(row[focusCol].toLowerCase()) : false;
    const rawNote = noteCol >= 0 && row[noteCol] ? row[noteCol] : '';

    parsedItems.push({
      sku: rawSku.trim().toUpperCase(),
      name: rawName.trim(),
      wholesalePrice: isNaN(rawWholesale) ? 0 : Math.max(0, rawWholesale),
      retailPrice: isNaN(rawRetail) ? 0 : Math.max(0, rawRetail),
      stock: isNaN(rawStock) ? 0 : Math.max(0, rawStock),
      hsn: rawHsn.trim() || '2106',
      wholesaleScheme: rawScheme.trim(),
      retailOffer: rawOffer.trim(),
      isFocusProduct: rawFocus,
      focusNote: rawNote.trim(),
    });
  }

  return parsedItems;
}

/**
 * Generate CSV formatted text from a product list
 */
export function generateProductCatalogCsv(products: {
  sku: string;
  name: string;
  hsn?: string;
  stock: number;
  wholesalePrice: number;
  retailPrice: number;
  wholesaleScheme?: string;
  retailOffer?: string;
  isFocusProduct?: boolean;
  focusNote?: string;
}[]): string {
  const headers = [
    'SKU Code',
    'Product Name',
    'HSN Code',
    'Stock Units',
    'Wholesale Rate (INR)',
    'Retail MRP (INR)',
    'Wholesale Scheme',
    'Retail Offer',
    'Focus Product (YES/NO)',
    'Directive Note',
  ];

  const escapeCsv = (val: string | number | boolean | undefined | null) => {
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
    escapeCsv(p.wholesaleScheme || ''),
    escapeCsv(p.retailOffer || ''),
    escapeCsv(p.isFocusProduct ? 'YES' : 'NO'),
    escapeCsv(p.focusNote || ''),
  ].join(','));

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Client-side trigger browser file download for CSV
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Pre-configured Google Drive Product Details catalog representing the depot master
 * from folder https://drive.google.com/drive/folders/1K1WNrLSZcxW25eaHYP_skBC3g3lVAb5v
 */
export function getGoogleDriveFolderProductDetailsPreset(): ParsedProductItem[] {
  return [
    {
      sku: 'OIL-001',
      name: 'Refined Oil 1L Pouch (Fortune Sunlite)',
      stock: 180,
      wholesalePrice: 122,
      retailPrice: 140,
      hsn: '1515',
      wholesaleScheme: 'Buy 10 Cases Get 1 Case Free',
      retailOffer: '₹15 Instant Discount',
      isFocusProduct: true,
      focusNote: 'Clear stock before weekend - Extra 2% incentive',
    },
    {
      sku: 'ATA-010',
      name: 'Wheat Flour 10kg Bag (Aashirvaad Shudh Chakki)',
      stock: 120,
      wholesalePrice: 340,
      retailPrice: 380,
      hsn: '1101',
      wholesaleScheme: '5% Extra Cash Discount on 20+ bags',
      retailOffer: 'Flat 10% Off on 2+ bags',
      isFocusProduct: false,
      focusNote: '',
    },
    {
      sku: 'DET-001',
      name: 'Washing Powder 1kg (Surf Excel Quick Wash)',
      stock: 250,
      wholesalePrice: 78,
      retailPrice: 95,
      hsn: '3402',
      wholesaleScheme: 'Buy 24 Units Get 2 Units Free + Display Bonus',
      retailOffer: 'Special Buy 2 Get 1 Free Promo',
      isFocusProduct: true,
      focusNote: 'Push to all newly mapped grocery stores',
    },
    {
      sku: 'TEA-001',
      name: 'Premium CTC Tea 250g (Tata Tea Gold)',
      stock: 160,
      wholesalePrice: 85,
      retailPrice: 110,
      hsn: '0902',
      wholesaleScheme: 'Buy 12 Packs Get 1 Pack Free',
      retailOffer: '₹10 Off On-Pack Coupon',
      isFocusProduct: true,
      focusNote: 'Key morning route focus item',
    },
    {
      sku: 'RIC-005',
      name: 'Royal Basmati Rice 5kg (Daawat Rozana Gold)',
      stock: 95,
      wholesalePrice: 420,
      retailPrice: 490,
      hsn: '1006',
      wholesaleScheme: '3% Trade Margin on 10+ bags',
      retailOffer: 'Free 500g Sugar Pouch with each pack',
      isFocusProduct: false,
      focusNote: 'High margin staple',
    },
    {
      sku: 'DAL-001',
      name: 'Premium Toor Dal 1kg (Tata Sampann Unpolished)',
      stock: 140,
      wholesalePrice: 145,
      retailPrice: 170,
      hsn: '0713',
      wholesaleScheme: 'Buy 25kg Get 1kg Free Wholesale',
      retailOffer: 'Flat ₹15 Off at checkout',
      isFocusProduct: false,
      focusNote: 'High velocity grocery SKU',
    },
    {
      sku: 'SOAP-04',
      name: 'Lifebuoy Total Soap 125g (Pack of 4)',
      stock: 300,
      wholesalePrice: 115,
      retailPrice: 140,
      hsn: '3401',
      wholesaleScheme: 'Buy 10 Multipacks Get 1 Free',
      retailOffer: 'Buy 3 Get 1 Free Promo inside pack',
      isFocusProduct: true,
      focusNote: 'Sanitation campaign focus SKU',
    },
    {
      sku: 'BIS-020',
      name: 'Parle-G Glucose Biscuits 800g Family Pack',
      stock: 220,
      wholesalePrice: 65,
      retailPrice: 80,
      hsn: '1905',
      wholesaleScheme: 'Buy 24 Boxes Get 2 Boxes Free',
      retailOffer: '20% Extra Free inside pack',
      isFocusProduct: false,
      focusNote: 'Daily consumer footfall driver',
    },
    {
      sku: 'SPICE-01',
      name: 'Catch Turmeric Powder 500g Pouch',
      stock: 110,
      wholesalePrice: 88,
      retailPrice: 115,
      hsn: '0910',
      wholesaleScheme: '5% Spot Cash Payment Rebate',
      retailOffer: 'Festive Season Special Pack',
      isFocusProduct: false,
      focusNote: '',
    },
    {
      sku: 'SALT-01',
      name: 'Tata Salt Vacuum Evaporated Iodized 1kg',
      stock: 400,
      wholesalePrice: 22,
      retailPrice: 28,
      hsn: '2501',
      wholesaleScheme: 'Buy 50 Bags Get 3 Bags Free',
      retailOffer: '₹2 Off Promo Print',
      isFocusProduct: false,
      focusNote: 'Essential non-perishable basket builder',
    },
    {
      sku: 'NOOD-01',
      name: 'Maggi 2-Minute Masala Noodles 70g (Pack of 4)',
      stock: 350,
      wholesalePrice: 50,
      retailPrice: 60,
      hsn: '1902',
      wholesaleScheme: 'Buy 48 Pkts Get 4 Pkts Free Wholesale',
      retailOffer: 'Special Combo Saver Pack',
      isFocusProduct: false,
      focusNote: 'Fast moving impulse item',
    },
    {
      sku: 'GHEE-01',
      name: 'Amul Pure Desi Ghee 1L Tin',
      stock: 60,
      wholesalePrice: 590,
      retailPrice: 670,
      hsn: '0405',
      wholesaleScheme: '₹25 Trade Incentive per Tin',
      retailOffer: 'Flat ₹50 Consumer Discount on MRP',
      isFocusProduct: true,
      focusNote: 'Premium product - check cold storage guidelines',
    }
  ];
}
