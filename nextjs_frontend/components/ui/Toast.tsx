"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";

type ToastType = "error" | "success" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "error") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleGlobalError = (event: Event) => {
      const customEvent = event as CustomEvent;
      addToast(customEvent.detail, "error");
    };
    window.addEventListener("global-error", handleGlobalError);
    return () => window.removeEventListener("global-error", handleGlobalError);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-card border animate-in slide-in-from-right-full duration-300 ${
              toast.type === "error"
                ? "bg-danger-soft border-danger/20 text-danger"
                : toast.type === "success"
                ? "bg-tertiary-soft border-tertiary/20 text-tertiary"
                : "bg-surface border-border text-text-primary"
            }`}
          >
            {toast.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
            {toast.type === "success" && <CheckCircle className="w-5 h-5 shrink-0" />}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-black/5 rounded transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}

