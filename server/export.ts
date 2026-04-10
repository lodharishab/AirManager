import PDFDocument from "pdfkit";
import type { Booking, Expense, Property } from "@shared/schema";

function formatINR(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function arrayToCSV(rows: Record<string, any>[], headers?: string[], defaultHeaders?: string[]): string {
  const keys = headers || (rows.length > 0 ? Object.keys(rows[0]) : defaultHeaders || []);
  if (keys.length === 0) return "";
  const headerLine = keys.map(escapeCSV).join(",");
  const dataLines = rows.map(row =>
    keys.map(key => escapeCSV(row[key])).join(",")
  );
  return [headerLine, ...dataLines].join("\r\n");
}

export function formatBookingsForCSV(
  bookings: Booking[],
  properties: Property[]
): Record<string, any>[] {
  const propertyMap = new Map(properties.map(p => [p.id, p.name]));
  return bookings.map(b => ({
    "ID": b.id,
    "Guest Name": b.guestName,
    "Property": propertyMap.get(b.propertyId) || `Property #${b.propertyId}`,
    "Check In": b.checkIn.split("T")[0],
    "Check Out": b.checkOut.split("T")[0],
    "Status": b.status,
    "Total Amount": formatINR(b.totalAmount),
    "Notes": b.notes || "",
  }));
}

export function formatExpensesForCSV(
  expenses: Expense[],
  properties: Property[]
): Record<string, any>[] {
  const propertyMap = new Map(properties.map(p => [p.id, p.name]));
  return expenses.map(e => ({
    "ID": e.id,
    "Property": propertyMap.get(e.propertyId) || `Property #${e.propertyId}`,
    "Category": e.category,
    "Amount": formatINR(e.amount),
    "Description": e.description || "",
    "Date": e.date,
    "Receipt URL": e.receiptUrl || "",
  }));
}

interface RevenueReportData {
  period: string;
  properties: Property[];
  bookings: Booking[];
  expenses: Expense[];
}

export function generateRevenueReportPDF(data: RevenueReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const primaryColor = "#8B6914";
    const darkColor = "#1a1a1a";
    const mutedColor = "#666666";

    doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
    doc.fillColor("#ffffff").fontSize(28).font("Helvetica-Bold")
      .text("AirManager", 50, 30);
    doc.fillColor("#ffffff").fontSize(12).font("Helvetica")
      .text("Revenue Report", 50, 62);

    doc.fillColor(mutedColor).fontSize(10).font("Helvetica")
      .text(`Report Period: ${data.period}`, 50, 78, { align: "right" });

    let y = 120;

    doc.fillColor(darkColor).fontSize(10).font("Helvetica")
      .text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 50, y);
    y += 25;

    const nonCancelledBookings = data.bookings.filter(b => b.status !== "cancelled");
    const totalRevenue = nonCancelledBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold")
      .text("Summary", 50, y);
    y += 25;

    const summaryItems = [
      { label: "Total Revenue", value: formatCurrency(totalRevenue) },
      { label: "Total Expenses", value: formatCurrency(totalExpenses) },
      { label: "Net Profit", value: formatCurrency(netProfit) },
      { label: "Total Bookings", value: String(nonCancelledBookings.length) },
    ];

    const boxWidth = (doc.page.width - 120) / 4;
    summaryItems.forEach((item, i) => {
      const x = 50 + i * (boxWidth + 8);
      doc.rect(x, y, boxWidth, 55).lineWidth(1).strokeColor("#e0e0e0").stroke();
      doc.fillColor(mutedColor).fontSize(8).font("Helvetica")
        .text(item.label, x + 8, y + 8, { width: boxWidth - 16 });
      doc.fillColor(darkColor).fontSize(14).font("Helvetica-Bold")
        .text(item.value, x + 8, y + 25, { width: boxWidth - 16 });
    });
    y += 75;

    doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold")
      .text("Revenue by Property", 50, y);
    y += 25;

    const tableHeaders = ["Property", "Bookings", "Revenue", "Expenses", "Profit"];
    const colWidths = [180, 70, 90, 90, 90];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    doc.rect(50, y, tableWidth, 22).fill("#f5f5f5");
    let headerX = 50;
    tableHeaders.forEach((header, i) => {
      doc.fillColor(darkColor).fontSize(9).font("Helvetica-Bold")
        .text(header, headerX + 5, y + 6, { width: colWidths[i] - 10 });
      headerX += colWidths[i];
    });
    y += 22;

    const propertyRevenue: { name: string; bookings: number; revenue: number; expenses: number }[] = [];

    data.properties.forEach(p => {
      const propBookings = nonCancelledBookings.filter(b => b.propertyId === p.id);
      const revenue = propBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const propExpenses = data.expenses.filter(e => e.propertyId === p.id);
      const expenseTotal = propExpenses.reduce((sum, e) => sum + e.amount, 0);
      if (revenue > 0 || expenseTotal > 0) {
        propertyRevenue.push({
          name: p.name,
          bookings: propBookings.length,
          revenue,
          expenses: expenseTotal,
        });
      }
    });

    propertyRevenue.sort((a, b) => b.revenue - a.revenue);

    propertyRevenue.forEach((row, idx) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }

      if (idx % 2 === 0) {
        doc.rect(50, y, tableWidth, 20).fill("#fafafa");
      }

      let cellX = 50;
      const profit = row.revenue - row.expenses;
      const values = [row.name, String(row.bookings), formatCurrency(row.revenue), formatCurrency(row.expenses), formatCurrency(profit)];
      values.forEach((val, i) => {
        doc.fillColor(darkColor).fontSize(9).font("Helvetica")
          .text(val, cellX + 5, y + 5, { width: colWidths[i] - 10 });
        cellX += colWidths[i];
      });
      y += 20;
    });

    if (propertyRevenue.length === 0) {
      doc.fillColor(mutedColor).fontSize(10).font("Helvetica")
        .text("No revenue data for this period.", 50, y + 5);
      y += 25;
    }

    y += 10;
    doc.moveTo(50, y).lineTo(50 + tableWidth, y).lineWidth(1).strokeColor("#e0e0e0").stroke();
    y += 5;

    let totalRowX = 50;
    const totalValues = ["Total", String(nonCancelledBookings.length), formatCurrency(totalRevenue), formatCurrency(totalExpenses), formatCurrency(netProfit)];
    totalValues.forEach((val, i) => {
      doc.fillColor(darkColor).fontSize(9).font("Helvetica-Bold")
        .text(val, totalRowX + 5, y + 2, { width: colWidths[i] - 10 });
      totalRowX += colWidths[i];
    });
    y += 30;

    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 50;
    }

    doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold")
      .text("Monthly Breakdown", 50, y);
    y += 25;

    const monthlyData: Record<string, { revenue: number; expenses: number; bookings: number }> = {};
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    nonCancelledBookings.forEach(b => {
      const d = new Date(b.checkIn);
      const key = `${monthLabels[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthlyData[key]) monthlyData[key] = { revenue: 0, expenses: 0, bookings: 0 };
      monthlyData[key].revenue += b.totalAmount;
      monthlyData[key].bookings += 1;
    });

    data.expenses.forEach(e => {
      const d = new Date(e.date);
      const key = `${monthLabels[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthlyData[key]) monthlyData[key] = { revenue: 0, expenses: 0, bookings: 0 };
      monthlyData[key].expenses += e.amount;
    });

    const monthHeaders = ["Month", "Bookings", "Revenue", "Expenses", "Net"];
    const monthColWidths = [120, 70, 100, 100, 100];
    const monthTableWidth = monthColWidths.reduce((a, b) => a + b, 0);

    doc.rect(50, y, monthTableWidth, 22).fill("#f5f5f5");
    let mHeaderX = 50;
    monthHeaders.forEach((header, i) => {
      doc.fillColor(darkColor).fontSize(9).font("Helvetica-Bold")
        .text(header, mHeaderX + 5, y + 6, { width: monthColWidths[i] - 10 });
      mHeaderX += monthColWidths[i];
    });
    y += 22;

    const sortedMonths = Object.entries(monthlyData).sort((a, b) => {
      const parseMonth = (s: string) => {
        const [mon, yr] = s.split(" ");
        return new Date(`${mon} 1, ${yr}`).getTime();
      };
      return parseMonth(b[0]) - parseMonth(a[0]);
    });

    sortedMonths.forEach(([month, d], idx) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 50;
      }

      if (idx % 2 === 0) {
        doc.rect(50, y, monthTableWidth, 20).fill("#fafafa");
      }

      let cellX = 50;
      const net = d.revenue - d.expenses;
      const values = [month, String(d.bookings), formatCurrency(d.revenue), formatCurrency(d.expenses), formatCurrency(net)];
      values.forEach((val, i) => {
        doc.fillColor(darkColor).fontSize(9).font("Helvetica")
          .text(val, cellX + 5, y + 5, { width: monthColWidths[i] - 10 });
        cellX += monthColWidths[i];
      });
      y += 20;
    });

    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fillColor(mutedColor).fontSize(8).font("Helvetica")
        .text(
          `AirManager Revenue Report — Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 30,
          { align: "center", width: doc.page.width - 100 }
        );
    }

    doc.end();
  });
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
