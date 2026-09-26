"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Trash2, CheckCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { CreateInvoiceModal } from "@/components/features/CreateInvoiceModal";
import { PrintInvoiceModal } from "@/components/features/PrintInvoiceModal";
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice } from "@/hooks/useBilling";
import { usePatients } from "@/hooks/usePatients";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { Invoice } from "@/types/billing";

export default function BillingPage() {
  const router = useRouter();
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<number | null>(null);
  const [printInvoiceNumber, setPrintInvoiceNumber] = useState("");

  const { data: invoicesResponse, isLoading: isDataLoading } = useInvoices(statusFilter || undefined);
  
  const invoices: Invoice[] = useMemo(() => {
    if (!invoicesResponse) return [];
    if (Array.isArray(invoicesResponse)) return invoicesResponse;
    return (invoicesResponse as any)?.data ?? [];
  }, [invoicesResponse]);

  const { data: patientsData } = usePatients({ page_size: 1000 });
  const patients = useMemo(() => {
    if (!patientsData) return [];
    if (Array.isArray(patientsData)) return patientsData;
    return (patientsData as any)?.data?.items ?? (patientsData as any)?.items ?? (patientsData as any)?.data ?? [];
  }, [patientsData]);

  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-secondary font-medium">Verifying access...</p>
      </div>
    );
  }

  if (currentUser?.role === "receptionist") {
    router.push("/");
    return null;
  }

  const getPatientInfo = (patientId: any, invoice?: any) => {
    if (invoice?.patient) {
      return {
        name: invoice.patient.name || invoice.patient.full_name || invoice.patient.patient_name || "Unnamed Patient",
        phone: invoice.patient.phone || invoice.patient.phone_number || invoice.patient.mobile || "",
      };
    }

    const targetId = String(patientId);
    const patient = patients.find((p: any) => String(p.id) === targetId || String(p.patient_id) === targetId);

    if (!patient) return { name: `Patient #${patientId}`, phone: "" };

    return {
      name: patient.name || patient.full_name || patient.patient_name || "Unnamed Patient",
      phone: patient.phone || patient.phone_number || patient.mobile || "",
    };
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const { name, phone } = getPatientInfo(inv.patient_id, inv);
      
      const matchesSearch = 
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        phone.toLowerCase().includes(search.toLowerCase()) ||
        inv.service_or_package.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, patients, search, statusFilter]);

  const handleCreateInvoice = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        addToast("Invoice created successfully!", "success");
        setIsCreateModalOpen(false);
      },
      onError: (err: any) => {
        addToast(err?.response?.data?.detail || err?.message || "Failed to create invoice", "error");
      },
    });
  };

  const handleMarkAsPaid = (invoice: Invoice) => {
    if (invoice.status === "Paid") return;
    updateMutation.mutate(
      {
        id: invoice.id,
        payload: { ...invoice, status: "Paid" },
      },
      {
        onSuccess: () => {
          addToast(`Invoice ${invoice.invoice_number} marked as paid!`, "success");
        },
        onError: (err: any) => {
          addToast(err?.response?.data?.detail || err?.message || "Failed to update payment status", "error");
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to void and permanently delete this invoice?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          addToast("Invoice voided and deleted successfully", "success");
        },
        onError: (err: any) => {
          addToast(err?.response?.data?.detail || err?.message || "Failed to void invoice", "error");
        },
      });
    }
  };

  const openPrintModal = (invoice: Invoice) => {
    setPrintInvoiceId(invoice.id);
    setPrintInvoiceNumber(invoice.invoice_number);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-4 py-2 font-body">
      <header className="flex items-center justify-between pb-2 pt-4 border-b" style={{ borderColor: "#E4DFD1" }}  >
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">
            Billing
          </h1>
          <p className="text-text-secondary text-xs mt-1">
            Manage invoices, payments, and financial records
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4" /> Create Invoice
        </Button>
      </header>

      <Card className="p-4 bg-surface border border-border shadow-card rounded-[14px]">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by invoice #, patient name, phone, or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:w-48 transition cursor-pointer"
          >
            <option value="">All Invoices</option>
            <option value="Due">Due</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden bg-surface border border-border shadow-card rounded-[14px]">
        {isDataLoading ? (
          <div className="p-8 text-center text-text-secondary">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            {invoices.length === 0 ? "No invoices found." : "No invoices match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-background border-b border-border text-text-secondary uppercase tracking-wider text-xs font-semibold select-none">
                <tr>
                  <th className="text-left py-3 px-6 w-[12%]">Invoice #</th>
                  <th className="text-left py-3 px-6 w-[10%]">Date</th>
                  <th className="text-left py-3 px-6 w-[22%]">Patient</th>
                  <th className="text-left py-3 px-6 w-[18%]">Service</th>
                  <th className="text-right py-3 px-6 w-[12%]">Amount</th>
                  <th className="text-left py-3 px-6 w-[10%]">Status</th>
                  <th className="text-right py-3 px-6 w-[16%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-primary">
                {filteredInvoices.map((invoice) => {
                  const patientInfo = getPatientInfo(invoice.patient_id, invoice);
                  return (
                    <tr key={invoice.id} className="hover:bg-background/40 transition-colors duration-150">
                      <td className="py-3.5 px-6 font-mono text-text-secondary text-xs">
                        {invoice.invoice_number}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-text-secondary text-xs">
                        {invoice.created_at}
                      </td>
                      <td className="py-3.5 px-6 tracking-tight">
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">{patientInfo.name}</span>
                          {patientInfo.phone && (
                            <span className="text-xs text-text-secondary font-mono">{patientInfo.phone}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-text-secondary text-xs">
                        {invoice.service_or_package}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-semibold text-text-primary">
                        NPR {invoice.total_amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-6">
                        <StatusPill status={invoice.status === "Paid" ? "success" : "danger"}>
                          {invoice.status}
                        </StatusPill>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openPrintModal(invoice)}
                            className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-soft rounded-md transition duration-150 cursor-pointer"
                            title="View Receipt / PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          
                          {invoice.status === "Due" && (
                            <button
                              onClick={() => handleMarkAsPaid(invoice)}
                              className="p-1.5 text-text-secondary hover:text-tertiary hover:bg-tertiary-soft rounded-md transition duration-150 cursor-pointer"
                              title="Mark as Paid"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger-soft rounded-md transition duration-150 cursor-pointer"
                            title="Void Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateInvoice}
        isLoading={createMutation.isPending}
      />

      <PrintInvoiceModal
        invoiceId={printInvoiceId}
        invoiceNumber={printInvoiceNumber}
        onClose={() => {
          setPrintInvoiceId(null);
          setPrintInvoiceNumber("");
        }}
      />
    </div>
  );
}
