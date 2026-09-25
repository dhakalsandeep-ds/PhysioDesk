"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, Phone, Calendar, MapPin, Activity, Package, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { usePatient, usePatientSessions, usePatientBilling } from "@/hooks/usePatients";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = Number(params.id);

  const { data: patient, isLoading: loadingPatient } = usePatient(patientId);
  const { data: sessions = [], isLoading: loadingSessions } = usePatientSessions(patientId);
  const { data: billing, isLoading: loadingBilling } = usePatientBilling(patientId);

  if (loadingPatient) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-text-secondary">Loading patient profile...</div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-text-secondary">Patient not found.</div>
      </div>
    );
  }

  const getStatusTone = (status: string) => {
    if (status === "Active") return "success";
    if (status === "Completed") return "neutral";
    if (status === "On hold") return "warning";
    return "danger";
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-4 py-2 font-body">
      <header className="flex items-center justify-between pb-2 pt-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/patients")}
            className="p-2 text-text-secondary hover:text-primary hover:bg-primary-soft rounded-lg transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">
              {patient.name}
            </h1>
            <p className="text-text-secondary text-xs mt-1">
              Patient Profile · ID {patient.id}
            </p>
          </div>
        </div>
      </header>

      <Card className="p-6 bg-surface border border-border shadow-card rounded-[14px]">
        <h2 className="font-display text-xl font-semibold text-text-primary mb-4">
          Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider">Full Name</p>
              <p className="text-sm font-medium text-text-primary mt-0.5">{patient.name}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider">Phone</p>
              <p className="text-sm font-medium text-text-primary mt-0.5 font-mono">
                {patient.phone}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider">Age & Gender</p>
              <p className="text-sm font-medium text-text-primary mt-0.5">
                {patient.age} years · {patient.gender}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider">Address</p>
              <p className="text-sm font-medium text-text-primary mt-0.5">{patient.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider">Condition</p>
              <p className="text-sm font-medium text-text-primary mt-0.5">{patient.condition}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider">Package</p>
              <p className="text-sm font-medium text-text-primary mt-0.5">{patient.package}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Status</p>
              <StatusPill status={getStatusTone(patient.status)}>{patient.status}</StatusPill>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-surface border border-border shadow-card rounded-[14px]">
        <h2 className="font-display text-xl font-semibold text-text-primary mb-4">
          Billing Summary
        </h2>
        {loadingBilling ? (
          <div className="text-center text-text-secondary py-4">Loading billing data...</div>
        ) : billing ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-background rounded-lg border border-border">
              <p className="text-xs text-text-secondary uppercase tracking-wider">Total Sessions</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{billing.total_sessions}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <p className="text-xs text-text-secondary uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-bold text-success mt-1">{billing.completed_sessions}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <p className="text-xs text-text-secondary uppercase tracking-wider">Booked</p>
              <p className="text-2xl font-bold text-primary mt-1">{billing.booked_sessions}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <p className="text-xs text-text-secondary uppercase tracking-wider">Cancelled</p>
              <p className="text-2xl font-bold text-danger mt-1">{billing.cancelled_sessions}</p>
            </div>
          </div>
        ) : null}

        {billing && Object.keys(billing.payment_breakdown).length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">
              Payment Methods (Completed Sessions)
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(billing.payment_breakdown).map(([method, count]) => (
                <span
                  key={method}
                  className="px-3 py-1.5 bg-primary-soft text-primary text-sm font-medium rounded-lg border border-primary/20"
                >
                  {method}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden bg-surface border border-border shadow-card rounded-[14px]">
        <div className="p-6 border-b border-border">
          <h2 className="font-display text-xl font-semibold text-text-primary">
            Session History
          </h2>
        </div>
        {loadingSessions ? (
          <div className="p-8 text-center text-text-secondary">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            No session history available for this patient.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border text-text-secondary uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="text-left py-3 px-6">Date</th>
                  <th className="text-left py-3 px-6">Time</th>
                  <th className="text-left py-3 px-6">Therapist</th>
                  <th className="text-left py-3 px-6">Payment</th>
                  <th className="text-left py-3 px-6">Status</th>
                  <th className="text-left py-3 px-6">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-primary">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-background/40 transition-colors">
                    <td className="py-3 px-6 font-mono text-xs">{session.date}</td>
                    <td className="py-3 px-6 font-mono text-xs">{session.time_slot}</td>
                    <td className="py-3 px-6 font-medium">{session.therapist_name}</td>
                    <td className="py-3 px-6">
                      <span className="px-2 py-1 bg-background border border-border rounded text-xs">
                        {session.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <StatusPill
                        status={
                          session.status === "Completed"
                            ? "success"
                            : session.status === "Cancelled"
                            ? "danger"
                            : "neutral"
                        }
                      >
                        {session.status}
                      </StatusPill>
                    </td>
                    <td className="py-3 px-6 text-text-secondary text-xs italic max-w-[200px] truncate">
                      {session.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
