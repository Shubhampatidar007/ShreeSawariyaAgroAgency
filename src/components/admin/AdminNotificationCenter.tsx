import { useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, CircleAlert, Info } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useShopStore } from "@/lib/shop-store";
import { supabase } from "@/integrations/supabase/client";
import { formatIndianCompactCurrency, formatIndianDate } from "@/lib/indian-format";
import type { AdminNotification } from "@/types";

const iconByType = {
  critical: CircleAlert,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
} as const;

const iconClassByType = {
  critical: "text-destructive bg-destructive/10",
  warning: "text-warning bg-warning/10",
  success: "text-success bg-success/10",
  info: "text-primary bg-primary/10",
} as const;

export function AdminNotificationCenter() {
  const { notifications, inventory, customers } = useShopStore((state) => state);
  const [localRead, setLocalRead] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fallbackNotifications = useMemo<AdminNotification[]>(() => {
    if (notifications.length > 0) return [];

    const generated: AdminNotification[] = [];
    const lowStockCount = inventory.filter((item) => item.quantity <= item.minStockLevel).length;
    const due = customers.reduce((sum, customer) => sum + customer.currentDue, 0);
    const dueCustomers = customers.filter((customer) => customer.currentDue > 0).length;

    if (lowStockCount > 0) {
      generated.push({
        id: "system-low-stock",
        title: `${lowStockCount} low-stock item${lowStockCount === 1 ? "" : "s"}`,
        body: "Review inventory before the next sale cycle.",
        type: lowStockCount > 3 ? "critical" : "warning",
        link: "/admin/inventory",
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    if (due > 0) {
      generated.push({
        id: "system-customer-dues",
        title: `${formatIndianCompactCurrency(due)} customer dues`,
        body: `${dueCustomers} account${dueCustomers === 1 ? "" : "s"} currently has an outstanding balance.`,
        type: "warning",
        link: "/admin/customers",
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    if (generated.length === 0) {
      generated.push({
        id: "system-healthy",
        title: "Operations look healthy",
        body: "No critical stock or customer due alerts are currently detected.",
        type: "success",
        link: "/admin",
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    return generated;
  }, [customers, inventory, notifications.length]);

  const items = notifications.length > 0 ? notifications : fallbackNotifications;
  const unreadCount = items.filter((item) => !item.isRead && !localRead.has(item.id)).length;

  const markRead = async (notification: AdminNotification) => {
    if (notification.id.startsWith("system-")) {
      setLocalRead((current) => new Set(current).add(notification.id));
      return;
    }

    setUpdatingId(notification.id);
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
      if (error) throw error;
      setLocalRead((current) => new Set(current).add(notification.id));
    } finally {
      setUpdatingId(null);
    }
  };

  const markAllRead = async () => {
    const databaseIds = items.filter((item) => !item.id.startsWith("system-") && !item.isRead).map((item) => item.id);
    if (databaseIds.length === 0) {
      setLocalRead(new Set(items.map((item) => item.id)));
      return;
    }

    setUpdatingId("all");
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", databaseIds);
      if (error) throw error;
      setLocalRead(new Set(items.map((item) => item.id)));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-10 rounded-full" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <Badge className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full border-2 border-card bg-destructive p-0 text-[10px] text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(92vw,380px)] overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Operational alerts and system updates</p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" disabled={unreadCount === 0 || updatingId === "all"} onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        </div>

        <div className="max-h-[min(70vh,520px)] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            items.slice(0, 12).map((notification) => {
              const Icon = iconByType[notification.type];
              const read = notification.isRead || localRead.has(notification.id);
              const content = (
                <div className={`flex gap-3 rounded-xl p-3 transition-colors ${read ? "opacity-65 hover:opacity-100" : "bg-muted/40"}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconClassByType[notification.type]}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-5">{notification.title}</p>
                      {!read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /> : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.body}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">{formatIndianDate(notification.createdAt, { day: "2-digit", month: "short" })}</span>
                      {updatingId === notification.id ? <span className="text-[10px] text-muted-foreground">Updating…</span> : null}
                    </div>
                  </div>
                </div>
              );

              return (
                <DropdownMenuItem key={notification.id} asChild className="cursor-pointer rounded-xl p-0 focus:bg-transparent">
                  {notification.link ? (
                    <Link to={notification.link} onClick={() => { if (!read) void markRead(notification); }}>
                      {content}
                    </Link>
                  ) : (
                    <button type="button" className="w-full text-left" onClick={() => { if (!read) void markRead(notification); }}>
                      {content}
                    </button>
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
          {unreadCount ? `${unreadCount} notification${unreadCount === 1 ? "" : "s"} need your attention.` : "You're all caught up."}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
