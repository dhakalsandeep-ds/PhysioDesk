import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import {
  Patient,
  PatientCreate,
  SessionHistoryItem,
  BillingSummary,
  PaginatedPatientsResponse,
} from "@/types/patient";


const extractData = <T,>(response: any): T => response.data.data;


export function usePatients(filters?: {
  name_or_phone?: string;
  therapist_id?: number;
  status?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ["patients", filters],
    queryFn: async () => {
      const response = await apiClient.get("/patients", { params: filters });
      
      return extractData<any[]>(response) 
    },
  });
}

export function usePatient(patientId: number) {
  return useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const response = await apiClient.get(`/patients/${patientId}`);
      return response.data.data as Patient;
    },
    enabled: !!patientId,
  });
}

export function usePatientSessions(patientId: number) {
  return useQuery({
    queryKey: ["patient-sessions", patientId],
    queryFn: async () => {
      const response = await apiClient.get(`/patients/${patientId}/sessions`);
      return response.data.data as SessionHistoryItem[];
    },
    enabled: !!patientId,
  });
}

export function usePatientBilling(patientId: number) {
  return useQuery({
    queryKey: ["patient-billing", patientId],
    queryFn: async () => {
      const response = await apiClient.get(`/patients/${patientId}/billing`);
      return response.data.data as BillingSummary;
    },
    enabled: !!patientId,
  });
}


export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PatientCreate) => {
      const response = await apiClient.post("/patients", data);
      return response.data.data as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<PatientCreate> }) => {
      const response = await apiClient.put(`/patients/${id}`, payload);
      return response.data.data as Patient;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", variables.id] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/patients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}




export function usePatientsList() {
  return useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const response = await apiClient.get("/patients", { params: { page_size: 100 } });
      const payload = response.data.data;
      
      if (Array.isArray(payload)) return payload;
      if (payload && typeof payload === "object") {
        return payload.items || payload.results || payload.data || [];
      }
      return [];
    },
  });
}
