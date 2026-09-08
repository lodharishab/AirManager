export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function logStructured(level: "info" | "warn" | "error", data: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    ...data,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

function normalizeLogValue(value: unknown): unknown {
  return value instanceof Error ? { message: value.message, name: value.name } : value;
}
export function logInfo(...details: unknown[]) { logStructured("info", { details: details.map(normalizeLogValue) }); }
export function logWarning(...details: unknown[]) { logStructured("warn", { details: details.map(normalizeLogValue) }); }
export function logError(...details: unknown[]) { logStructured("error", { details: details.map(normalizeLogValue) }); }
