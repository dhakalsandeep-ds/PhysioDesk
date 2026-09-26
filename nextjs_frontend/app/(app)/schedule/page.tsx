"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { BookAppointmentModal } from "@/components/features/BookAppointmentModal";
import { RescheduleModal } from "@/components/features/RescheduleModal";
import {
  useScheduleGrid,
  useBookAppointment,
  useRescheduleAppointment,
  useCancelAppointment,
  useDeleteOverride,
} from "@/hooks/useSchedule";
import { GridCellDetail } from "@/types/schedule";

export default function SchedulePage() {
  const { addToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [bookingCell, setBookingCell] = useState<{
    therapistId: number;
    therapistName: string;
    date: string;
    timeSlot: string;
  } | null>(null);
  const [reschedulingCell, setReschedulingCell] = useState<{
    cell: GridCellDetail;
    therapistId: number;
    therapistName: string;
  } | null>(null);

  const { data: grid, isLoading } = useScheduleGrid(selectedDate);
  const bookMutation = useBookAppointment();
  const rescheduleMutation = useRescheduleAppointment();
  const cancelMutation = useCancelAppointment();
  const deleteOverrideMutation = useDeleteOverride();

  const handleBookSubmit = async (data: any) => {
    await bookMutation.mutateAsync(data);
    setBookingCell(null);
  };

  const handleRescheduleSubmit = async (newDate: string, newTime: string) => {
    if (!reschedulingCell?.cell.appointment_id) return;
    await rescheduleMutation.mutateAsync({
      id: reschedulingCell.cell.appointment_id,
      date: newDate,
      time_slot: newTime,
    });
    setReschedulingCell(null);
    setSelectedDate(newDate);
  };

  const handleCancel = () => {
    if (!reschedulingCell?.cell.appointment_id) return;
    if (!window.confirm("Cancel this appointment?")) return;
    cancelMutation.mutate(reschedulingCell.cell.appointment_id, {
      onSuccess: () => {
        addToast("Appointment cancelled.", "success");
        setReschedulingCell(null);
      },
    });
  };

  const handleDeleteOverride = (overrideId: number, therapistName: string) => {
    if (!window.confirm(`Remove the schedule override for ${therapistName}?`)) return;
    deleteOverrideMutation.mutate(overrideId, {
      onSuccess: () => addToast("Override removed.", "success"),
    });
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const masterSlots = grid?.master_time_slots ?? [];
  const therapistColumns = grid?.therapist_columns ?? [];

  const activeOverrides = (grid?.active_overrides ?? []).filter((override) => {
    if (override.is_day_off) return true;
    
    if (override.custom_start_time && override.custom_end_time) {
      const isDifferent =
        override.custom_start_time !== override.normal_start_time ||
        override.custom_end_time !== override.normal_end_time;
      return isDifferent;
    }
    
    return false;
  });

  return (
    <div
      className="min-h-screen p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto font-body"
      style={{ backgroundColor: "#F6F3EA" }}
    >
     
      <header
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
        style={{ borderColor: "#E4DFD1" }}
      >
        <div>
          <h1
            className="font-serif text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: "#1C2622" }}
          >
            Schedule
          </h1>
          <p className="text-xs font-sans mt-1" style={{ color: "#797365" }}>
            Unified resource timeline · {grid?.master_interval_minutes ?? 30}-min intervals
          </p>
        </div>

        <div
          className="flex items-center gap-1.5 rounded-lg p-1 border shadow-sm"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E4DFD1" }}
        >
          <button
            onClick={() => changeDate(-1)}
            className="p-1.5 rounded-md transition-colors hover:bg-[#F6F3EA]"
            style={{ color: "#797365" }}
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm font-mono font-medium focus:outline-none px-2 cursor-pointer"
            style={{ color: "#1C2622" }}
          />
          <button
            onClick={() => changeDate(1)}
            className="p-1.5 rounded-md transition-colors hover:bg-[#F6F3EA]"
            style={{ color: "#797365" }}
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {activeOverrides.length > 0 && (
        <div
          className="rounded-lg overflow-hidden flex"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 1px 2px rgba(28, 38, 34, 0.04)",
          }}
        >
          <div className="w-1 shrink-0" style={{ backgroundColor: "#B8763A" }} />

          <div className="flex-1 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4" style={{ color: "#B8763A" }} />
                <h3
                  className="font-serif text-sm font-bold"
                  style={{ color: "#1C2622" }}
                >
                  Schedule Modifications
                </h3>
                <span
                  className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#F6F3EA", color: "#797365" }}
                >
                  {activeOverrides.length}
                </span>
              </div>
              <span className="text-[10px] font-mono" style={{ color: "#797365" }}>
                {selectedDate}
              </span>
            </div>

            <div className="space-y-2">
              {activeOverrides.map((override) => {
                const isDayOff = override.is_day_off;
                const hasCustomHours =
                  !isDayOff && override.custom_start_time && override.custom_end_time;

                const normalHours =
                  override.normal_start_time && override.normal_end_time
                    ? `${override.normal_start_time} – ${override.normal_end_time}`
                    : "—";

                const newHoursDisplay = hasCustomHours
                  ? `${override.custom_start_time} – ${override.custom_end_time}`
                  : "Off All Day";

                return (
                  <div
                    key={override.override_id}
                    className="flex items-start gap-3 px-3 py-3 rounded-md transition-colors group"
                    style={{ backgroundColor: "#FAF8F3" }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#F6F3EA";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "#FAF8F3";
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{
                        backgroundColor: isDayOff ? "#B5493B" : "#B8763A",
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p
                          className="text-sm font-semibold font-sans"
                          style={{ color: "#1C2622" }}
                        >
                          {override.therapist_name}
                        </p>
                        <span
                          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                          style={{
                            backgroundColor: isDayOff ? "#F3DEDA" : "#FFF4E6",
                            color: isDayOff ? "#B5493B" : "#B8763A",
                          }}
                        >
                          {isDayOff ? "Day Off" : "Hours Changed"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div
                          className="px-2.5 py-1.5 rounded border"
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderColor: "#E4DFD1",
                          }}
                        >
                          <div
                            className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
                            style={{ color: "#797365" }}
                          >
                            Normal Hours
                          </div>
                          <div
                            className="font-mono font-semibold"
                            style={{ color: "#1C2622" }}
                          >
                            {normalHours}
                          </div>
                        </div>

                        <div
                          className="hidden sm:flex items-center justify-center"
                          style={{ color: "#B8763A" }}
                        >
                          <span className="text-lg">→</span>
                        </div>

                        <div
                          className="px-2.5 py-1.5 rounded border"
                          style={{
                            backgroundColor: isDayOff ? "#F3DEDA" : "#FFF4E6",
                            borderColor: "#E8C5BC",
                          }}
                        >
                          <div
                            className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
                            style={{ color: isDayOff ? "#B5493B" : "#B8763A" }}
                          >
                            {isDayOff ? "Status" : "New Hours"}
                          </div>
                          <div
                            className="font-mono font-semibold"
                            style={{ color: isDayOff ? "#B5493B" : "#B8763A" }}
                          >
                            {newHoursDisplay}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs font-sans mt-2" style={{ color: "#797365" }}>
                        {isDayOff ? (
                          <span>No availability — therapist is off all day</span>
                        ) : (
                          <span>
                            Working{" "}
                            <span className="font-mono font-semibold" style={{ color: "#1C2622" }}>
                              {override.custom_start_time} – {override.custom_end_time}
                            </span>{" "}
                            instead of {normalHours}
                          </span>
                        )}
                      </p>

                      {override.working_days && override.working_days.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: "#797365" }}
                          >
                            Works:
                          </span>
                          {override.working_days.map((day) => (
                            <span
                              key={day}
                              className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: "#FFFFFF",
                                border: "1px solid #E4DFD1",
                                color: "#797365",
                              }}
                            >
                              {day.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        handleDeleteOverride(override.override_id, override.therapist_name)
                      }
                      className="p-1.5 rounded-md transition-all opacity-60 group-hover:opacity-100 shrink-0"
                      style={{ color: "#797365" }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.color = "#B5493B";
                        e.currentTarget.style.backgroundColor = "#F3DEDA";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.color = "#797365";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      title="Remove override"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Card
        className="overflow-hidden shadow-sm"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E4DFD1" }}
      >
        <div
          className="px-6 py-3 border-b flex flex-wrap items-center gap-x-5 gap-y-2"
          style={{
            backgroundColor: "#FAF8F3",
            borderColor: "#E4DFD1",
          }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "#797365" }}
          >
            Legend:
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm border"
              style={{ backgroundColor: "#FFF4E6", borderColor: "#E8C5BC" }}
            ></span>
            <span className="text-xs" style={{ color: "#797365" }}>
              Open
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm border"
              style={{ backgroundColor: "#E1EBE3", borderColor: "#C5D9C9" }}
            ></span>
            <span className="text-xs" style={{ color: "#797365" }}>
              Booked
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm border"
              style={{
                backgroundColor: "#E1EBE3",
                borderColor: "#4F7C63",
                borderLeftWidth: "3px",
              }}
            ></span>
            <span className="text-xs" style={{ color: "#797365" }}>
              Extended (60m+)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm border border-dashed"
              style={{ backgroundColor: "#FAF8F3", borderColor: "#E4DFD1" }}
            ></span>
            <span className="text-xs" style={{ color: "#797365" }}>
              Continuation
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm border"
              style={{ backgroundColor: "#F6F3EA", borderColor: "#E4DFD1" }}
            ></span>
            <span className="text-xs" style={{ color: "#797365" }}>
              Off Duty
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center font-sans text-sm" style={{ color: "#797365" }}>
            Loading calendar grid...
          </div>
        ) : masterSlots.length === 0 || therapistColumns.length === 0 ? (
          <div className="p-12 text-center font-sans text-sm" style={{ color: "#797365" }}>
            No therapists or time slots available for this date.
          </div>
        ) : (
          <div className="overflow-auto max-h-[75vh]">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr
                  className="border-b"
                  style={{ backgroundColor: "#F6F3EA", borderColor: "#E4DFD1" }}
                >
                  <th
                    className="sticky left-0 z-30 border-r px-4 py-3 text-left text-xs font-bold uppercase tracking-wider w-24"
                    style={{
                      backgroundColor: "#F6F3EA",
                      borderColor: "#E4DFD1",
                      color: "#797365",
                    }}
                  >
                    Time
                  </th>
                  {therapistColumns.map((col) => (
                    <th
                      key={col.therapist_id}
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider min-w-[200px] border-r last:border-r-0"
                      style={{
                        backgroundColor: "#F6F3EA",
                        borderColor: "#E4DFD1",
                        color: "#1C2622",
                      }}
                    >
                      <div>{col.therapist_name}</div>
                      <div
                        className="text-[10px] font-normal normal-case tracking-normal mt-0.5"
                        style={{ color: "#797365" }}
                      >
                        {col.specialty}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {masterSlots.map((timeSlot, rowIndex) => (
                  <tr
                    key={timeSlot}
                    className="border-b last:border-b-0 transition-colors"
                    style={{
                      backgroundColor: rowIndex % 2 === 0 ? "#FFFFFF" : "#FAF8F3",
                      borderColor: "#E4DFD1",
                    }}
                  >
                    <td
                      className="sticky left-0 z-10 border-r px-4 py-2 font-mono text-xs font-medium"
                      style={{
                        backgroundColor: rowIndex % 2 === 0 ? "#FFFFFF" : "#FAF8F3",
                        borderColor: "#E4DFD1",
                        color: "#797365",
                      }}
                    >
                      {timeSlot}
                    </td>

                    {therapistColumns.map((col) => {
                      const cell = col.slots[rowIndex];

                      if (!cell) {
                        return (
                          <td
                            key={`${col.therapist_id}-${timeSlot}`}
                            className="p-2 border-r last:border-r-0"
                            style={{ backgroundColor: "#FAF8F3", borderColor: "#E4DFD1" }}
                          >
                            <span className="text-xs" style={{ color: "#E4DFD1" }}>
                              —
                            </span>
                          </td>
                        );
                      }

                      const isExtended = cell.duration_minutes && cell.duration_minutes > 30;

                      return (
                        <td
                          key={`${col.therapist_id}-${timeSlot}`}
                          className="p-1.5 border-r last:border-r-0 align-top"
                          style={{ borderColor: "#E4DFD1" }}
                        >
                          {cell.status === "booked" && (
                            <button
                              onClick={() =>
                                setReschedulingCell({
                                  cell,
                                  therapistId: col.therapist_id,
                                  therapistName: col.therapist_name,
                                })
                              }
                              className="w-full min-h-14 border rounded-md transition px-2 py-1.5 text-left group hover:shadow-sm"
                              style={{
                                backgroundColor: "#E1EBE3",
                                borderColor: "#C5D9C9",
                                borderLeftWidth: isExtended ? "4px" : "1px",
                                borderLeftColor: isExtended ? "#4F7C63" : "#C5D9C9",
                              }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className="text-xs font-semibold truncate"
                                  style={{ color: "#1C2622" }}
                                >
                                  {cell.patient_name}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isExtended && (
                                    <span
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                      style={{ backgroundColor: "#4F7C63", color: "#FFFFFF" }}
                                    >
                                      {cell.duration_minutes}m
                                    </span>
                                  )}
                                  <span
                                    className="font-mono text-[10px]"
                                    style={{ color: "#4F7C63" }}
                                  >
                                    {cell.time_slot}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <span
                                  className="inline-block px-1.5 py-0.5 border rounded text-[9px] font-medium"
                                  style={{
                                    backgroundColor: "#FFFFFF",
                                    borderColor: "#C5D9C9",
                                    color: "#4F7C63",
                                  }}
                                >
                                  {cell.payment_method}
                                </span>
                              </div>
                              {cell.notes && (
                                <div
                                  className="text-[10px] italic truncate mt-1"
                                  style={{ color: "#4F7C63" }}
                                  title={cell.notes}
                                >
                                  📝 {cell.notes}
                                </div>
                              )}
                            </button>
                          )}

                          {cell.status === "continuation" && (
                            <div
                              className="h-14 border border-dashed rounded-md flex items-center justify-center"
                              style={{ backgroundColor: "#FAF8F3", borderColor: "#E4DFD1" }}
                            >
                              <span
                                className="text-xs font-mono tracking-widest"
                                style={{ color: "#B8763A" }}
                              >
                                · · ·
                              </span>
                            </div>
                          )}

                          {cell.status === "therapist-off" && (
                            <div
                              className="h-14 rounded-md flex items-center justify-center border cursor-not-allowed"
                              style={{
                                backgroundColor: "#F6F3EA",
                                borderColor: "#E4DFD1",
                                color: "#797365",
                              }}
                            >
                              <span className="text-[11px] font-medium">Off Duty</span>
                            </div>
                          )}

                          {cell.status === "open" && (
                            <button
                              onClick={() =>
                                setBookingCell({
                                  therapistId: col.therapist_id,
                                  therapistName: col.therapist_name,
                                  date: selectedDate,
                                  timeSlot: cell.time_slot,
                                })
                              }
                              className="w-full h-14 border rounded-md transition flex flex-col items-center justify-center gap-0.5 group hover:shadow-sm"
                              style={{ backgroundColor: "#FFF4E6", borderColor: "#E8C5BC" }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = "#FFE8CC";
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = "#FFF4E6";
                              }}
                            >
                              <span
                                className="text-[11px] font-semibold"
                                style={{ color: "#B8763A" }}
                              >
                                + Available
                              </span>
                              <span className="font-mono text-[10px]" style={{ color: "#797365" }}>
                                {cell.time_slot}
                              </span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {bookingCell && (
        <BookAppointmentModal
          isOpen={!!bookingCell}
          onClose={() => {
            setBookingCell(null);
            bookMutation.reset();
          }}
          therapistId={bookingCell.therapistId}
          therapistName={bookingCell.therapistName}
          date={bookingCell.date}
          timeSlot={bookingCell.timeSlot}
          onSubmit={handleBookSubmit}
          isLoading={bookMutation.isPending}
          error={bookMutation.error}
        />
      )}

      {reschedulingCell && (
        <RescheduleModal
          isOpen={!!reschedulingCell}
          onClose={() => {
            setReschedulingCell(null);
            rescheduleMutation.reset();
          }}
          cell={reschedulingCell.cell}
          currentDate={selectedDate}
          onSubmit={handleRescheduleSubmit}
          isLoading={rescheduleMutation.isPending}
          onCancel={handleCancel}
          error={rescheduleMutation.error}
        />
      )}
    </div>
  );
}
