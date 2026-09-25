export interface Invoice {
  id: number;
  patient_id: number;
  invoice_number: string;
  service_or_package: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method: string;
  status: "Paid" | "Due";
  created_at: string;
}

export interface InvoiceCreate {
  patient_id: number;
  service_or_package: string;
  subtotal: number;
  discount: number;
  payment_method: string;
  status: "Paid" | "Due";
  invoice_number?: string;
  created_at?: string;
}
