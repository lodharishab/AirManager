import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProperties, useBookings, useRevenueChartData, useDashboardStats, useTopGuests } from "@/lib/api";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  TrendingUp, 
  Users, 
  Home, 
  CalendarCheck, 
  Loader2,
  Plus,
  Sparkles
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from "@shared/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: propertiesResult, isLoading: propsLoading } = useProperties({ page: 1, limit: 10000 });
  const { data: bookingsResult, isLoading: bookingsLoading } = useBookings({ page: 1, limit: 4 });
  const { data: revenueChartData, isLoading: revenueLoading } = useRevenueChartData();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: topGuests } = useTopGuests(5);

  const properties = useMemo(() => propertiesResult?.data || [], [propertiesResult]);
  const recentBookings = useMemo(() => bookingsResult?.data || [], [bookingsResult]);

  const { primaryCurrency, hasMixedCurrencies, currencyCodes } = useMemo(() => {
    const codes = Array.from(new Set(properties.map(p => p.currency || "INR")));
    return {
      primaryCurrency: codes[0] || "INR",
      hasMixedCurrencies: codes.length > 1,
      currencyCodes: codes,
    };
  }, [properties]);

  useEffect(() => {
    const isDemo = new URLSearchParams(window.location.search).get("demo") === "true";
    if (propertiesResult && properties.length === 0 && isDemo) {
      const seedDemo = async () => {
        try {
          await apiRequest("POST", "/api/seed-demo");
          toast({
            title: "Demo Data Loaded",
            description: "Sample international property data has been added to your dashboard.",
          });
          queryClient.invalidateQueries();
          setLocation("/");
        } catch (error: unknown) {
          toast({
            title: "Failed to load demo data",
            description: (error instanceof Error ? error.message : String(error)),
            variant: "destructive",
          });
        }
      };
      seedDemo();
    }
  }, [propertiesResult, properties.length, setLocation, toast]);

  const isLoading = propsLoading || bookingsLoading || revenueLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const monthlyRevenueData = revenueChartData || [];

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Home className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary mb-2">Welcome to AirManager</h1>
          <p className="text-muted-foreground max-w-md">Your short-term rental management hub. Get started by adding your first property to unlock the dashboard.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/properties">
            <Button data-testid="button-get-started" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm hover:shadow-md transition-all px-6 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add your first property
            </Button>
          </Link>
          <Button 
            data-testid="button-load-demo" 
            variant="outline"
            className="rounded-xl px-6 border-primary/20 text-primary hover:bg-primary/5 w-full sm:w-auto"
            onClick={() => setLocation("/?demo=true")}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Load Demo Data
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-dashboard-title" className="text-3xl font-bold tracking-tight font-serif text-primary">Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your properties.</p>
        </div>
        <Link href="/properties">
          <Button data-testid="button-add-property" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm hover:shadow-md transition-all">
            Add New Property
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Booking Value</p>
                <p data-testid="text-total-revenue" className="text-3xl font-bold font-serif">{formatCurrency(stats?.totalMonthlyRevenue || 0, primaryCurrency)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {hasMixedCurrencies ? (
                <span className="text-muted-foreground text-xs">Mixed currencies: {currencyCodes.join(", ")}</span>
              ) : (
                <span className="text-muted-foreground text-xs">All reservation dates; excludes cancellations and blocked dates</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Avg. Occupancy</p>
                <p data-testid="text-avg-occupancy" className="text-3xl font-bold font-serif">{stats?.averageOccupancy || 0}%</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                <Users size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground text-xs">Booked room-nights this calendar month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Active Properties</p>
                <p data-testid="text-active-properties" className="text-3xl font-bold font-serif">{stats?.activeProperties || 0}<span className="text-lg text-muted-foreground font-normal font-sans">/{stats?.totalProperties || 0}</span></p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Home size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">
                {(stats?.totalProperties || 0) - (stats?.activeProperties || 0)} property in maintenance
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Upcoming Bookings</p>
                <p data-testid="text-upcoming-bookings" className="text-3xl font-bold font-serif">{stats?.upcomingBookings || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <CalendarCheck size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-primary font-medium mr-2">{stats?.currentBookings || 0}</span>
              <span className="text-muted-foreground">guests currently staying</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-2xl shadow-sm overflow-hidden border-border">
          <CardHeader className="border-b bg-secondary/30 pb-4">
            <CardTitle className="text-lg font-semibold text-primary font-serif tracking-wide">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[200px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `${value/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => [formatCurrency(value, primaryCurrency), 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm overflow-hidden flex flex-col border-border">
          <CardHeader className="border-b bg-secondary/30 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-primary font-serif tracking-wide">Recent Bookings</CardTitle>
            <Link href="/bookings">
              <span className="text-sm text-primary font-medium hover:underline cursor-pointer">View All</span>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <div className="divide-y">
              {recentBookings.map((booking) => {
                const property = properties.find(p => p.id === booking.propertyId);
                return (
                  <div key={booking.id} data-testid={`card-booking-${booking.id}`} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{booking.guestName}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{property?.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(booking.checkIn), "MMM d")} - {format(parseISO(booking.checkOut), "MMM d")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(booking.totalAmount, properties.find(p => p.id === booking.propertyId)?.currency)}</p>
                      <Badge 
                        variant="outline" 
                        className={`mt-2 text-[10px] uppercase tracking-wider ${
                          booking.status === 'current' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                          booking.status === 'upcoming' ? 'bg-primary/10 text-primary border-primary/20' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {topGuests && topGuests.length > 0 && (
        <Card className="rounded-2xl shadow-sm overflow-hidden border-border">
          <CardHeader className="border-b bg-secondary/30 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-primary font-serif tracking-wide">Top Guests</CardTitle>
            <Link href="/guests">
              <span className="text-sm text-primary font-medium hover:underline cursor-pointer">View All</span>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {topGuests.map((guest) => (
                <Link key={guest.id} href={`/guests/${guest.id}`}>
                  <div data-testid={`card-top-guest-${guest.id}`} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {guest.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{guest.name}</p>
                        <p className="text-xs text-muted-foreground">{guest.totalStays} {guest.totalStays === 1 ? "stay" : "stays"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(guest.totalSpent || 0, primaryCurrency)}</p>
                      {guest.tags && guest.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 justify-end">
                          {guest.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-[9px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
