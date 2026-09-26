import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { UnifiedCalendarGrid, AppointmentCreate } from "@/types/schedule";

const extractData = <T,>(response: any): T => response.data.data;

export function useScheduleGrid(date: string) {
  return useQuery({
    queryKey: ["scheduleGrid", date],
    queryFn: async () => {
      const response = await apiClient.get(`/schedule/grid?date=${date}`);
      return extractData<UnifiedCalendarGrid>(response);
    },
    enabled: !!date,
    refetchOnMount: true,
    staleTime: 0, 
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AppointmentCreate) => apiClient.post("/schedule", payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["scheduleGrid"],
        exact: false,
      });
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date, time_slot }: { id: number; date: string; time_slot: string }) =>
      apiClient.put(`/schedule/${id}`, { date, time_slot }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["scheduleGrid"],
        exact: false,
      });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/schedule/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["scheduleGrid"],
        exact: false,
      });
    },
  });
}

export function useDeleteOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/schedule/override/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["scheduleGrid"],
        exact: false,
      });
    },
  });
}
