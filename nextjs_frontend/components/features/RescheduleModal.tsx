"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { GridCellDetail } from "@/types/schedule";

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cell: GridCellDetail;
  currentDate: string;
  onSubmit: (newDate: string, newTime: string) => Promise<void>;
  isLoading: boolean;
  onCancel?: () => void;
  error?: any;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 9; hour < 17; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
    slots.push(`${hour.toString().padStart(2, "0")}:30`);
  }
  return slots;
}

export function RescheduleModal({
  isOpen,
  onClose,
  cell,
  currentDate,
  onSubmit,
  isLoading,
  onCancel,
  error,
}: RescheduleModalProps) {
  const { addToast } = useToast();
  const [newDate, setNewDate] = useState(currentDate);
  const [newTime, setNewTime] = useState(cell.time_slot);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setNewDate(currentDate);
      setNewTime(cell.time_slot);
      setValidationErrors({});
    }
  }, [isOpen, currentDate, cell.time_slot]);

  useEffect(() => {
    if (error?.response?.data?.type === "VALIDATION_ERROR" && error.response.data.errors) {
      setValidationErrors(error.response.data.errors);
    }
  }, [error]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const today = new Date().toISOString().split("T")[0];
    if (!newDate) errors.date = "Date is required.";
    else if (newDate < today) errors.date = "Cannot reschedule to a past date.";
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(newTime)) errors.time = "Invalid time format.";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (newDate === currentDate && newTime === cell.time_slot) {
      setValidationErrors({ form: "No changes detected." });
      return;
    }
    try {
      await onSubmit(newDate, newTime);
      addToast("Appointment rescheduled successfully!", "success");
      onClose();
    } catch (err) {
    }
  };

  const handleCancelAppointment = () => {
    if (window.confirm("Cancel this appointment?")) {
      onCancel?.();
    }
  };

  const getBackendError = () => {
    if (error?.response?.data?.type === "GLOBAL_ERROR") return error.response.data.message;
    if (error?.response?.data?.type === "VALIDATION_ERROR") return error.response.data.message;
    const detail = error?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    return validationErrors.form || null;
  };

  const inputClass = (field: string) =>
    `w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
      validationErrors[field] ? "border-danger" : "border-border focus:border-primary"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-surface border border-border rounded-card shadow-card w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-xl font-semibold text-text-primary">Manage Appointment</h2>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary">
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

          <div className="p-4 bg-background border border-border rounded-lg space-y-2">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Current Appointment
            </h3>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Patient</span>
              <span className="text-sm font-semibold text-text-primary">{cell.patient_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Date</span>
              <span className="text-sm font-mono font-medium text-text-primary">{currentDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Time</span>
              <span className="text-sm font-mono font-medium text-text-primary">{cell.time_slot}</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Reschedule to New Date & Time
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">New Date *</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={newDate}
                  onChange={(e) => {
                    setNewDate(e.target.value);
                    if (validationErrors.date) setValidationErrors((p) => ({ ...p, date: "" }));
                  }}
                  className={inputClass("date")}
                />
                {validationErrors.date && <p className="mt-1 text-xs text-danger">{validationErrors.date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">New Time Slot *</label>
                <select
                  required
                  value={newTime}
                  onChange={(e) => {
                    setNewTime(e.target.value);
                    if (validationErrors.time) setValidationErrors((p) => ({ ...p, time: "" }));
                  }}
                  className={inputClass("time")}
                >
                  {generateTimeSlots().map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
                {validationErrors.time && <p className="mt-1 text-xs text-danger">{validationErrors.time}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border mt-6">
            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelAppointment}
                disabled={isLoading}
                className="text-danger hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancel Appointment
              </Button>
            )}
            <div className="flex gap-3 sm:ml-auto">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                Close
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? "Rescheduling..." : "Reschedule"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
