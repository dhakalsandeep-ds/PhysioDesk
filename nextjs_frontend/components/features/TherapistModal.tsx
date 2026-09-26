"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast"; 
import { Therapist, TherapistCreate } from "@/types/therapist";

interface TherapistModalProps {
  isOpen: boolean;
  onClose: () => void;
  therapist?: Therapist | null;
  onSubmit: (data: TherapistCreate) => Promise<void> | void; 
  isLoading: boolean;
  error?: any; 
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const VALID_SLOT_DURATIONS = [30, 60];

export function TherapistModal({
  isOpen, onClose, therapist, onSubmit, isLoading, error,
}: TherapistModalProps) {
  const { addToast } = useToast(); 

  const [formData, setFormData] = useState<TherapistCreate>({
    name: "",
    specialty: "",
    working_days: "",
    start_time: "09:00",
    end_time: "17:00",
    slot_duration: 30,
    break_start_time: null,     
    break_end_time: null,        
  });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (therapist) {
      setFormData({
        name: therapist.name,
        specialty: therapist.specialty,
        working_days: therapist.working_days.join(","),
        start_time: therapist.start_time,
        end_time: therapist.end_time,
        slot_duration: therapist.slot_duration,
      });
      setSelectedDays(therapist.working_days);
    } else {
      setFormData({
        name: "",
        specialty: "",
        working_days: "",
        start_time: "09:00",
        end_time: "17:00",
        slot_duration: 30,
      });
      setSelectedDays([]);
    }
    setValidationErrors({});
  }, [therapist, isOpen]);

  useEffect(() => {
    if (error) {
      const responseData = error.response?.data;
      if (responseData?.type === "VALIDATION_ERROR" && responseData?.errors) {
        setValidationErrors(responseData.errors);
      }
    } else {
      setValidationErrors({}); 
    }
  }, [error]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters.";
    }
    if (!formData.specialty || formData.specialty.trim().length < 2) {
      errors.specialty = "Specialty must be at least 2 characters.";
    }
    if (selectedDays.length === 0) {
      errors.working_days = "Select at least one working day.";
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(formData.start_time)) {
      errors.start_time = "Invalid format. Use HH:MM (24-hour).";
    }
    if (!timeRegex.test(formData.end_time)) {
      errors.end_time = "Invalid format. Use HH:MM (24-hour).";
    }
    if (timeRegex.test(formData.start_time) && timeRegex.test(formData.end_time)) {
      if (formData.start_time >= formData.end_time) {
        errors.end_time = "End time must be after start time.";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDayToggle = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    setSelectedDays(newDays);
    setFormData({ ...formData, working_days: newDays.join(",") });
    if (newDays.length > 0) {
      setValidationErrors((prev) => ({ ...prev, working_days: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    try {
      await onSubmit(formData); 
      addToast(therapist ? "Therapist updated successfully!" : "Therapist created successfully!", "success"); 
      onClose();
    } catch (err) {
    }
  };

  const handleChange = (field: keyof TherapistCreate, value: string | number | null) => {
    setFormData({ ...formData, [field]: value });
    if (validationErrors[field as string]) {
      setValidationErrors((prev) => ({ ...prev, [field as string]: "" })); 
    }
  };

  const getBackendError = () => {
    if (!error) return null;
    const responseData = error.response?.data;
    
    if (responseData?.type === "VALIDATION_ERROR") {
      return responseData.message || "Please correct the highlighted fields.";
    }
    if (responseData?.type === "GLOBAL_ERROR") {
      return responseData.message;
    }

    const detail = responseData?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((e: any) => e.msg).join(", ");
    
    return "Failed to save therapist. Please try again.";
  };

  const inputClass = (field: string) =>
    `w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition ${
      validationErrors[field]
        ? "border-danger focus:border-danger"
        : "border-border focus:border-primary"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 backdrop-blur-sm p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} noValidate className="bg-surface border border-border rounded-card shadow-card w-full max-w-2xl my-8 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="font-display text-xl font-semibold text-text-primary">
            {therapist ? "Edit Therapist" : "Add New Therapist"}
          </h2>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary transition" disabled={isLoading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {getBackendError() && (
            <div className="p-3 rounded-lg bg-danger-soft text-danger text-sm font-medium border border-danger/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{getBackendError()}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={inputClass("name")}
                placeholder="Dr. Sarah Jenkins"
                disabled={isLoading}
              />
              {validationErrors.name && <p className="mt-1 text-xs text-danger">{validationErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Specialty *</label>
              <input
                type="text"
                value={formData.specialty}
                onChange={(e) => handleChange("specialty", e.target.value)}
                className={inputClass("specialty")}
                placeholder="Orthopedic Physiotherapy"
                disabled={isLoading}
              />
              {validationErrors.specialty && <p className="mt-1 text-xs text-danger">{validationErrors.specialty}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Working Days *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <label
                  key={day}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition ${
                    selectedDays.includes(day)
                      ? "bg-primary-soft border-primary text-primary-text"
                      : "bg-background border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day)}
                    onChange={() => handleDayToggle(day)}
                    className="w-4 h-4"
                    disabled={isLoading}
                  />
                  <span className="text-sm font-medium">{day}</span>
                </label>
              ))}
            </div>
            {validationErrors.working_days && <p className="mt-1 text-xs text-danger">{validationErrors.working_days}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Start Time *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => handleChange("start_time", e.target.value)}
                className={`${inputClass("start_time")} font-mono`}
                disabled={isLoading}
              />
              {validationErrors.start_time && <p className="mt-1 text-xs text-danger">{validationErrors.start_time}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">End Time *</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => handleChange("end_time", e.target.value)}
                className={`${inputClass("end_time")} font-mono`}
                disabled={isLoading}
              />
              {validationErrors.end_time && <p className="mt-1 text-xs text-danger">{validationErrors.end_time}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Slot Duration *</label>
              <select
                value={formData.slot_duration}
                onChange={(e) => handleChange("slot_duration", parseInt(e.target.value))}
                className={inputClass("slot_duration")}
                disabled={isLoading}
              >
                {VALID_SLOT_DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
	      <p className="mt-1 text-xs text-text-secondary">
		Must algin with 30-min grid intervals
	      </p>
            </div>
          </div>


          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? "Saving..." : therapist ? "Update Therapist" : "Create Therapist"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
