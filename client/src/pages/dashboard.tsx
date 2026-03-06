import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockProperties, mockBookings, monthlyRevenueData } from "@/lib/mock-data";
import { 
  TrendingUp, 
  Users, 
  Home, 
  CalendarCheck, 
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
  const activeProperties = mockProperties.filter(p => p.status === 'active').length;
  const currentBookings = mockBookings.filter(b => b.status === 'current').length;
  const upcomingBookings = mockBookings.filter(b => b.status === 'upcoming').length;
  
  const totalMonthlyRevenue = mockProperties.reduce((sum, p) => sum + p.monthlyRevenue, 0);
  const averageOccupancy = Math.round(mockProperties.reduce((sum, p) => sum + p.occupancyRate, 0) / mockProperties.length);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your properties.</p>
        </div>
        <Link href="/properties">
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm hover:shadow-md transition-all">
            Add New Property
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">${totalMonthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success flex items-center font-medium">
                <ArrowUpRight size={16} className="mr-1" />
                12.5%
              </span>
              <span className="text-muted-foreground ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Avg. Occupancy</p>
                <p className="text-3xl font-bold">{averageOccupancy}%</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                <Users size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success flex items-center font-medium">
                <ArrowUpRight size={16} className="mr-1" />
                4.2%
              </span>
              <span className="text-muted-foreground ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Active Properties</p>
                <p className="text-3xl font-bold">{activeProperties}<span className="text-lg text-muted-foreground font-normal">/{mockProperties.length}</span></p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Home size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">1 property in maintenance</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Upcoming Bookings</p>
                <p className="text-3xl font-bold">{upcomingBookings}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <CalendarCheck size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-primary font-medium mr-2">{currentBookings}</span>
              <span className="text-muted-foreground">guests arriving today</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 rounded-2xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b bg-gray-50/50 pb-4">
            <CardTitle className="text-lg font-semibold">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
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
                    tickFormatter={(value) => `$${value/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
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

        {/* Recent Bookings */}
        <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="border-b bg-gray-50/50 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Bookings</CardTitle>
            <Link href="/bookings">
              <a className="text-sm text-primary font-medium hover:underline">View All</a>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <div className="divide-y">
              {mockBookings.slice(0, 4).map((booking) => {
                const property = mockProperties.find(p => p.id === booking.propertyId);
                return (
                  <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{booking.guestName}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{property?.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(booking.checkIn), "MMM d")} - {format(parseISO(booking.checkOut), "MMM d")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">${booking.totalAmount}</p>
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
    </div>
  );
}