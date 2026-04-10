import { useState, useMemo } from "react";
import { useExpenses, useProperties, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/lib/api";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  TrendingUp,
  Calendar,
  ArrowUpDown,
  ExternalLink,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { expenseCategories, type ExpenseCategory, type InsertExpense } from "@shared/schema";
import { formatCurrency } from "@shared/currency";

const categoryColors: Record<string, string> = {
  maintenance: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  utilities: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  supplies: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cleaning: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  staff: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  insurance: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  taxes: "bg-red-500/10 text-red-600 border-red-500/20",
  other: "bg-muted text-muted-foreground border-border",
};

type SortField = "date" | "amount" | "category" | "property";
type SortDir = "asc" | "desc";

const emptyForm = {
  propertyId: 0,
  category: "" as string,
  amount: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
  receiptUrl: "",
};

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [form, setForm] = useState(emptyForm);

  const { data: expensesResult, isLoading } = useExpenses();
  const { data: propertiesResult } = useProperties({ page: 1, limit: 10000 });
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const { toast } = useToast();

  const allExpenses = expensesResult?.data || [];
  const allProperties = propertiesResult?.data || [];

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthExpenses = allExpenses
    .filter((e) => {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const topCategory = useMemo(() => {
    const catTotals: Record<string, number> = {};
    allExpenses.forEach((e) => {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });
    let topCat = "";
    let topAmount = 0;
    for (const [cat, total] of Object.entries(catTotals)) {
      if (total > topAmount) {
        topCat = cat;
        topAmount = total;
      }
    }
    return { category: topCat, amount: topAmount };
  }, [allExpenses]);

  const filteredExpenses = useMemo(() => {
    let filtered = allExpenses.filter((expense) => {
      const matchesSearch =
        (expense.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
      const matchesProperty = propertyFilter === "all" || expense.propertyId === Number(propertyFilter);

      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && expense.date >= dateFrom;
      }
      if (dateTo) {
        matchesDate = matchesDate && expense.date <= dateTo;
      }

      return matchesSearch && matchesCategory && matchesProperty && matchesDate;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "property": {
          const pA = allProperties.find((p) => p.id === a.propertyId)?.name || "";
          const pB = allProperties.find((p) => p.id === b.propertyId)?.name || "";
          cmp = pA.localeCompare(pB);
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [allExpenses, searchTerm, categoryFilter, propertyFilter, dateFrom, dateTo, sortField, sortDir, allProperties]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const openEditDialog = (expense: typeof allExpenses[0]) => {
    setEditingId(expense.id);
    setForm({
      propertyId: expense.propertyId,
      category: expense.category,
      amount: String(expense.amount),
      description: expense.description || "",
      date: expense.date,
      receiptUrl: expense.receiptUrl || "",
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.propertyId || !form.category || !form.amount || !form.date) {
      toast({ title: "Please fill in property, category, amount, and date", variant: "destructive" });
      return;
    }
    const amount = Number(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Amount must be a positive number", variant: "destructive" });
      return;
    }

    const payload: InsertExpense = {
      propertyId: form.propertyId,
      category: form.category,
      amount,
      description: form.description || null,
      date: form.date,
      receiptUrl: form.receiptUrl || null,
    };

    if (editingId) {
      updateExpense.mutate({ id: editingId, ...payload }, {
        onSuccess: () => {
          toast({ title: "Expense updated successfully" });
          setDialogOpen(false);
          setEditingId(null);
        },
      });
    } else {
      createExpense.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Expense created successfully" });
          setDialogOpen(false);
        },
      });
    }
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteExpense.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Expense deleted" });
        setDeleteId(null);
      },
    });
  };

  const [exportingCSV, setExportingCSV] = useState(false);

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const params = new URLSearchParams();
      if (propertyFilter !== "all") params.set("propertyId", propertyFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (searchTerm) params.set("search", searchTerm);
      const queryString = params.toString();
      const url = `/api/export/expenses${queryString ? `?${queryString}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast({ title: "Expenses exported successfully" });
    } catch {
      toast({ title: "Failed to export expenses", variant: "destructive" });
    } finally {
      setExportingCSV(false);
    }
  };

  const getPropertyCurrency = (propertyId: number) => {
    return allProperties.find(p => p.id === propertyId)?.currency || "USD";
  };

  const expenseTotalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    allExpenses.forEach(e => {
      const cur = getPropertyCurrency(e.propertyId);
      totals[cur] = (totals[cur] || 0) + e.amount;
    });
    return totals;
  }, [allExpenses, allProperties]);

  const monthlyTotalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    allExpenses
      .filter(e => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      })
      .forEach(e => {
        const cur = getPropertyCurrency(e.propertyId);
        totals[cur] = (totals[cur] || 0) + e.amount;
      });
    return totals;
  }, [allExpenses, allProperties, monthStart, monthEnd]);

  const formatMultiCurrency = (totals: Record<string, number>) => {
    const entries = Object.entries(totals);
    if (entries.length === 0) return formatCurrency(0, "USD");
    if (entries.length === 1) return formatCurrency(entries[0][1], entries[0][0]);
    return entries.map(([code, amount]) => formatCurrency(amount, code)).join(" + ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 data-testid="text-expenses-title" className="text-3xl font-bold tracking-tight font-serif text-primary">
            Expenses
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage property costs and spending.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            data-testid="button-export-expenses"
            variant="outline"
            className="rounded-xl shadow-sm"
            onClick={handleExportCSV}
            disabled={exportingCSV}
          >
            {exportingCSV ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {exportingCSV ? "Exporting..." : "Export CSV"}
          </Button>
          <Button data-testid="button-add-expense" className="rounded-xl shadow-sm text-primary-foreground" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> New Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-expenses" className="p-5 rounded-2xl border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-foreground">{formatMultiCurrency(expenseTotalsByCurrency)}</p>
            </div>
          </div>
        </Card>

        <Card data-testid="card-monthly-expenses" className="p-5 rounded-2xl border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-secondary/10">
              <Calendar className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold text-foreground">{formatMultiCurrency(monthlyTotalsByCurrency)}</p>
            </div>
          </div>
        </Card>

        <Card data-testid="card-top-category" className="p-5 rounded-2xl border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top Category</p>
              <p className="text-2xl font-bold text-foreground capitalize">{topCategory.category || "—"}</p>
              {topCategory.amount > 0 && (
                <p className="text-xs text-muted-foreground">{formatCurrency(topCategory.amount, Object.keys(expenseTotalsByCurrency)[0] || "USD")}</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="shadow-sm rounded-2xl overflow-hidden border-border">
        <div className="p-4 border-b border-border bg-secondary/20 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-search-expenses"
                placeholder="Search by description..."
                className="pl-9 rounded-xl bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger data-testid="select-filter-property" className="w-[180px] rounded-xl bg-background">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {allProperties.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-filter-category" className="w-[160px] rounded-xl bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Date Range:</Label>
            <Input
              data-testid="input-date-from"
              type="date"
              className="rounded-xl bg-background w-full sm:w-40 text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              data-testid="input-date-to"
              type="date"
              className="rounded-xl bg-background w-full sm:w-40 text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            {(dateFrom || dateTo) && (
              <Button
                data-testid="button-clear-dates"
                variant="ghost"
                size="sm"
                className="text-xs min-h-[44px]"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow className="hover:bg-transparent border-b-border">
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("date")}>
                  <div className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("property")}>
                  <div className="flex items-center gap-1">
                    Property
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("category")}>
                  <div className="flex items-center gap-1">
                    Category
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Description</TableHead>
                <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("amount")}>
                  <div className="flex items-center gap-1 justify-end">
                    Amount
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="hidden md:table-cell">Receipt</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => {
                  const property = allProperties.find((p) => p.id === expense.propertyId);
                  return (
                    <TableRow
                      key={expense.id}
                      data-testid={`row-expense-${expense.id}`}
                      className="hover:bg-muted/30 transition-colors border-b-border/50"
                    >
                      <TableCell className="font-medium text-sm">
                        {format(parseISO(expense.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{property?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`uppercase tracking-wider text-[10px] ${categoryColors[expense.category] || categoryColors.other}`}
                        >
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[250px]">
                        <span className="text-muted-foreground text-sm line-clamp-2">{expense.description || "—"}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatCurrency(expense.amount, getPropertyCurrency(expense.propertyId))}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {expense.receiptUrl ? (
                          <a
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                            data-testid={`link-receipt-${expense.id}`}
                          >
                            <ExternalLink className="h-3 w-3" /> View
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            data-testid={`button-edit-expense-${expense.id}`}
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-muted-foreground hover:text-primary"
                            onClick={() => openEditDialog(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            data-testid={`button-delete-expense-${expense.id}`}
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No expenses found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((expense) => {
              const property = allProperties.find((p) => p.id === expense.propertyId);
              return (
                <div key={expense.id} data-testid={`card-expense-mobile-${expense.id}`} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`uppercase tracking-wider text-[10px] ${categoryColors[expense.category] || categoryColors.other}`}
                        >
                          {expense.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{format(parseISO(expense.date), "MMM d, yyyy")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">{property?.name || "—"}</p>
                      {expense.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{expense.description}</p>
                      )}
                    </div>
                    <p className="font-semibold text-sm shrink-0">{"\u20B9"}{formatINR(expense.amount)}</p>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {expense.receiptUrl && (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-xs p-2 min-h-[44px] min-w-[44px] justify-center"
                      >
                        <ExternalLink className="h-3 w-3" /> Receipt
                      </a>
                    )}
                    <Button
                      data-testid={`button-edit-expense-mobile-${expense.id}`}
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 text-muted-foreground hover:text-primary"
                      onClick={() => openEditDialog(expense)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      data-testid={`button-delete-expense-mobile-${expense.id}`}
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No expenses found matching your criteria.
            </div>
          )}
        </div>

        <div className="p-4 border-t text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Showing {filteredExpenses.length} of {allExpenses.length} expenses</span>
          {filteredExpenses.length > 0 && (
            <span className="font-medium text-foreground">
              Total: {formatMultiCurrency(filteredExpenses.reduce((acc, e) => {
                const cur = getPropertyCurrency(e.propertyId);
                acc[cur] = (acc[cur] || 0) + e.amount;
                return acc;
              }, {} as Record<string, number>))}
            </span>
          )}
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-primary">
              {editingId ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Property *</Label>
              <Select
                value={form.propertyId ? String(form.propertyId) : ""}
                onValueChange={(val) => setForm((prev) => ({ ...prev, propertyId: Number(val) }))}
              >
                <SelectTrigger data-testid="select-expense-property">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {allProperties.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm((prev) => ({ ...prev, category: val }))}
              >
                <SelectTrigger data-testid="select-expense-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  data-testid="input-expense-amount"
                  type="number"
                  min="1"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  data-testid="input-expense-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                data-testid="input-expense-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What was this expense for?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Receipt URL</Label>
              <Input
                data-testid="input-expense-receipt"
                type="url"
                value={form.receiptUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, receiptUrl: e.target.value }))}
                placeholder="https://example.com/receipt.pdf"
              />
            </div>

            <Button
              data-testid="button-submit-expense"
              className="w-full text-primary-foreground"
              onClick={handleSubmit}
              disabled={createExpense.isPending || updateExpense.isPending}
            >
              {(createExpense.isPending || updateExpense.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Update Expense" : "Add Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
