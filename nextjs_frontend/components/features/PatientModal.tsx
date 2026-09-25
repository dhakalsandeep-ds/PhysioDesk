"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Patient, PatientCreate } from "@/types/patient";
import { useTherapists } from "@/hooks/useTherapists";

interface PatientFormState extends Omit<PatientCreate, "age"> {
  age: number | "";
}

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  onSubmit: (data: PatientCreate | Partial<Patient>) => void;
  isLoading: boolean;
  error?: any;
  fieldErrors?: Record<string, string>;
}

export function PatientModal({ 
  isOpen, 
  onClose, 
  patient, 
  onSubmit, 
  isLoading, 
  error,
  fieldErrors = {}
}: PatientModalProps) {
  const { 
    data: therapists = [], 
    isLoading: loadingTherapists, 
    error: therapistError,
    refetch 
  } = useTherapists();

  const [formData, setFormData] = useState<PatientFormState>({
    name: "",
    phone: "",
    age: "", 
    gender: "Male",
    address: "",
    condition: "",
    package: "None",
    status: "Active",
    assigned_therapist_id: undefined,
  });

  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name,
        phone: patient.phone,
        age: patient.age || "", 
        gender: patient.gender || "Male",
        address: patient.address || "",
        condition: patient.condition || "",
        package: patient.package || "None",
        status: patient.status || "Active",
        assigned_therapist_id: patient.assigned_therapist_id || undefined,
      });
    } else {
      setFormData({
        name: "",
        phone: "",
        age: "",
        gender: "Male",
        address: "",
        condition: "",
        package: "None",
        status: "Active",
        assigned_therapist_id: undefined,
      });
    }
    setPhoneError("");
  }, [patient, isOpen]);

  if (!isOpen) return null;

  const apiValidationErrors: Record<string, string> = 
    error?.response?.data?.type === "VALIDATION_ERROR" && error?.response?.data?.errors
      ? error.response.data.errors
      : {};

  const validationErrors = { ...apiValidationErrors, ...fieldErrors };

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\s|-/g, "");
    const regex = /^(98\d{8}|97\d{8}|01\d{6,7})$/;
    
    if (!cleanPhone) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (!regex.test(cleanPhone)) {
      setPhoneError("Invalid format. Use: 98XXXXXXXX, 97XXXXXXXX, or 01XXXXXXX");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (value: string) => {
    setFormData({ ...formData, phone: value });
    if (value) validatePhone(value);
    else setPhoneError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(formData.phone)) return;
    
    const payload = {
      ...formData,
      age: formData.age === "" ? 0 : formData.age,
    };
    
    onSubmit(payload);
  };

  const handleChange = (field: keyof PatientFormState, value: string | number | undefined) => {
    setFormData({ ...formData, [field]: value });
  };

  const getErrorMessage = () => {
    if (!error) return null;
    if (error.response?.data?.message) return error.response.data.message;
    if (error.response?.data?.detail) return error.response.data.detail;
    return "Failed to save patient. Please check the highlighted fields below.";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-card shadow-card w-full max-w-2xl my-8 overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="font-display text-xl font-semibold text-text-primary">
            {patient ? "Edit Patient" : "Add New Patient"}
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {error && (
            <div className="p-3 rounded-lg bg-danger-soft text-danger text-sm font-medium border border-danger/20">
              {getErrorMessage()}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Full Name *</label>
              <input 
                required 
                type="text" 
                minLength={2} 
                maxLength={50} 
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${validationErrors.name ? "border-danger" : "border-border focus:border-primary"}`}
                placeholder="Sandeep Sharma" 
              />
              {validationErrors.name && (
                <p className="mt-1 text-xs text-danger font-medium">{validationErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Phone Number *</label>
              <input 
                required 
                type="tel" 
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${phoneError || validationErrors.phone ? "border-danger" : "border-border focus:border-primary"}`}
                placeholder="9801234567" 
              />
              {phoneError && <p className="mt-1 text-xs text-danger">{phoneError}</p>}
              {!phoneError && validationErrors.phone && (
                <p className="mt-1 text-xs text-danger font-medium">{validationErrors.phone}</p>
              )}
              <p className="mt-1 text-xs text-text-secondary">Format: 98XXXXXXXX, 97XXXXXXXX, or 01XXXXXXX</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Age *</label>
              <input 
                required 
                type="text" 
                inputMode="numeric" 
                pattern="[0-9]*"
                value={formData.age}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    handleChange("age", "");
                  } else {
                    const numericVal = val.replace(/[^0-9]/g, "");
                    if (numericVal !== "") {
                      handleChange("age", parseInt(numericVal, 10));
                    }
                  }
                }}
                className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${validationErrors.age ? "border-danger" : "border-border focus:border-primary"}`}
                placeholder="28" 
              />
              {validationErrors.age && (
                <p className="mt-1 text-xs text-danger font-medium">{validationErrors.age}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Gender *</label>
              <select 
                required 
                value={formData.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${validationErrors.gender ? "border-danger" : "border-border focus:border-primary"}`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {validationErrors.gender && (
                <p className="mt-1 text-xs text-danger font-medium">{validationErrors.gender}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Assigned Therapist</label>
            
            {loadingTherapists ? (
              <p className="text-sm text-text-secondary animate-pulse">Loading therapists...</p>
            ) : therapistError ? (
              <div className="space-y-2">
                <select disabled className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-sm text-text-secondary">
                  <option>Failed to load therapists</option>
                </select>
                <button type="button" onClick={() => refetch()} className="text-xs text-primary hover:underline">
                  Try again
                </button>
              </div>
            ) : therapists && therapists.length > 0 ? (
              <>
                <select
                  value={formData.assigned_therapist_id || ""}
                  onChange={(e) => handleChange("assigned_therapist_id", e.target.value ? Number(e.target.value) : undefined)}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${validationErrors.assigned_therapist_id ? "border-danger" : "border-border focus:border-primary"}`}
                >
                  <option value="">Unassigned</option>
                  {therapists.map((therapist) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.name} ({therapist.specialty})
                    </option>
                  ))}
                </select>
                {validationErrors.assigned_therapist_id && (
                  <p className="mt-1 text-xs text-danger font-medium">{validationErrors.assigned_therapist_id}</p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <select disabled className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-sm text-text-secondary">
                  <option value="">No therapists available</option>
                </select>
                <p className="text-xs text-warning">
                   No active therapists found. Please add a therapist first.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Condition *</label>
              <input 
                required 
                type="text" 
                minLength={3} 
                value={formData.condition}
                onChange={(e) => handleChange("condition", e.target.value)}
                className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${validationErrors.condition ? "border-danger" : "border-border focus:border-primary"}`}
                placeholder="Chronic Lower Back Pain" 
              />
              {validationErrors.condition && (
                <p className="mt-1 text-xs text-danger font-medium">{validationErrors.condition}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Package *</label>
              <select 
                required 
                value={formData.package}
                onChange={(e) => handleChange("package", e.target.value)}
                className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${validationErrors.package ? "border-danger" : "border-border focus:border-primary"}`}
              >
                <option value="None">None</option>
                <option value="Basic Plan">Basic Plan</option>
                <option value="Premium Package">Premium Package</option>
              </select>
              {validationErrors.package && (
                <p className="mt-1 text-xs text-danger font-medium">{validationErrors.package}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Address *</label>
            <textarea 
              required 
              rows={2} 
              minLength={3} 
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${validationErrors.address ? "border-danger" : "border-border focus:border-primary"}`}
              placeholder="Manamaiju, Kathmandu" 
            />
            {validationErrors.address && (
              <p className="mt-1 text-xs text-danger font-medium">{validationErrors.address}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Status</label>
            <select 
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${validationErrors.status ? "border-danger" : "border-border focus:border-primary"}`}
            >
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="On hold">On hold</option>
            </select>
            {validationErrors.status && (
              <p className="mt-1 text-xs text-danger font-medium">{validationErrors.status}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? "Saving..." : patient ? "Update Patient" : "Create Patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
