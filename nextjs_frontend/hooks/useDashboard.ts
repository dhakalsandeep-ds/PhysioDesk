import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { DashboardStats } from "@/types/dashboard";

const extractData = <T,>(response: any): T => response.data.data;

export function useDashboardStats(limit: number = 5) {
  return useQuery({
    queryKey: ["dashboardStats", limit],
    queryFn: async () => {
      const response = await apiClient.get(`/dashboard/stats?limit=${limit}`);
      return extractData<DashboardStats>(response);
    },
    refetchInterval: 60 * 1000, 
  });
}
