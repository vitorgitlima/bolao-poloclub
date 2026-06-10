"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error";
type Toast = { id: number; message: string; type: ToastType };
type ToastCtx = { showToast: (message: string, type?: ToastType) => void };

const ToastContext = createContext<ToastCtx>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl",
              "text-sm font-semibold animate-in slide-in-from-bottom-3 fade-in duration-200",
              toast.type === "success"
                ? "bg-green-600 text-white shadow-green-900/40"
                : "bg-red-600 text-white shadow-red-900/40"
            )}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
