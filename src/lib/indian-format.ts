const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const INR_DECIMAL = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

export function formatIndianCurrency(value: number, exact = false) {
  return (exact ? INR_DECIMAL : INR).format(Number.isFinite(value) ? value : 0);
}

export function formatIndianCompactCurrency(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount);

  if (absolute >= 1_00_00_000) {
    return `${sign}₹${(absolute / 1_00_00_000).toFixed(2).replace(/\.00$/, "")}Cr`;
  }

  if (absolute >= 1_00_000) {
    return `${sign}₹${(absolute / 1_00_000).toFixed(2).replace(/\.00$/, "")}L`;
  }

  if (absolute >= 1_000) {
    return `${sign}₹${(absolute / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return `${sign}₹${NUMBER.format(absolute)}`;
}

export function formatIndianNumber(value: number) {
  return NUMBER.format(Number.isFinite(value) ? value : 0);
}

export function formatIndianQuantity(value: number, unit?: string) {
  const amount = formatIndianNumber(value);
  return unit ? `${amount} ${unit}` : amount;
}

export function formatIndianDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(new Date(value));
}
