"use client";

import { SideBar } from "@/components/ui/SideBar";
import { TopBar } from "@/components/ui/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ClientAppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isCheckingAuth } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isCheckingAuth && !isAuthenticated) {
      router.push("/login");
    }
  }, [isMounted, isCheckingAuth, isAuthenticated, router]);

  if (!isMounted || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary font-medium">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <SideBar />
      <main className="flex-1 flex flex-col bg-background">
        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
