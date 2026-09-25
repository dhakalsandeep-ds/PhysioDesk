"use client";

import React from "react";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboard";
import { TherapistCapacitySummary, PatientRecentSummary } from "@/types/dashboard";


function MetricTile({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div 
      className="p-5 rounded-xl border bg-[#FFFFFF]" 
      style={{ borderColor: "#E4DFD1" }}
    >
      <p 
        className="text-xs font-semibold uppercase tracking-wider font-sans" 
        style={{ color: "#797365" }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-2 mt-2">
        <span 
          className="font-serif text-3xl font-bold tracking-tight" 
          style={{ color: "#1C2622" }}
        >
          {value}
        </span>
        {subtext && (
          <span 
            className="text-xs font-mono font-medium" 
            style={{ color: "#797365" }}
          >
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}


function TherapistShiftTimeline({ therapist }: { therapist: TherapistCapacitySummary }) {
  const firstSlot = therapist.visual_slots_timeline[0]?.time || "09:00";
  const lastSlot =
    therapist.visual_slots_timeline[therapist.visual_slots_timeline.length - 1]?.time || "17:00";

  return (
    <div 
      className="p-5 border-b last:border-b-0 transition-colors hover:bg-[#F6F3EA]/50" 
      style={{ borderColor: "#E4DFD1" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-bold font-sans" style={{ color: "#1C2622" }}>
            {therapist.therapist_name}
          </h4>
          <p className="text-xs font-sans mt-0.5" style={{ color: "#797365" }}>
            <span className="font-mono font-semibold" style={{ color: "#1C2622" }}>
              {therapist.booked_slots_count}
            </span>
            {" / "}
            <span className="font-mono">{therapist.total_slots_capacity}</span> slots booked today
          </p>
        </div>

        <span
          className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md"
          style={{ backgroundColor: "#E1EBE3", color: "#4F7C63" }}
        >
          {therapist.booked_slots_count === therapist.total_slots_capacity
            ? "Fully Booked"
            : "Available"}
        </span>
      </div>

      <div className="space-y-1.5">
        <div 
          className="flex items-center justify-between text-[11px] font-mono px-0.5" 
          style={{ color: "#797365" }}
        >
          <span>{firstSlot}</span>
          <span>Shift Timeline</span>
          <span>{lastSlot}</span>
        </div>

        <div 
          className="w-full rounded-md p-1 flex gap-1 h-6 items-center overflow-hidden border"
          style={{ backgroundColor: "#F6F3EA", borderColor: "#E4DFD1" }}
        >
          {therapist.visual_slots_timeline.map((slot, idx) => (
            <div
              key={`${slot.time}-${idx}`}
              title={`${slot.time} — ${slot.status === "booked" ? "Booked" : "Open"}`}
              className="h-full flex-1 rounded-xs transition-opacity hover:opacity-85"
              style={{
                backgroundColor: slot.status === "booked" ? "#B8763A" : "#E4DFD1",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


function PatientRow({ patient }: { patient: PatientRecentSummary }) {
  const getStatusStyles = (status: string) => {
    const s = status.toLowerCase();
    if (s === "active" || s === "booked" || s === "paid") {
      return { backgroundColor: "#E1EBE3", color: "#4F7C63" };
    }
    if (s === "overdue" || s === "cancelled") {
      return { backgroundColor: "#F3DEDA", color: "#B5493B" };
    }
    return { backgroundColor: "#E7EBEE", color: "#5E6B78" };
  };

  const statusStyle = getStatusStyles(patient.status);

  return (
    <div 
      className="px-5 py-3.5 border-b last:border-b-0 transition-colors flex items-center justify-between gap-4 hover:bg-[#F6F3EA]/50"
      style={{ borderColor: "#E4DFD1" }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <p className="text-sm font-semibold font-sans truncate" style={{ color: "#1C2622" }}>
            {patient.name}
          </p>
          <span 
            className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-md shrink-0"
            style={statusStyle}
          >
            {patient.status}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-sans mt-1" style={{ color: "#797365" }}>
          <span className="truncate">{patient.condition}</span>
          <span>•</span>
          <span className="truncate font-medium" style={{ color: "#1C2622" }}>
            {patient.assigned_therapist_name}
          </span>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        {patient.package && patient.package !== "None" && (
          <span 
            className="hidden sm:inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded border"
            style={{ backgroundColor: "#F6F3EA", borderColor: "#E4DFD1", color: "#797365" }}
          >
            {patient.package}
          </span>
        )}
        <a
          href={`/patients/${patient.id}`}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: "#797365" }}
          title="Open Patient Profile"
        >
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}


export default function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats();

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center min-h-[60vh]"
        style={{ backgroundColor: "#F6F3EA" }}
      >
        <p className="text-xs font-mono font-medium" style={{ color: "#797365" }}>
          Loading dashboard metrics...
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div 
          className="text-center max-w-sm p-6 rounded-xl border"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E4DFD1" }}
        >
          <p className="font-sans font-bold text-sm mb-1" style={{ color: "#B5493B" }}>
            Unable to Load Dashboard
          </p>
          <p className="text-xs font-sans" style={{ color: "#797365" }}>
            {(error as any)?.response?.data?.detail || "Please check server connections."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto px-4 py-2 font-body"
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
            Clinic Overview
          </h1>
          <p className="text-xs font-sans mt-0.5" style={{ color: "#797365" }}>
            {todayFormatted}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link 
            href="/schedule"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold font-sans transition-colors"
            style={{ 
              backgroundColor: "#B8763A", 
              color: "#FFFFFF" 
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book Appointment</span>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Patients Seen Today"
          value={stats.patients_seen_today.toString()}
          subtext="completed"
        />
        <MetricTile
          label="Therapists Active"
          value={stats.therapists_on_duty_today.toString()}
          subtext="on shift"
        />
        <MetricTile
          label="Revenue Today"
          value={`NPR ${stats.revenue_collected_today.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
        />
        <MetricTile
          label="Available Slots"
          value={stats.open_slots_remaining_today.toString()}
          subtext="openings left"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div 
          className="lg:col-span-7 rounded-xl border overflow-hidden"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E4DFD1" }}
        >
          <div 
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E4DFD1" }}
          >
            <div>
              <h2 className="font-serif text-base font-bold" style={{ color: "#1C2622" }}>
                Therapist Schedule & Capacity
              </h2>
              <p className="text-xs font-sans" style={{ color: "#797365" }}>
                Live timetable breakdown for active roster
              </p>
            </div>
            
            <div className="flex items-center gap-3 text-xs font-sans">
              <span className="flex items-center gap-1.5" style={{ color: "#797365" }}>
                <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: "#B8763A" }} /> Booked
              </span>
              <span className="flex items-center gap-1.5" style={{ color: "#797365" }}>
                <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: "#E4DFD1" }} /> Open
              </span>
            </div>
          </div>

          {stats.therapist_capacity_grid.length === 0 ? (
            <div className="p-10 text-center font-sans text-xs" style={{ color: "#797365" }}>
              No therapists scheduled on duty today.
            </div>
          ) : (
            <div>
              {stats.therapist_capacity_grid.map((therapist) => (
                <TherapistShiftTimeline key={therapist.therapist_id} therapist={therapist} />
              ))}
            </div>
          )}
        </div>

        <div 
          className="lg:col-span-5 rounded-xl border overflow-hidden"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E4DFD1" }}
        >
          <div 
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E4DFD1" }}
          >
            <div>
              <h2 className="font-serif text-base font-bold" style={{ color: "#1C2622" }}>
                Recent Patient Activity
              </h2>
              <p className="text-xs font-sans" style={{ color: "#797365" }}>
                Latest registrations and chart updates
              </p>
            </div>
            <a
              href="/patients"
              className="text-xs font-semibold font-sans hover:underline"
              style={{ color: "#B8763A" }}
            >
              View all
            </a>
          </div>

          {stats.recent_patients.length === 0 ? (
            <div className="p-10 text-center font-sans text-xs" style={{ color: "#797365" }}>
              No recent patient activity recorded.
            </div>
          ) : (
            <div>
              {stats.recent_patients.map((patient) => (
                <PatientRow key={patient.id} patient={patient} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
