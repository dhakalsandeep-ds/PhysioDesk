"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { usePatientsList } from "@/hooks/usePatients";
import { AppointmentCreate } from "@/types/schedule";

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  therapistId: number;
  therapistName: string;
  date: string;
  timeSlot: string;
  onSubmit: (data: AppointmentCreate) => Promise<void>;
  isLoading: boolean;
  error?: any;
}

export function BookAppointmentModal({
  isOpen, onClose, therapistId, therapistName, date, timeSlot, onSubmit, isLoading, error,
}: BookAppointmentModalProps) {
  const { addToast } = useToast();
  const { data: patientsData } = usePatientsList();
  const patients = Array.isArray(patientsData) ? patientsData : [];

  const [formData, setFormData] = useState({ patient_id: 0, payment_method: "Cash", notes: "" });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({ patient_id: 0, payment_method: "Cash", notes: "" });
      setValidationErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (error?.response?.data?.type === "VALIDATION_ERROR" && error.response.data.errors) {
      setValidationErrors(error.response.data.errors);
    }
  }, [error]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.patient_id) errors.patient_id = "Please select a patient.";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit({
        patient_id: formData.patient_id,
        therapist_id: therapistId,
        date,
        time_slot: timeSlot,
        payment_method: formData.payment_method,
        notes: formData.notes || undefined,
      });
      addToast("Appointment booked successfully!", "success");
      onClose();
    } catch (err: any) {
    }
  };

  const getBackendError = () => {
    if (!error) return null;
    const data = error.response?.data;
    if (data?.type === "GLOBAL_ERROR") return data.message;
    if (data?.type === "VALIDATION_ERROR") return data.message;
    if (typeof data?.detail === "string") return data.detail;
    return null;
  };

  const inputClass = (field: string) =>
    `w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition ${
      validationErrors[field] ? "border-danger focus:border-danger" : "border-border focus:border-primary"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 backdrop-blur-sm p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} noValidate className="bg-surface border border-border rounded-card shadow-card w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-xl font-semibold text-text-primary">Book Appointment</h2>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary transition" disabled={isLoading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {getBackendError() && (
            <div className="p-3 rounded-lg bg-danger-soft text-danger text-sm font-medium border border-danger/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{getBackendError()}</span>
            </div>
          )}

          <div className="p-3 bg-primary-soft rounded-lg space-y-1">
            <p className="text-sm font-medium text-primary-text"><span className="font-semibold">{therapistName}</span></p>
            <p className="text-xs text-primary-text/80 font-mono">{date} at {timeSlot}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Patient *</label>
            <select
              value={formData.patient_id}
              onChange={(e) => { setFormData({ ...formData, patient_id: parseInt(e.target.value) }); if (validationErrors.patient_id) setValidationErrors((p) => ({ ...p, patient_id: "" })); }}
              className={inputClass("patient_id")}
              disabled={isLoading}
            >
              <option value={0}>{patients.length === 0 ? "Loading or no patients..." : "Select a patient..."}</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>
              ))}
            </select>
            {validationErrors.patient_id && <p className="mt-1 text-xs text-danger">{validationErrors.patient_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Payment Method *</label>
            <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition" disabled={isLoading}>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="eSewa">eSewa</option>
              <option value="Khalti">Khalti</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Notes (Optional)</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition" placeholder="Any special instructions..." disabled={isLoading} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isLoading}>{isLoading ? "Booking..." : "Confirm Booking"}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
