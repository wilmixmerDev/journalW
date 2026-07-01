const percentFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

export function formatSignedPercent(value: number): string {
  const formatted = percentFormatter.format(Math.abs(value));
  return `${value >= 0 ? "+" : "-"}${formatted}%`;
}

export function formatR(value: number): string {
  const formatted = percentFormatter.format(Math.abs(value));
  return `${value >= 0 ? "+" : "-"}${formatted}R`;
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(new Date(value));
}
