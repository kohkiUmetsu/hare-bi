const integerFormatter = new Intl.NumberFormat("ja-JP", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("ja-JP", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" });

export type MetricFormat = "integer" | "decimal" | "percent" | "currency";

export function formatMetric(
  value: number | null | undefined,
  type: MetricFormat = "integer"
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  switch (type) {
    case "decimal":
      return `¥${decimalFormatter.format(value)}`;
    case "percent":
      return percentFormatter.format(value);
    case "currency":
      return `¥${currencyFormatter.format(value)}`;
    default:
      return integerFormatter.format(value);
  }
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return dateFormatter.format(date);
}
