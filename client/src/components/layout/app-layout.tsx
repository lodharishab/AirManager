import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Home,
  CalendarDays,
  CalendarRange,
  Settings,
  MessageSquare,
  Search,
  Menu,
  ImageIcon,
  HelpCircle,
  Star,
  LogOut,
  LogIn,
  X,
  Receipt,
  ClipboardList,
  BarChart2,
  Users,
  BellRing,
  IndianRupee,
  Sun,
  Moon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import NotificationDropdown from "@/components/notifications/notification-dropdown";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Properties", path: "/properties", icon: Home },
  { name: "Bookings", path: "/bookings", icon: CalendarDays },
  { name: "Guests", path: "/guests", icon: Users },
  { name: "Check-ins", path: "/check-ins", icon: LogIn },
  { name: "Calendar", path: "/calendar", icon: CalendarRange },
  { name: "Analytics", path: "/analytics", icon: BarChart2 },
  { name: "Messages", path: "/messages", icon: MessageSquare },
  { name: "Enquiries", path: "/enquiries", icon: HelpCircle },
  { name: "Follow-ups", path: "/follow-ups", icon: BellRing },
  { name: "AI Pricing", path: "/pricing", icon: IndianRupee },
  { name: "Housekeeping", path: "/housekeeping", icon: ClipboardList },
  { name: "Expenses", path: "/expenses", icon: Receipt },
  { name: "Reviews", path: "/reviews", icon: Star },
  { name: "Gallery", path: "/gallery", icon: ImageIcon },
];

function ThemeToggleSidebar() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      data-testid="button-theme-toggle-sidebar"
      onClick={toggleTheme}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:bg-muted hover:text-foreground w-full"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
    </button>
  );
}

function ThemeToggleHeader() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      data-testid="button-theme-toggle"
      onClick={toggleTheme}
      className="h-8 w-8 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast({ title: "Logout failed", variant: "destructive" });
    }
  };

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Home size={16} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">AirManager</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
            data-testid="button-close-menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 pt-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 space-y-0.5 border-t border-border pt-3 mt-3">
        <ThemeToggleSidebar />
        <Link
          href="/settings"
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
            location === "/settings"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Settings size={18} />
          Settings
        </Link>

        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-[11px] bg-primary/15 text-primary font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <span data-testid="text-username" className="text-sm font-medium text-foreground flex-1 truncate">
            {user?.username}
          </span>
          <button
            data-testid="button-logout"
            onClick={handleLogout}
            title="Sign out"
            className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const [location] = useLocation();

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card/50 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-50 w-72 max-w-[85vw] bg-card border-r border-border flex flex-col h-full animate-in slide-in-from-left duration-300">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 md:h-16 border-b border-border bg-card/30 backdrop-blur-sm flex items-center justify-between px-4 md:px-5 sticky top-0 z-30">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              data-testid="button-open-menu"
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Home size={14} className="text-primary-foreground" />
              </div>
              <span className="font-bold text-base tracking-tight text-foreground">AirManager</span>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2 w-80 border border-border/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search properties, guests..."
                className="bg-transparent border-none outline-none w-full text-sm placeholder:text-muted-foreground text-foreground"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <ThemeToggleHeader />
            <NotificationDropdown />
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-[11px] font-bold text-primary">{userInitials}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
