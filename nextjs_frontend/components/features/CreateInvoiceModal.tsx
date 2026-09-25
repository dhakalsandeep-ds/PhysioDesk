"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePatients } from "@/hooks/usePatients";
import { InvoiceCreate } from "@/types/billing";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceCreate) => void;
  isLoading: boolean;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: CreateInvoiceModalProps) {
  const { data: patientsData, error } = usePatients({ page_size: 100 });

  const patients = Array.isArray(patientsData) 
    ? patientsData 
    : (patientsData?.items ?? []);

  useEffect(() => {
    if (isOpen) {
      if (error) {
        console.error(" Error fetching patients:", error);
      } else {
        console.log("Successfully fetched patients:", patients.length);
      }
    }
  }, [patientsData, error, isOpen, patients]);

  const [formData, setFormData] = useState<InvoiceCreate>({
    patient_id: 0,
    service_or_package: "",
    subtotal: 0,
    discount: 0,
    status: "Due",
    payment_method: "Cash",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        patient_id: 0,
        service_or_package: "",
        subtotal: 0,
        discount: 0,
        status: "Due",
        payment_method: "Cash",
        notes: "",
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const calculateTotal = () => {
    return Math.max(0, formData.subtotal - formData.discount).toFixed(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
          <h2 className="font-display text-lg font-semibold text-text-primary">Create New Invoice</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Patient *</label>
            <select
              required
              value={formData.patient_id || ""}
              onChange={(e) => setFormData({ ...formData, patient_id: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Select a patient</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
              ))}
            </select>
            
            {patients.length === 0 && !error && (
              <p className="mt-1 text-xs text-danger">
                 No patients found. Please add a patient on the Patients page first.
              </p>
            )}
            {error && (
              <p className="mt-1 text-xs text-danger">
                ️ Failed to load patients. Check console for details.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Service / Package *</label>
            <input
              required
              type="text"
              value={formData.service_or_package}
              onChange={(e) => setFormData({ ...formData, service_or_package: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="e.g. Physiotherapy Session, Premium Package"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Subtotal (NPR) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={formData.subtotal || ""}
                onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Discount (NPR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.discount || ""}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="p-3 bg-primary-soft/30 border border-primary/20 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium text-text-primary">Total Due:</span>
            <span className="font-mono font-bold text-primary text-lg">NPR {calculateTotal()}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="Due">Due</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Insurance">Insurance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Optional remarks..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading || formData.patient_id === 0}>
              {isLoading ? "Creating..." : "Generate Invoice"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
