import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  Bell,
  LogIn,
  LogOut,
  HelpCircle,
  CalendarDays,
  ClipboardList,
  CheckCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/lib/api";
import type { Notification } from "@shared/schema";

function typeIcon(type: string) {
  switch (type) {
    case "check_in": return <LogIn size={14} className="text-emerald-400" />;
    case "check_out": return <LogOut size={14} className="text-amber-400" />;
    case "new_enquiry": return <HelpCircle size={14} className="text-blue-400" />;
    case "booking_status": return <CalendarDays size={14} className="text-purple-400" />;
    case "overdue_task": return <ClipboardList size={14} className="text-red-400" />;
    default: return <Bell size={14} className="text-muted-foreground" />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: number) => void;
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const isUnread = notification.isRead === 0;

  const content = (
    <div
      data-testid={`notification-item-${notification.id}`}
      className={`flex gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer ${isUnread ? "bg-primary/5" : ""}`}
      onClick={() => { if (isUnread) onRead(notification.id); }}
    >
      <div className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
        {typeIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-tight ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link}>
        {content}
      </Link>
    );
  }
  return content;
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter(n => n.isRead === 0).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        data-testid="button-notifications"
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            data-testid="badge-unread-count"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-card"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          data-testid="panel-notifications"
          className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl shadow-black/20 z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-primary/15 text-primary font-medium px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  data-testid="button-mark-all-read"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck size={12} />
                  All read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                <X size={14} />
              </Button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bell size={28} className="text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Activity like bookings and enquiries will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.slice(0, 30).map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={(id) => markRead.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
