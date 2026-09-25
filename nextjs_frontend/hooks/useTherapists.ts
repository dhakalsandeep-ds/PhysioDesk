 
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { Therapist, TherapistCreate, ScheduleOverrideCreate } from "@/types/therapist";

const extractData = <T,>(response: any): T => response.data.data;

export function useTherapists() {
  return useQuery({
    queryKey: ["therapists"],
    queryFn: async () => {
      const response = await apiClient.get("/therapists");
      
     
      
      const extracted = extractData<Therapist[]>(response);
   
      
      return extracted;
    },
  });
}

export function useCreateTherapist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TherapistCreate) => apiClient.post("/therapists", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["therapists"] }),
  });
}      

export function useUpdateTherapist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TherapistCreate> }) =>
      apiClient.put(`/therapists/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["therapists"] }),
  });
}

export function useDeleteTherapist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/therapists/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["therapists"] }),
  });
}

export function useCreateScheduleOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ScheduleOverrideCreate) =>
      apiClient.post("/therapists/override", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["therapists"] }),
  });
}
