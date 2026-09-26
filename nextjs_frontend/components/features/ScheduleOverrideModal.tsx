"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Therapist, ScheduleOverrideCreate } from "@/types/therapist";

interface ScheduleOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  therapist: Therapist | null;
  onSubmit: (data: ScheduleOverrideCreate) => Promise<void>;
  isLoading: boolean;
  error?: any;
}

export function ScheduleOverrideModal({
  isOpen,
  onClose,
  therapist,
  onSubmit,
  isLoading,
  error,
}: ScheduleOverrideModalProps) {
  const [formData, setFormData] = useState<ScheduleOverrideCreate>({
    therapist_id: 0,
    date: "",
    is_day_off: false,
    custom_start_time: null,
    custom_end_time: null,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    if (therapist && isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData({
        therapist_id: therapist.id,
        date: tomorrow.toISOString().split("T")[0],
        is_day_off: false,
        custom_start_time: null,
        custom_end_time: null,
      });
      setValidationErrors({});
      setBackendError(null);
    }
  }, [therapist, isOpen]);

  useEffect(() => {
    if (error?.response?.data?.type === "VALIDATION_ERROR" && error.response.data.errors) {
      setValidationErrors(error.response.data.errors);
    }
  }, [error]);

  if (!isOpen || !therapist) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const today = new Date().toISOString().split("T")[0];

    if (!formData.date) errors.date = "Date is required.";
    else if (formData.date < today) errors.date = "Cannot be in the past.";

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const hasStart = !!formData.custom_start_time;
    const hasEnd = !!formData.custom_end_time;

    if (hasStart !== hasEnd) errors.custom_times = "Provide both start and end, or neither.";
    if (hasStart && !timeRegex.test(formData.custom_start_time!)) {
      errors.custom_start_time = "Invalid format.";
    }
    if (hasEnd && !timeRegex.test(formData.custom_end_time!)) {
      errors.custom_end_time = "Invalid format.";
    }
    if (hasStart && hasEnd && formData.custom_start_time! >= formData.custom_end_time!) {
      errors.custom_end_time = "End must be after start.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const extractErrorMessage = (err: any): string => {
    const data = err?.response?.data;
    if (data?.type === "GLOBAL_ERROR" && data?.message) return data.message;
    if (data?.type === "VALIDATION_ERROR" && data?.message) return data.message;
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;
    if (typeof err?.message === "string") return err.message;
    return "Something went wrong. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setBackendError(null);
    setValidationErrors({});

    try {
      await onSubmit({
        ...formData,
        custom_start_time: formData.custom_start_time || null,
        custom_end_time: formData.custom_end_time || null,
      });
    } catch (err: any) {
      const message = extractErrorMessage(err);
      setBackendError(message);
      console.error("Override error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-surface border border-border rounded-card shadow-card w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-xl font-semibold text-text-primary">Schedule Override</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {backendError && (
            <div className="p-3 rounded-lg bg-danger-soft text-danger text-sm font-medium border border-danger/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{backendError}</span>
            </div>
          )}

          <div className="p-3 bg-primary-soft rounded-lg">
            <p className="text-sm font-medium text-primary-text">
              Setting override for: <span className="font-semibold">{therapist.name}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Date *</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split("T")[0]}
              value={formData.date}
              onChange={(e) => {
                setFormData({ ...formData, date: e.target.value });
                if (validationErrors.date) setValidationErrors((p) => ({ ...p, date: "" }));
                setBackendError(null);
              }}
              className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                validationErrors.date ? "border-danger" : "border-border focus:border-primary"
              }`}
            />
            {validationErrors.date && <p className="mt-1 text-xs text-danger">{validationErrors.date}</p>}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_day_off}
              onChange={(e) => {
                setFormData({ ...formData, is_day_off: e.target.checked });
                setBackendError(null);
              }}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-text-primary">Mark as Day Off</span>
          </label>

          {!formData.is_day_off && (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                Custom Working Hours (Optional)
              </h3>

              <div
                className="p-3 rounded-lg mb-3 text-xs"
                style={{
                  backgroundColor: "#F6F3EA",
                  border: "1px solid #E4DFD1",
                  color: "#797365",
                }}
              >
                <span className="font-semibold" style={{ color: "#1C2622" }}>
                  {therapist.name}'s normal hours:
                </span>{" "}
                <span className="font-mono font-semibold" style={{ color: "#B8763A" }}>
                  {therapist.start_time} – {therapist.end_time}
                </span>
                <br />
                <span className="text-[11px] mt-1 block">
                  Leave empty to keep normal hours. Set different times to override for this day only.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.custom_start_time || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, custom_start_time: e.target.value });
                      setBackendError(null);
                    }}
                    className={`w-full px-3 py-2 bg-background border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      validationErrors.custom_start_time ? "border-danger" : "border-border focus:border-primary"
                    }`}
                  />
                  {validationErrors.custom_start_time && (
                    <p className="mt-1 text-xs text-danger">{validationErrors.custom_start_time}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.custom_end_time || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, custom_end_time: e.target.value });
                      setBackendError(null);
                    }}
                    className={`w-full px-3 py-2 bg-background border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      validationErrors.custom_end_time ? "border-danger" : "border-border focus:border-primary"
                    }`}
                  />
                  {validationErrors.custom_end_time && (
                    <p className="mt-1 text-xs text-danger">{validationErrors.custom_end_time}</p>
                  )}
                </div>
                {validationErrors.custom_times && (
                  <p className="col-span-2 text-xs text-danger">{validationErrors.custom_times}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? "Saving..." : "Apply Override"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
