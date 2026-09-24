import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); 

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    
    if (!token) {
      setIsCheckingAuth(false);
      return;
    }

    apiClient
      .get("/auth/me")
      .then((response) => {
        setCurrentUser(response.data.data);
        setIsCheckingAuth(false);
      })
      .catch(() => {
        localStorage.clear();
        setCurrentUser(null);
        setIsCheckingAuth(false);
      });
  }, []);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiClient.post("/auth/login", { email, password });
      const { access_token, refresh_token } = response.data.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);

      const profileResponse = await apiClient.get("/auth/me");
      const userData = profileResponse.data.data;
      setCurrentUser(userData);

      return userData;
    },
    onSuccess: () => {
      queryClient.clear();
      router.push("/");
    },
  });

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout-all");
    } catch (e) {
    }
    localStorage.clear();
    setCurrentUser(null);
    queryClient.clear();
    router.push("/login");
  };

  const isAuthenticated = !isCheckingAuth && !!currentUser;

  return {
    login: loginMutation.mutate,
    isLoading: loginMutation.isPending,
    error: loginMutation.error,
    logout,
    isAuthenticated,
    isCheckingAuth, 
    currentUser,
  };
}
