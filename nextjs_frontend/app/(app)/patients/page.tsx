"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, Pencil, Plus, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { PatientModal } from "@/components/features/PatientModal";
import { useToast } from "@/components/ui/Toast";
import {
  usePatients,
  useCreatePatient,
  useUpdatePatient,
  useDeletePatient,
} from "@/hooks/usePatients";
import { useTherapists } from "@/hooks/useTherapists";
import { Patient } from "@/types/patient";

type StatusTone = "success" | "danger" | "neutral" | "warning";

export default function PatientsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(4);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [therapistFilter, setTherapistFilter] = useState<number | "">("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const { data, isLoading } = usePatients({
    name_or_phone: search || undefined,
    status: statusFilter || undefined,
    therapist_id: therapistFilter || undefined,
    page,
    page_size: pageSize,
  });

  const patients = data?.items ?? [];
  const pagination = data?.pagination;

  const { data: therapists = [] } = useTherapists();
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();
  const deleteMutation = useDeletePatient();

  const activeMutation = editingPatient ? updateMutation : createMutation;
  const mutationErrorData = (activeMutation.error as any)?.response?.data;
  
  const fieldErrors: Record<string, string> = 
    mutationErrorData?.type === "VALIDATION_ERROR" && mutationErrorData?.errors
      ? mutationErrorData.errors
      : {};

  const handleSearchChange = (value: string) => { setSearch(value); setPage(1); };
  const handleStatusChange = (value: string) => { setStatusFilter(value); setPage(1); };
  const handleTherapistChange = (value: number | "") => { setTherapistFilter(value); setPage(1); };

  const handleCreate = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      addToast("Patient created successfully!", "success");
      setIsModalOpen(false);
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to create patient", "error");
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingPatient) return;
    try {
      await updateMutation.mutateAsync({ id: editingPatient.id, payload: data });
      addToast("Patient profile updated successfully!", "success");
      setIsModalOpen(false);
      setEditingPatient(null);
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to update patient", "error");
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to purge this patient record?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          addToast("Patient record deleted successfully", "success");
        },
        onError: (err: any) => {
          addToast(err?.response?.data?.detail || "Failed to delete patient record", "error");
        },
      });
    }
  };

  const getStatusTone = (status: string): StatusTone => {
    if (!status) return "neutral";
    const cleanStatus = status.toString().toLowerCase().trim().replace(/_/g, " ");

    if (cleanStatus === "active") return "success";
    if (cleanStatus === "completed") return "neutral";
    if (cleanStatus === "on hold" || cleanStatus === "onhold") return "warning";
    return "neutral";
  };

  const formatStatusDisplay = (status: string) => {
    if (!status) return "—";
    const cleanStatus = status.toString().toLowerCase().trim().replace(/_/g, " ");
    if (cleanStatus === "on hold" || cleanStatus === "onhold") return "On hold";
    if (cleanStatus === "active") return "Active";
    if (cleanStatus === "completed") return "Completed";
    return status;
  };

  const pageNumbers = useMemo(() => {
    if (!pagination) return [];
    const { page: current, total_pages: total } = pagination;
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push("...");
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (current < total - 2) pages.push("...");
      pages.push(total);
    }
    return pages;
  }, [pagination]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-4 py-2 font-body">
      <header className="flex items-center justify-between pb-5 pt-4 border-b border-border/60">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">
            Patients Directory
          </h1>
          <p className="text-text-secondary text-xs mt-1">
            Manage your clinic's active patient records and registration profiles
          </p>
        </div>
        <button
          onClick={() => { setEditingPatient(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-surface rounded-lg text-sm font-medium transition-all shadow-sm hover:opacity-95 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Patient
        </button>
      </header>

      <Card className="p-4 bg-surface border border-border shadow-card rounded-[14px]">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
          <select
            value={therapistFilter}
            onChange={(e) => handleTherapistChange(e.target.value ? Number(e.target.value) : "")}
            className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:w-48 transition cursor-pointer"
          >
            <option value="">All Therapists</option>
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:w-48 transition cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="On hold">On hold</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden bg-surface border border-border shadow-card rounded-[14px]">
        {isLoading ? (
          <div className="p-8 text-center text-text-secondary">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            No patients found matching your criteria.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-background border-b border-border text-text-secondary uppercase tracking-wider text-xs font-semibold select-none">
                  <tr>
                    <th className="text-left py-3 px-6 w-[8%]">ID</th>
                    <th className="text-left py-3 px-6 w-[25%]">Name</th>
                    <th className="text-left py-3 px-6 w-[15%]">Phone</th>
                    <th className="text-left py-3 px-6 w-[15%]">Therapist</th>
                    <th className="text-left py-3 px-6 w-[12%]">Status</th>
                    <th className="text-right py-3 px-6 w-[25%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-primary">
                  {patients.map((patient) => {
                    const therapist = therapists.find((t) => t.id === patient.assigned_therapist_id);
                    return (
                      <tr key={patient.id} className="hover:bg-background/40 transition-colors duration-150">
                        <td className="py-3.5 px-6 font-mono text-text-secondary text-xs">{patient.id}</td>
                        <td className="py-3.5 px-6 font-medium text-text-primary/90 tracking-tight">
                          {patient.name}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-text-secondary text-xs">{patient.phone}</td>
                        <td className="py-3.5 px-6 text-text-secondary text-xs">{therapist?.name || "—"}</td>
                        <td className="py-3.5 px-6">
                          <StatusPill status={getStatusTone(patient.status)}>
                            {formatStatusDisplay(patient.status)}
                          </StatusPill>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => router.push(`/patients/${patient.id}`)}
                              className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-soft rounded-md transition duration-150 cursor-pointer"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditingPatient(patient); setIsModalOpen(true); }}
                              className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-soft rounded-md transition duration-150 cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(patient.id)}
                              className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger-soft rounded-md transition duration-150 cursor-pointer"
                              title="Delete"
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

            {pagination && pagination.total_pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-border bg-background/30 gap-4">
                <p className="text-xs text-text-secondary">
                  Showing{" "}
                  <span className="font-semibold text-text-primary">
                    {(pagination.page - 1) * pagination.page_size + 1}
                  </span>
                  –
                  <span className="font-semibold text-text-primary">
                    {Math.min(pagination.page * pagination.page_size, pagination.total_items)}
                  </span>{" "}
                  of <span className="font-semibold text-text-primary">{pagination.total_items}</span> patients
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={!pagination.has_prev}
                    className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-soft rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.has_prev}
                    className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-soft rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {pageNumbers.map((pageNum, idx) => (
                    pageNum === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-text-secondary text-xs">
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum as number)}
                        className={`w-8 h-8 flex items-center justify-center text-xs font-medium rounded-md transition ${
                          page === pageNum
                            ? "bg-primary text-surface shadow-sm"
                            : "text-text-secondary hover:bg-background hover:text-text-primary border border-transparent hover:border-border"
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}

                  <button
                    onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                    disabled={!pagination.has_next}
                    className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-soft rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPage(pagination.total_pages)}
                    disabled={!pagination.has_next}
                    className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-soft rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <PatientModal
        isOpen={isModalOpen}
        onClose={() => {
          createMutation.reset();
          updateMutation.reset();
          setIsModalOpen(false);
          setEditingPatient(null);
        }}
        patient={editingPatient}
        onSubmit={editingPatient ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
        error={activeMutation.error}
        fieldErrors={fieldErrors}
      />
    </div>
  );
}
