"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
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
import { Therapist } from "@/types/therapist";

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday",
];


const calculateCapacityFromSlots = (
  startTime?: string,
  endTime?: string,
  slotDurationMin?: number
): number => {
  if (!startTime || !endTime) return 8;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const startDecimal = (startH || 0) + (startM || 0) / 60;
  const endDecimal = (endH || 0) + (endM || 0) / 60;

  const totalWorkingHours = endDecimal - startDecimal;
  if (totalWorkingHours <= 0) return 8;

  if (slotDurationMin && slotDurationMin > 0) {
    const totalWorkingMinutes = totalWorkingHours * 60;
    const maxSlots = Math.floor(totalWorkingMinutes / slotDurationMin);
    return (maxSlots * slotDurationMin) / 60;
  }

  return totalWorkingHours;
};

export default function TherapistsPage() {
  const { addToast } = useToast();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState<Therapist | null>(null);
  const [overrideTherapist, setOverrideTherapist] = useState<Therapist | null>(null);

  const { data: therapists = [], isLoading } = useTherapists();

  const createMutation = useCreateTherapist();
  const updateMutation = useUpdateTherapist();
  const deleteMutation = useDeleteTherapist();
  const overrideMutation = useCreateScheduleOverride();

  const activeMutation = editingTherapist ? updateMutation : createMutation;

  const filteredTherapists = useMemo(() => {
    return therapists.filter((t) => {
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.specialty.toLowerCase().includes(search.toLowerCase());

      const matchesDay =
        !dayFilter || t.working_days.includes(dayFilter);

      const matchesSpecialty =
        !specialtyFilter || t.specialty.toLowerCase() === specialtyFilter.toLowerCase();

      return matchesSearch && matchesDay && matchesSpecialty;
    });
  }, [therapists, search, dayFilter, specialtyFilter]);

  const totalPages = Math.ceil(filteredTherapists.length / pageSize) || 1;
  const paginatedTherapists = filteredTherapists.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const uniqueSpecialties = useMemo(() => {
    return Array.from(new Set(therapists.map((t) => t.specialty).filter(Boolean))).sort();
  }, [therapists]);

  const handleCreate = async (payload: any) => {
    await createMutation.mutateAsync(payload);
    setIsEditModalOpen(false);
  };

  const handleUpdate = async (payload: any) => {
    if (!editingTherapist) return;
    await updateMutation.mutateAsync({ id: editingTherapist.id, payload });
    setIsEditModalOpen(false);
    setEditingTherapist(null);
  };

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Archive therapist "${name}"? Their existing appointments will be preserved.`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => addToast("Therapist archived.", "success"),
    });
  };

  const handleOverrideSubmit = async (payload: any) => {
    await overrideMutation.mutateAsync(payload);
    setOverrideTherapist(null);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDayChange = (value: string) => {
    setDayFilter(value);
    setPage(1);
  };

  const handleSpecialtyChange = (value: string) => {
    setSpecialtyFilter(value);
    setPage(1);
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (page > 3) pages.push("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-4 py-2 font-body">
      <header className="flex items-center justify-between pb-2 pt-4 border-b border-border">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">
            Therapist Roster
          </h1>
          <p className="text-text-secondary text-xs mt-1">
            Manage your clinic's active therapists and their schedules
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setEditingTherapist(null);
            setIsEditModalOpen(true);
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <select
            value={dayFilter}
            onChange={(e) => handleDayChange(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:w-48 transition cursor-pointer"
          >
            <option value="">All Working Days</option>
            {DAYS_OF_WEEK.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>

          <select
            value={specialtyFilter}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:w-48 transition cursor-pointer"
          >
            <option value="">All Specialties</option>
            {uniqueSpecialties.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden bg-surface border border-border shadow-card rounded-[14px]">
        {isLoading ? (
          <div className="p-8 text-center text-text-secondary">
            Loading therapists...
          </div>
        ) : paginatedTherapists.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            No therapists found matching your criteria.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-background border-b border-border text-text-secondary uppercase tracking-wider text-xs font-semibold select-none">
                  <tr>
                    <th className="text-left py-3 px-6 w-[20%]">Name</th>
                    <th className="text-left py-3 px-6 w-[15%]">Specialty</th>
                    <th className="text-left py-3 px-6 w-[18%]">Working Days</th>
                    <th className="text-left py-3 px-6 w-[22%]">Today's Utilization</th>
                    <th className="text-right py-3 px-6 w-[15%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-primary">
                  {paginatedTherapists.map((t) => {
                    const capacityHours =
                      t.daily_capacity_hours && t.daily_capacity_hours > 0
                        ? t.daily_capacity_hours
                        : calculateCapacityFromSlots(t.start_time, t.end_time, t.slot_duration);

                    const bookedHours = t.booked_hours_today || 0;
                    const patientsSeen = t.patients_seen_today || 0;

                    const pct = capacityHours > 0
                      ? Math.round((bookedHours / capacityHours) * 100)
                      : 0;

                    return (
                      <tr
                        key={t.id}
                        className="transition-colors duration-150 hover:bg-background/40"
                      >
                        <td className="py-3.5 px-6">
                          <div className="font-semibold text-text-primary tracking-tight">
                            {t.name}
                          </div>
                          <div className="text-xs font-mono mt-0.5 text-text-secondary">
                            {t.start_time} – {t.end_time} · {t.slot_duration}min slots
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-text-secondary">
                          {t.specialty}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex flex-wrap gap-1">
                            {t.working_days.map((day) => (
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
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-background rounded-full h-2 overflow-hidden border border-border">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  pct >= 100
                                    ? "bg-danger"
                                    : pct >= 75
                                    ? "bg-warning"
                                    : "bg-primary"
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-semibold text-text-primary w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                          <div className="text-[10px] text-text-secondary mt-1 font-mono">
                            {bookedHours}h / {capacityHours}h booked · {patientsSeen} seen
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setOverrideTherapist(t)}
                              className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10 transition duration-150 cursor-pointer"
                              title="Override Schedule"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingTherapist(t);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10 transition duration-150 cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id, t.name)}
                              className="p-1.5 rounded-md text-text-secondary hover:text-danger hover:bg-danger/10 transition duration-150 cursor-pointer"
                              title="Archive"
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

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-border bg-background/50 gap-4">
                <p className="text-xs text-text-secondary">
                  Showing{" "}
                  <span className="font-semibold text-text-primary">
                    {(page - 1) * pageSize + 1}
                  </span>{" "}
                  –{" "}
                  <span className="font-semibold text-text-primary">
                    {Math.min(page * pageSize, filteredTherapists.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-text-primary">
                    {filteredTherapists.length}
                  </span>{" "}
                  therapists
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="p-1.5 rounded-md text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-background transition"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-background transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {pageNumbers.map((pageNum, idx) =>
                    pageNum === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-2 text-xs text-text-secondary"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum as number)}
                        className={`w-8 h-8 flex items-center justify-center text-xs font-medium rounded-md transition ${
                          page === pageNum
                            ? "bg-primary text-white shadow-sm"
                            : "text-text-secondary hover:bg-background hover:text-text-primary"
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-background transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-background transition"
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

      <TherapistModal
        isOpen={isEditModalOpen}
        onClose={() => {
          createMutation.reset();
          updateMutation.reset();
          setIsEditModalOpen(false);
          setEditingTherapist(null);
        }}
        therapist={editingTherapist}
        onSubmit={editingTherapist ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
        error={activeMutation.error}
      />

      <ScheduleOverrideModal
        isOpen={!!overrideTherapist}
        onClose={() => {
          overrideMutation.reset();
          setOverrideTherapist(null);
        }}
        therapist={overrideTherapist}
        onSubmit={handleOverrideSubmit}
        isLoading={overrideMutation.isPending}
        error={overrideMutation.error}
      />
    </div>
  );
}
