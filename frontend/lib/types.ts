export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  business_id: number;
}

export interface Business {
  id: number;
  name: string;
  business_type: string;
  gst_number: string | null;
  address: string | null;
  mobile_number: string | null;
  logo_url: string | null;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
}

export interface Brand {
  id: number;
  name: string;
}

export interface Unit {
  id: number;
  name: string;
  short_name: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string | null;
  description: string | null;
  selling_price: number;
  purchase_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  category_id: number | null;
  brand_id: number | null;
  unit_id: number | null;
  category?: Category;
  brand?: Brand;
  unit?: Unit;
  gst_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  opening_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  product?: Product;
  quantity: number;
  unit_price: number;
  discount: number;
  gst_rate: number;
  gst_amount: number;
  subtotal: number;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  note: string | null;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_type: string;
  customer_id: number | null;
  customer?: Customer;
  invoice_date: string;
  due_date: string | null;
  status: 'paid' | 'partial' | 'unpaid' | 'cancelled';
  subtotal: number;
  discount_amount: number;
  gst_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  notes: string | null;
  items?: InvoiceItem[];
  payments?: Payment[];
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  opening_balance: number;
  due_amount: number;
  total_purchases: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  total_sales: number;
  total_invoices: number;
  total_customers: number;
  pending_dues: number;
  low_stock_count: number;
}

export interface WeeklySales {
  date: string;
  amount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
