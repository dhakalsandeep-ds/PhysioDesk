"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Calendar, CalendarClock, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast"; 
import { TherapistModal } from "@/components/features/TherapistModal";
import { ScheduleOverrideModal } from "@/components/features/ScheduleOverrideModal";
import {
  useTherapists,
  useCreateTherapist,
  useUpdateTherapist,
  useDeleteTherapist,
  useCreateScheduleOverride,
} from "@/hooks/useTherapists";
import { useAuth } from "@/hooks/useAuth";
import { Therapist, TherapistCreate, ScheduleOverrideCreate } from "@/types/therapist";

export default function TherapistsPage() {
  const router = useRouter();
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast(); 

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "off">("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState<Therapist | null>(null);
  const [overrideTherapist, setOverrideTherapist] = useState<Therapist | null>(null);

  const { data: therapists = [], isLoading: isDataLoading } = useTherapists();
  const createMutation = useCreateTherapist();
  const updateMutation = useUpdateTherapist();
  const deleteMutation = useDeleteTherapist();
  const overrideMutation = useCreateScheduleOverride();

  const filteredTherapists = useMemo(() => {
    return therapists.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.specialty.toLowerCase().includes(search.toLowerCase());

      const isOffDuty = t.daily_capacity_hours === 0;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !isOffDuty) ||
        (statusFilter === "off" && isOffDuty);

      return matchesSearch && matchesStatus;
    });
  }, [therapists, search, statusFilter]);

  useEffect(() => {
    if (!isAuthLoading && currentUser && currentUser.role === "receptionist") {
      router.push("/");
    }
  }, [isAuthLoading, currentUser, router]);

  if (isAuthLoading || (currentUser && currentUser.role === "receptionist")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-secondary font-medium">
          {isAuthLoading ? "Verifying access..." : "Redirecting to dashboard..."}
        </p>
      </div>
    );
  }

  if (!isAuthLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-secondary font-medium">Please sign in to view this page.</p>
      </div>
    );
  }

  const handleCreate = (data: TherapistCreate) => {
    return createMutation.mutateAsync(data);
  };

  const handleUpdate = (data: TherapistCreate) => {
    if (!editingTherapist) return Promise.reject();
    return updateMutation.mutateAsync({ id: editingTherapist.id, payload: data });
  };

  const handleDelete = (id: number, name: string) => {
    const confirmed = window.confirm(
      `⚠️ DEACTIVATE THERAPIST: ${name}\n\n` +
        `Assumption: This performs a SOFT DELETE (is_active = false).\n` +
        `• Historical appointments are preserved for billing/records.\n` +
        `• They will be removed from the active roster and scheduling grid.\n` +
        `• ⚠️ WARNING: Future appointments are NOT automatically reassigned or cancelled.\n\n` +
        `Have you manually rescheduled their upcoming patients?`
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleOverride = (data: ScheduleOverrideCreate) => {
    overrideMutation.mutate(data, {
      onSuccess: () => {
        addToast("Schedule override applied successfully!", "success");
        setIsOverrideModalOpen(false);
        setOverrideTherapist(null);
      },
    });
  };
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-4 py-2 font-body">
      <header className="flex items-center justify-between pb-2 pt-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">
            Therapists Directory
          </h1>
          <p className="text-text-secondary text-xs mt-1">
            Manage your clinic's active therapist roster, schedules, and daily utilization
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingTherapist(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Add Therapist
        </Button>
      </header>

      <Card className="p-4 bg-surface border border-border shadow-card rounded-[14px]">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by name or specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "off")}
            className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:w-48 transition cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Today</option>
            <option value="off">Off Duty Today</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden bg-surface border border-border shadow-card rounded-[14px]">
        {isDataLoading ? (
          <div className="p-8 text-center text-text-secondary">Loading therapists...</div>
        ) : filteredTherapists.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            No therapists found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-background border-b border-border text-text-secondary uppercase tracking-wider text-xs font-semibold select-none">
                <tr>
                  <th className="text-left py-3 px-6 w-[20%]">Name</th>
                  <th className="text-left py-3 px-6 w-[20%]">Specialty</th>
                  <th className="text-left py-3 px-6 w-[20%]">Working Days</th>
                  <th className="text-left py-3 px-6 w-[25%]">Today's Load</th>
                  <th className="text-left py-3 px-6 w-[15%]">Status</th>
                  <th className="text-right py-3 px-6 w-[20%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-primary">
                {filteredTherapists.map((therapist) => {
                  const isOffDuty = therapist.daily_capacity_hours === 0;
                  return (
                    <tr
                      key={therapist.id}
                      className="hover:bg-background/40 transition-colors duration-150"
                    >
                      <td className="py-3.5 px-6 font-semibold text-text-primary tracking-tight">
                        {therapist.name}
                      </td>
                      <td className="py-3.5 px-6 text-text-secondary">{therapist.specialty}</td>
                      <td className="py-3.5 px-6">
                        <div className="flex flex-wrap gap-1">
                          {therapist.working_days.map((day) => (
                            <span
                              key={day}
                              className="px-2 py-0.5 bg-tertiary-soft text-tertiary text-[10px] font-semibold uppercase rounded"
                            >
                              {day.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        {isOffDuty ? (
                          <div className="flex items-center gap-2 text-xs text-text-secondary italic">
                            <span className="w-2 h-2 rounded-full bg-neutral-soft"></span>
                            Off duty today
                          </div>
                        ) : (
                          <div className="space-y-1.5 w-40">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-text-secondary flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {therapist.patients_seen_today} pts
                              </span>
                              <span className="font-mono font-semibold text-primary">
                                {therapist.utilization_today_percent.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-background border border-border rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  therapist.utilization_today_percent >= 90
                                    ? "bg-danger"
                                    : therapist.utilization_today_percent >= 70
                                    ? "bg-warning"
                                    : "bg-primary"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    therapist.utilization_today_percent,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="text-[10px] text-text-secondary text-right">
                              {therapist.booked_hours_today.toFixed(1)}h /{" "}
                              {therapist.daily_capacity_hours.toFixed(1)}h
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            !isOffDuty
                              ? "bg-success-soft text-success"
                              : "bg-neutral-soft text-text-secondary"
                          }`}
                        >
                          {!isOffDuty ? "Active" : "Off Duty"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => router.push(`/schedule?therapist=${therapist.id}`)}
                            className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-soft rounded-md transition duration-150 cursor-pointer"
                            title="View in Schedule Grid"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setOverrideTherapist(therapist);
                              setIsOverrideModalOpen(true);
                            }}
                            className="p-1.5 text-text-secondary hover:text-warning hover:bg-warning-soft rounded-md transition duration-150 cursor-pointer"
                            title="Override Schedule"
                          >
                            <CalendarClock className="w-4 h-4" /> 
                          </button>
                          <button
                            onClick={() => {
                              setEditingTherapist(therapist);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-soft rounded-md transition duration-150 cursor-pointer"
                            title="Edit Details"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(therapist.id, therapist.name)}
                            className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger-soft rounded-md transition duration-150 cursor-pointer"
                            title="Deactivate Therapist"
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

      <TherapistModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTherapist(null);
        }}
        onSubmit={editingTherapist ? handleUpdate : handleCreate}
        therapist={editingTherapist}
        isLoading={createMutation.isPending || updateMutation.isPending}
        error={createMutation.error || updateMutation.error}
      />

      <ScheduleOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => {
          setIsOverrideModalOpen(false);
          setOverrideTherapist(null);
        }}
        onSubmit={handleOverride}
        therapist={overrideTherapist}
        isLoading={overrideMutation.isPending}
        error={overrideMutation.error}
      />
    </div>
  );
}