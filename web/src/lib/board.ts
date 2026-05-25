export type SpaceKind = "go" | "property" | "tax" | "chance" | "jail" | "neutral";

export type BoardSpace = {
  index: number;
  label: string;
  kind: SpaceKind;
  propertyId?: number;
  price?: number;
  rent?: number;
  color?: string;
};

const PRICES = [120, 120, 200, 200, 280, 280, 350, 400];
const RENTS = [12, 12, 20, 20, 28, 28, 35, 40];
const COLORS = [
  "#8B5CF6",
  "#A78BFA",
  "#06B6D4",
  "#22D3EE",
  "#F59E0B",
  "#FBBF24",
  "#EF4444",
  "#F87171",
];

const PROP_AT: Record<number, number> = {
  1: 0,
  3: 1,
  5: 2,
  7: 3,
  10: 4,
  11: 5,
  12: 6,
  14: 7,
};

export const BOARD_SIZE = 16;

export const BOARD_SPACES: BoardSpace[] = Array.from({ length: BOARD_SIZE }, (_, index) => {
  if (index === 0) return { index, label: "GO", kind: "go" };
  if (index === 6) return { index, label: "Jail", kind: "jail" };
  if (index === 2 || index === 8 || index === 13) {
    return { index, label: "Tax", kind: "tax" };
  }
  if (index === 4 || index === 9) {
    return { index, label: "Chance", kind: "chance" };
  }
  if (index === 15) return { index, label: "Free", kind: "neutral" };

  const propertyId = PROP_AT[index];
  if (propertyId !== undefined) {
    return {
      index,
      label: `Lot ${propertyId + 1}`,
      kind: "property",
      propertyId,
      price: PRICES[propertyId],
      rent: RENTS[propertyId],
      color: COLORS[propertyId],
    };
  }
  return { index, label: `Space ${index}`, kind: "neutral" };
});

export const BOARD_PATH_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export function propertyAtPosition(position: number): number | null {
  return PROP_AT[position] ?? null;
}

/** Grid placement for 16 spaces on a 6×6 ring (path index → cell). */
export const SPACE_GRID: { col: number; row: number }[] = [
  { col: 1, row: 6 },
  { col: 2, row: 6 },
  { col: 3, row: 6 },
  { col: 4, row: 6 },
  { col: 5, row: 6 },
  { col: 6, row: 5 },
  { col: 6, row: 4 },
  { col: 6, row: 3 },
  { col: 6, row: 2 },
  { col: 6, row: 1 },
  { col: 5, row: 1 },
  { col: 4, row: 1 },
  { col: 3, row: 1 },
  { col: 2, row: 1 },
  { col: 1, row: 2 },
  { col: 1, row: 3 },
];
