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
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-card z-50 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-white text-sm font-bold">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-white/40 hover:text-white text-xs transition-colors"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-white/30 text-sm">
                Nenhuma notificação ainda
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 transition-colors hover:bg-white/5 border-l-2",
                    n.isRead
                      ? "border-l-transparent"
                      : n.type === "MISSING_PREDICTION"
                        ? "border-l-yellow-400/60 bg-white/5"
                        : "border-l-green-400/60 bg-white/5"
                  )}
                >
                  <p className={cn("text-sm font-semibold leading-tight", n.isRead ? "text-white/50" : "text-white")}>
                    {n.title}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5 leading-snug">{n.body}</p>
                  <p className="text-white/20 text-[10px] mt-1">
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
