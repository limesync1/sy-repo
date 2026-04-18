import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export type RangePreset = "7d" | "30d" | "90d" | "ytd" | "all";

interface Ctx {
  preset: RangePreset;
  setPreset: (p: RangePreset) => void;
  from: Date;
  to: Date;
  /** previous comparable window of equal length, ending right before `from` */
  prevFrom: Date;
  prevTo: Date;
  inRange: (iso: string | null | undefined) => boolean;
  inPrevRange: (iso: string | null | undefined) => boolean;
  rangeLabel: string;
}

const AdminFiltersContext = createContext<Ctx | null>(null);

const computeRange = (preset: RangePreset) => {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  let from = new Date(to);
  if (preset === "7d") from.setDate(to.getDate() - 6);
  else if (preset === "30d") from.setDate(to.getDate() - 29);
  else if (preset === "90d") from.setDate(to.getDate() - 89);
  else if (preset === "ytd") from = new Date(to.getFullYear(), 0, 1);
  else from = new Date(2000, 0, 1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
};

const PRESET_LABEL: Record<RangePreset, string> = {
  "7d": "7 dage", "30d": "30 dage", "90d": "90 dage", ytd: "År til dato", all: "Hele tiden",
};

export const AdminFiltersProvider = ({ children }: { children: ReactNode }) => {
  const [preset, setPreset] = useState<RangePreset>("30d");

  const value = useMemo<Ctx>(() => {
    const { from, to } = computeRange(preset);
    const lengthMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - lengthMs);
    const inRange = (iso?: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= from.getTime() && t <= to.getTime();
    };
    const inPrevRange = (iso?: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= prevFrom.getTime() && t <= prevTo.getTime();
    };
    return { preset, setPreset, from, to, prevFrom, prevTo, inRange, inPrevRange, rangeLabel: PRESET_LABEL[preset] };
  }, [preset]);

  return <AdminFiltersContext.Provider value={value}>{children}</AdminFiltersContext.Provider>;
};

export const useAdminFilters = () => {
  const ctx = useContext(AdminFiltersContext);
  if (!ctx) throw new Error("useAdminFilters must be used inside AdminFiltersProvider");
  return ctx;
};
