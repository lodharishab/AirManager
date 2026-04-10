import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "@/lib/api";
import { useProperties } from "@/lib/api";
import { Loader2, TrendingUp, BarChart3, PieChart, DollarSign, FileDown } from "lucide-react";
import { formatCurrency, getCurrencySymbol } from "@shared/currency";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const GOLD_PALETTE = [
  "hsl(var(--primary))",
  "hsl(43, 60%, 55%)",
  "hsl(36, 70%, 50%)",
  "hsl(25, 80%, 55%)",
  "hsl(15, 75%, 55%)",
  "hsl(200, 60%, 55%)",
];

const STATUS_COLORS: Record<string, string> = {
  upcoming: "hsl(var(--primary))",
  current: "hsl(142, 60%, 50%)",
  completed: "hsl(220, 60%, 60%)",
  cancelled: "hsl(0, 60%, 55%)",
};

function formatAmount(amount: number, currency: string = "USD") {
  return formatCurrency(amount, currency);
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon size={16} className="text-primary" />
      </div>
      <h2 className="text-xl font-semibold font-serif text-primary">{title}</h2>
    </div>
  );
}

export default function Analytics() {
  const { data: propertiesResult } = useProperties({ page: 1, limit: 10000 });
  const properties = propertiesResult?.data || [];
  const { toast } = useToast();
  const primaryCurrency = properties.length > 0 ? (properties[0].currency || "USD") : "USD";

  const today = new Date();
  const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

  const [startDate, setStartDate] = useState(yearAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [propertyId, setPropertyId] = useState("all");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(yearAgo.toISOString().split("T")[0]);
  const [reportEndDate, setReportEndDate] = useState(today.toISOString().split("T")[0]);
  const [reportPropertyId, setReportPropertyId] = useState("all");

  const handleGenerateReport = async () => {
    setGeneratingPDF(true);
    try {
      const params = new URLSearchParams();
      if (reportStartDate) params.set("startDate", reportStartDate);
      if (reportEndDate) params.set("endDate", reportEndDate);
      if (reportPropertyId !== "all") params.set("propertyId", reportPropertyId);
      const queryString = params.toString();
      const url = `/api/export/revenue-report${queryString ? `?${queryString}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Report generation failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `revenue-report-${new Date().toISOString().split("T")[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast({ title: "Revenue report generated successfully" });
      setReportDialogOpen(false);
    } catch {
      toast({ title: "Failed to generate report", variant: "destructive" });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const { data: analytics, isLoading } = useAnalytics({
    startDate,
    endDate,
    propertyId: propertyId === "all" ? undefined : propertyId,
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-analytics-title" className="text-3xl font-bold tracking-tight font-serif text-primary">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep insights into revenue, occupancy, and booking performance.</p>
        </div>
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-generate-report" className="rounded-xl shadow-sm text-primary-foreground">
              <FileDown className="mr-2 h-4 w-4" /> Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-primary">Generate Revenue Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Generate a PDF revenue report with property breakdown, monthly summaries, and totals.
              </p>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">From</Label>
                <Input
                  data-testid="input-report-start-date"
                  type="date"
                  value={reportStartDate}
                  onChange={e => setReportStartDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">To</Label>
                <Input
                  data-testid="input-report-end-date"
                  type="date"
                  value={reportEndDate}
                  onChange={e => setReportEndDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Property</Label>
                <Select value={reportPropertyId} onValueChange={setReportPropertyId}>
                  <SelectTrigger data-testid="select-report-property" className="rounded-xl">
                    <SelectValue placeholder="All properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {(properties || []).map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                data-testid="button-download-report"
                className="w-full text-primary-foreground"
                onClick={handleGenerateReport}
                disabled={generatingPDF}
              >
                {generatingPDF ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                {generatingPDF ? "Generating..." : "Download PDF Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl shadow-sm border-border">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">From</Label>
              <Input
                data-testid="input-start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">To</Label>
              <Input
                data-testid="input-end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger data-testid="select-property-filter" className="rounded-xl">
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {(properties || []).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !analytics ? null : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card data-testid="card-total-revenue" className="rounded-2xl shadow-sm border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p data-testid="text-total-revenue-value" className="text-3xl font-bold font-serif">{formatAmount(analytics.totalRevenue, primaryCurrency)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign size={18} className="text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-total-bookings" className="rounded-2xl shadow-sm border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                    <p data-testid="text-total-bookings-value" className="text-3xl font-bold font-serif">{analytics.totalBookings}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart3 size={18} className="text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-avg-booking-value" className="rounded-2xl shadow-sm border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg. Booking Value</p>
                    <p data-testid="text-avg-booking-value" className="text-3xl font-bold font-serif">{formatAmount(analytics.avgBookingValue, primaryCurrency)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp size={18} className="text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Section */}
          <div>
            <SectionHeader icon={DollarSign} title="Revenue" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue by property */}
              <Card className="rounded-2xl shadow-sm border-border overflow-hidden">
                <CardHeader className="border-b bg-secondary/30 pb-4">
                  <CardTitle className="text-base font-semibold text-primary font-serif">Revenue by Property</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {analytics.revenueByProperty.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No revenue data for the selected filters.</p>
                  ) : (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.revenueByProperty} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="propertyName"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            angle={-30}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }}
                            formatter={(value: number) => [formatAmount(value, primaryCurrency), "Revenue"]}
                          />
                          <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                            {analytics.revenueByProperty.map((_entry, i) => (
                              <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly revenue trend */}
              <Card className="rounded-2xl shadow-sm border-border overflow-hidden">
                <CardHeader className="border-b bg-secondary/30 pb-4">
                  <CardTitle className="text-base font-semibold text-primary font-serif">Monthly Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.monthlyRevenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="hsl(var(--primary))" />
                            <stop offset="100%" stopColor="hsl(43, 60%, 55%)" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }}
                          formatter={(value: number) => [formatAmount(value, primaryCurrency), "Revenue"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="url(#lineGradient)"
                          strokeWidth={3}
                          dot={{ r: 3, fill: "hsl(var(--primary))" }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Occupancy Section */}
          <div>
            <SectionHeader icon={BarChart3} title="Occupancy" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Occupancy rate per property */}
              <Card className="rounded-2xl shadow-sm border-border overflow-hidden">
                <CardHeader className="border-b bg-secondary/30 pb-4">
                  <CardTitle className="text-base font-semibold text-primary font-serif">Occupancy Rate by Property</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.occupancyByProperty} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="propertyName"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          tickFormatter={v => `${v}%`}
                          domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }}
                          formatter={(value: number) => [`${value}%`, "Occupancy Rate"]}
                        />
                        <Bar dataKey="occupancyRate" radius={[6, 6, 0, 0]}>
                          {analytics.occupancyByProperty.map((_entry, i) => (
                            <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Avg booking duration */}
              <Card className="rounded-2xl shadow-sm border-border overflow-hidden">
                <CardHeader className="border-b bg-secondary/30 pb-4">
                  <CardTitle className="text-base font-semibold text-primary font-serif">Avg. Booking Duration (nights)</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {analytics.occupancyByProperty.every(p => p.avgBookingDuration === 0) ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No booking data for the selected filters.</p>
                  ) : (
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.occupancyByProperty} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="propertyName"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            angle={-30}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            tickFormatter={v => `${v}n`}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }}
                            formatter={(value: number) => [`${value} nights`, "Avg Duration"]}
                          />
                          <Bar dataKey="avgBookingDuration" name="Avg. Nights" radius={[6, 6, 0, 0]}>
                            {analytics.occupancyByProperty.map((_entry, i) => (
                              <Cell key={i} fill={GOLD_PALETTE[(i + 2) % GOLD_PALETTE.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Financial Section */}
          <div>
            <SectionHeader icon={TrendingUp} title="Financials" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue vs Expenses */}
              <Card className="rounded-2xl shadow-sm border-border overflow-hidden">
                <CardHeader className="border-b bg-secondary/30 pb-4">
                  <CardTitle className="text-base font-semibold text-primary font-serif">Revenue vs Expenses (est.)</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {analytics.profitByProperty.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No data for the selected filters.</p>
                  ) : (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.profitByProperty} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="propertyName"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            angle={-30}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }}
                            formatter={(value: number) => [formatAmount(value, primaryCurrency)]}
                          />
                          <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
                          <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expenses" name="Expenses (est.)" fill="hsl(0, 55%, 55%)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="profit" name="Profit" fill="hsl(142, 55%, 50%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top earning properties */}
              <Card className="rounded-2xl shadow-sm border-border overflow-hidden">
                <CardHeader className="border-b bg-secondary/30 pb-4">
                  <CardTitle className="text-base font-semibold text-primary font-serif">Top Earning Properties</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {analytics.topEarningProperties.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No revenue data for the selected filters.</p>
                  ) : (
                    <div className="space-y-4 mt-2">
                      {analytics.topEarningProperties.map((p, i) => {
                        const max = analytics.topEarningProperties[0]?.revenue || 1;
                        const pct = Math.round((p.revenue / max) * 100);
                        return (
                          <div key={p.propertyId} data-testid={`row-top-property-${p.propertyId}`} className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium truncate max-w-[60%]">{p.propertyName}</span>
                              <span className="font-semibold text-primary">{formatAmount(p.revenue, primaryCurrency)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: GOLD_PALETTE[i % GOLD_PALETTE.length] }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Booking Insights Section */}
          <div>
            <SectionHeader icon={PieChart} title="Booking Insights" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Booking status pie */}
              <Card className="rounded-2xl shadow-sm border-border overflow-hidden">
                <CardHeader className="border-b bg-secondary/30 pb-4">
                  <CardTitle className="text-base font-semibold text-primary font-serif">Bookings by Status</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {analytics.bookingStatusBreakdown.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No bookings for the selected filters.</p>
                  ) : (
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={analytics.bookingStatusBreakdown}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={50}
                            paddingAngle={3}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {analytics.bookingStatusBreakdown.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={STATUS_COLORS[entry.status] || GOLD_PALETTE[i % GOLD_PALETTE.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }}
                            formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                          />
                          <Legend wrapperStyle={{ fontSize: "12px" }} formatter={v => v.charAt(0).toUpperCase() + v.slice(1)} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Busiest months */}
              <Card className="rounded-2xl shadow-sm border-border overflow-hidden">
                <CardHeader className="border-b bg-secondary/30 pb-4">
                  <CardTitle className="text-base font-semibold text-primary font-serif">Bookings by Month</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.busiestMonths} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }}
                          formatter={(value: number) => [value, "Bookings"]}
                        />
                        <Bar dataKey="bookings" radius={[4, 4, 0, 0]}>
                          {analytics.busiestMonths.map((_entry, i) => (
                            <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} fillOpacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
