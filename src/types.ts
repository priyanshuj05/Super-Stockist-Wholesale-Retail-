export interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  retailPrice: number;
  wholesalePrice: number;
  isFocusProduct: boolean;
  focusNote: string;
  retailOffer?: string; // e.g. "Flat 10% Off" or "₹20 Instant Discount"
  wholesaleScheme?: string; // e.g. "Buy 10 Cases Get 1 Free" or "5% Extra Margin on 25+ units"
  hsn?: string; // e.g. "1515", "1101", "3402"
}

export interface CompanyProfile {
  companyName: string;
  businessAddress: string;
  contactNumber: string;
  email: string;
  gstin: string;
  logoUrl?: string; // base64 data URL or external URL
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  upiNote?: string;
  termsAndConditions: string;
  signatoryText: string;
}

export interface Salesman {
  id: string;
  name: string;
  username: string;
  password?: string;
  targetSales: number;
  achievedSales: number;
  targetCollection: number;
  achievedCollection: number;
}

export type AuthRole = 'ADMIN' | 'SALESMAN';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: AuthRole;
  salesmanId?: string; // set when role === 'SALESMAN'
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  hsn?: string;
  wholesaleScheme?: string;
  retailOffer?: string;
  discountAmount?: number;
}

export interface Order {
  id: string;
  invoiceNumber?: string;
  storeName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID' | 'PARTIAL';
  createdAt: string;
  salesmanId?: string;
  salesmanName?: string;
  orderType?: 'wholesale' | 'retail_direct' | 'retail';
  customerName?: string;
  customerMobile?: string;
  deliveryAddress?: string;
  appliedOffers?: string[];
  retailerGstin?: string;
  subtotal?: number;
  discountTotal?: number;
}

export type InvoiceTemplateId = 'gst_tax_invoice' | 'modern_minimalist' | 'compact_slip';
export type InvoiceAccentColor = 'slate' | 'navy' | 'emerald' | 'crimson';

export interface Issue {
  id: string;
  salesmanName: string;
  shopName: string;
  category: string;
  description: string;
  status: 'OPEN' | 'RESOLVED' | 'UNDER_REVIEW';
  timestamp: string;
}

export type RoleRoute = '/admin' | '/salesman' | '/store';
