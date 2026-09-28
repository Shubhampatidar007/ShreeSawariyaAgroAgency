export type UnitDimension = "weight" | "volume" | "count";

type UnitDefinition = {
  key: string;
  label: string;
  dimension: UnitDimension;
  group: string;
  toCanonical: number;
};

const UNIT_DEFINITIONS: UnitDefinition[] = [
  { key: "g", label: "gram", dimension: "weight", group: "weight", toCanonical: 1 },
  { key: "kg", label: "kilogram", dimension: "weight", group: "weight", toCanonical: 1000 },
  { key: "quintal", label: "quintal", dimension: "weight", group: "weight", toCanonical: 100000 },
  { key: "tonne", label: "tonne", dimension: "weight", group: "weight", toCanonical: 1000000 },
  { key: "ml", label: "millilitre", dimension: "volume", group: "volume", toCanonical: 1 },
  { key: "l", label: "litre", dimension: "volume", group: "volume", toCanonical: 1000 },
  { key: "piece", label: "piece", dimension: "count", group: "piece", toCanonical: 1 },
  { key: "box", label: "box", dimension: "count", group: "box", toCanonical: 1 },
  { key: "packet", label: "packet", dimension: "count", group: "packet", toCanonical: 1 },
  { key: "bag", label: "bag", dimension: "count", group: "bag", toCanonical: 1 },
];

const ALIASES: Record<string, string> = {
  g: "g", gm: "g", gram: "g", grams: "g",
  kilogram: "kg", kilograms: "kg", kilo: "kg", kilos: "kg", kg: "kg",
  q: "quintal", quintal: "quintal", quintals: "quintal",
  tonne: "tonne", tonnes: "tonne", ton: "tonne", tons: "tonne", t: "tonne",
  ml: "ml", millilitre: "ml", millilitres: "ml", milliliter: "ml", milliliters: "ml",
  l: "l", lt: "l", ltr: "l", litre: "l", litres: "l", liter: "l", liters: "l",
  piece: "piece", pieces: "piece", pc: "piece", pcs: "piece",
  box: "box", boxes: "box",
  packet: "packet", packets: "packet", pack: "packet", packs: "packet",
  bag: "bag", bags: "bag",
};

const DEFINITIONS_BY_KEY = new Map(UNIT_DEFINITIONS.map((item) => [item.key, item]));

export const BASE_UNIT_OPTIONS = UNIT_DEFINITIONS.map(({ key, label, dimension }) => ({
  key, label, dimension,
}));

export const normalizeUnit = (value: string | null | undefined) => {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  if (!normalized) return null;
  return ALIASES[normalized] ?? normalized;
};

export const getUnitDefinition = (value: string | null | undefined) => {
  const key = normalizeUnit(value);
  return key ? DEFINITIONS_BY_KEY.get(key) ?? null : null;
};

export const areCompatibleUnits = (fromUnit: string, toUnit: string) => {
  const from = getUnitDefinition(fromUnit);
  const to = getUnitDefinition(toUnit);
  return Boolean(from && to && from.group === to.group);
};

export const roundQuantity = (value: number, decimals = 6) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const convertQuantity = (quantity: number, fromUnit: string, toUnit: string) => {
  if (!Number.isFinite(quantity)) throw new Error("Quantity must be a finite number");
  const from = getUnitDefinition(fromUnit);
  const to = getUnitDefinition(toUnit);

  if (!from || !to || from.group !== to.group) {
    throw new Error("Cannot convert " + fromUnit + " to " + toUnit);
  }

  return roundQuantity((quantity * from.toCanonical) / to.toCanonical);
};

export const formatUnitLabel = (value: string) => {
  const definition = getUnitDefinition(value);
  return definition?.label ?? value;
};

/**
 * Legacy inventory values such as "40 kg bag" are kept intact in unit,
 * but their physical packaging can be safely inferred from the leading
 * numeric measurement. Ambiguous values return null so callers can fall
 * back without guessing.
 */
export const inferLegacyPackage = (value: string) => {
  const text = value.trim().toLowerCase();
  const match = text.match(
    /^([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gram|grams|kg|kilogram|kilograms|q|quintal|quintals|t|ton|tons|tonne|tonnes|ml|millilitre|millilitres|milliliter|milliliters|l|lt|ltr|litre|litres|liter|liters)\b/,
  );

  if (!match) return null;

  const baseUnit = normalizeUnit(match[2]);
  const packageSize = Number(match[1]);
  if (!baseUnit || !Number.isFinite(packageSize) || packageSize <= 0) return null;

  return { baseUnit, packageSize };
};
