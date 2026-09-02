export const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "\u20AC", name: "Euro", locale: "de-DE" },
  { code: "GBP", symbol: "\u00A3", name: "British Pound", locale: "en-GB" },
  { code: "JPY", symbol: "\u00A5", name: "Japanese Yen", locale: "ja-JP" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "de-CH" },
  { code: "INR", symbol: "\u20B9", name: "Indian Rupee", locale: "en-IN" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso", locale: "es-MX" },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]["code"];

const currencyMap = new Map(SUPPORTED_CURRENCIES.map(c => [c.code, c]));

export function getCurrencyInfo(code: string) {
  return currencyMap.get(code as CurrencyCode) || currencyMap.get("USD")!;
}

export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  const info = getCurrencyInfo(currencyCode);
  try {
    return new Intl.NumberFormat(info.locale, {
      style: "currency",
      currency: info.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${info.symbol}${amount.toLocaleString()}`;
  }
}

export function formatCurrencyShort(amount: number, currencyCode: string = "USD"): string {
  const info = getCurrencyInfo(currencyCode);
  if (amount >= 1000) {
    const k = amount / 1000;
    return `${info.symbol}${k.toFixed(0)}k`;
  }
  return formatCurrency(amount, currencyCode);
}

export function getCurrencySymbol(currencyCode: string = "USD"): string {
  return getCurrencyInfo(currencyCode).symbol;
}
