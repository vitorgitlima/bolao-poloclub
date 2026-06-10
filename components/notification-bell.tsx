"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  matchId: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    const onVisibility = () => { if (!document.hidden) fetchNotifications(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchNotifications]);

  // Click outside closes panel
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex items-center justify-center w-8 h-8 rounded-lg transition-all",
          open
            ? "bg-white/15 text-white"
            : "text-white/50 hover:text-white hover:bg-white/10"
        )}
        title="Notificações"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-0.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed top-[60px] right-3 sm:right-4 w-[calc(100vw-24px)] sm:w-96 z-[300] rounded-2xl overflow-hidden"
          style={{
            background: "rgba(6, 14, 28, 0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
            <span className="text-white text-sm font-bold tracking-wide">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-white/40 hover:text-white/80 text-xs transition-colors"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-white/40 text-sm">Nenhuma notificação ainda</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 transition-colors border-l-[3px] border-b border-b-white/5 last:border-b-0",
                    n.isRead
                      ? "border-l-transparent hover:bg-white/[0.03]"
                      : n.type === "MISSING_PREDICTION"
                        ? "border-l-yellow-400 bg-yellow-400/[0.06] hover:bg-yellow-400/[0.09]"
                        : "border-l-green-400 bg-green-400/[0.06] hover:bg-green-400/[0.09]"
                  )}
                >
                  <p className={cn(
                    "text-sm font-semibold leading-tight",
                    n.isRead ? "text-white/45" : "text-white"
                  )}>
                    {n.title}
                  </p>
                  <p className={cn(
                    "text-xs mt-1 leading-snug",
                    n.isRead ? "text-white/25" : "text-white/60"
                  )}>
                    {n.body}
                  </p>
                  <p className="text-white/25 text-[10px] mt-1.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
