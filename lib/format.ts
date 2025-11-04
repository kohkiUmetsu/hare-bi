const integerFormatter = new Intl.NumberFormat("ja-JP", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("ja-JP", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type MetricFormat = "integer" | "decimal" | "percent";

export function formatMetric(
  value: number | null | undefined,
  type: MetricFormat = "integer"
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  switch (type) {
    case "decimal":
      return decimalFormatter.format(value);
    case "percent":
      return percentFormatter.format(value);
    default:
      return integerFormatter.format(value);
  }
}
