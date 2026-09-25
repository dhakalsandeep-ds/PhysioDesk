import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { Invoice, InvoiceCreate } from "@/types/billing";

const extractData = <T,>(response: any): T => response.data.data;

export function useInvoices(status?: string) {
  return useQuery({
    queryKey: ["invoices", status],
    queryFn: async () => {
      const url = status ? `/billing?status=${status}` : "/billing";
      const response = await apiClient.get(url);
      return extractData<Invoice[]>(response);
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoiceCreate) => apiClient.post("/billing", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Invoice> }) =>
      apiClient.put(`/billing/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/billing/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export async function getInvoicePdfUrl(invoiceId: number): Promise<string> {
  const response = await apiClient.get(`/billing/${invoiceId}/download-pdf`, {
    responseType: "blob",
  });
  return window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
}

export async function downloadInvoicePdf(invoiceId: number, invoiceNumber: string) {
  const response = await apiClient.get(`/billing/${invoiceId}/download-pdf`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${invoiceNumber}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
