"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Therapist, ScheduleOverrideCreate } from "@/types/therapist";

interface ScheduleOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  therapist: Therapist | null;
  onSubmit: (data: ScheduleOverrideCreate) => void;
  isLoading: boolean;
  error?: any;
}

export function ScheduleOverrideModal({
  isOpen, onClose, therapist, onSubmit, isLoading, error,
}: ScheduleOverrideModalProps) {
  const [formData, setFormData] = useState<ScheduleOverrideCreate>({
    therapist_id: 0,
    date: "",
    is_day_off: false,
    custom_start_time: null,
    custom_end_time: null,
    break_start_time: null,
    break_end_time: null,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (therapist) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData({
        therapist_id: therapist.id,
        date: tomorrow.toISOString().split("T")[0],
        is_day_off: false,
        custom_start_time: null,
        custom_end_time: null,
        break_start_time: null,
        break_end_time: null,
      });
    }
    setValidationErrors({});
  }, [therapist, isOpen]);

  if (!isOpen || !therapist) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const today = new Date().toISOString().split("T")[0];

    if (!formData.date) {
      errors.date = "Date is required.";
    } else if (formData.date < today) {
      errors.date = "Override date cannot be in the past.";
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const hasStart = !!formData.custom_start_time;
    const hasEnd = !!formData.custom_end_time;

    if (hasStart !== hasEnd) {
      errors.custom_times = "Provide both start and end time, or neither.";
    }
    if (hasStart && !timeRegex.test(formData.custom_start_time!)) {
      errors.custom_start_time = "Invalid format. Use HH:MM.";
    }
    if (hasEnd && !timeRegex.test(formData.custom_end_time!)) {
      errors.custom_end_time = "Invalid format. Use HH:MM.";
    }
    if (hasStart && hasEnd && formData.custom_start_time! >= formData.custom_end_time!) {
      errors.custom_end_time = "End time must be after start time.";
    }

    const hasBreakStart = !!formData.break_start_time;
    const hasBreakEnd = !!formData.break_end_time;
    if (hasBreakStart !== hasBreakEnd) {
      errors.break_times = "Provide both break start and end time, or neither.";
    }
    if (hasBreakStart && !timeRegex.test(formData.break_start_time!)) {
      errors.break_start_time = "Invalid format. Use HH:MM.";
    }
    if (hasBreakEnd && !timeRegex.test(formData.break_end_time!)) {
      errors.break_end_time = "Invalid format. Use HH:MM.";
    }
    if (hasBreakStart && hasBreakEnd && formData.break_start_time! >= formData.break_end_time!) {
      errors.break_end_time = "Break end must be after break start.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: ScheduleOverrideCreate = {
      ...formData,
      custom_start_time: formData.custom_start_time || null,
      custom_end_time: formData.custom_end_time || null,
      break_start_time: formData.break_start_time || null,
      break_end_time: formData.break_end_time || null,
    };
    onSubmit(payload);
  };

  const getBackendError = () => {
    if (!error) return null;
    const detail = error?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((e: any) => e.msg).join(", ");
    return "Failed to save override.";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-card shadow-card w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-xl font-semibold text-text-primary">Schedule Override</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {getBackendError() && (
            <div className="p-3 rounded-lg bg-danger-soft text-danger text-sm font-medium border border-danger/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{getBackendError()}</span>
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
              required
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={formData.date}
              onChange={(e) => {
                setFormData({ ...formData, date: e.target.value });
                if (validationErrors.date) setValidationErrors((prev) => ({ ...prev, date: "" }));
              }}
              className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                validationErrors.date ? "border-danger" : "border-border focus:border-primary"
              }`}
            />
            {validationErrors.date && (
              <p className="mt-1 text-xs text-danger">{validationErrors.date}</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_day_off}
                onChange={(e) => setFormData({ ...formData, is_day_off: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-text-primary">Mark as Day Off</span>
            </label>
            <p className="mt-1 text-xs text-text-secondary ml-6">
              Therapist will be unavailable for the entire day
            </p>
          </div>

          {!formData.is_day_off && (
            <>
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Custom Working Hours (Optional)</h3>
                <p className="text-xs text-text-secondary mb-3">
                  Leave empty to use normal hours. If set, therapist will ONLY work during these times.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Custom Start Time</label>
                    <input
                      type="time"
                      value={formData.custom_start_time || ""}
                      onChange={(e) => setFormData({ ...formData, custom_start_time: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Custom End Time</label>
                    <input
                      type="time"
                      value={formData.custom_end_time || ""}
                      onChange={(e) => setFormData({ ...formData, custom_end_time: e.target.value })}
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

              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Break Time (Optional)</h3>
                <p className="text-xs text-text-secondary mb-3">
                  Override the default break time for this specific date.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Break Start</label>
                    <input
                      type="time"
                      value={formData.break_start_time || ""}
                      onChange={(e) => setFormData({ ...formData, break_start_time: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Break End</label>
                    <input
                      type="time"
                      value={formData.break_end_time || ""}
                      onChange={(e) => setFormData({ ...formData, break_end_time: e.target.value })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        validationErrors.break_end_time ? "border-danger" : "border-border focus:border-primary"
                      }`}
                    />
                    {validationErrors.break_end_time && (
                      <p className="mt-1 text-xs text-danger">{validationErrors.break_end_time}</p>
                    )}
                  </div>
                  {validationErrors.break_times && (
                    <p className="col-span-2 text-xs text-danger">{validationErrors.break_times}</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? "Saving..." : "Apply Override"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
