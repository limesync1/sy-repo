// useRoutePlannerFilters — Fase 2 af refaktorerings-planen (.lovable/plan.md).
//
// Samler advanced filter-state (urgency / postnumre / services) i én hook.
// Tilstanden er persistent i localStorage så filtrene overlever en page reload.
//
// Arrays bevares som primær state (Set kan ikke serialiseres til JSON), mens
// Set-versionerne udledes via useMemo til hurtige lookups i render-koden.
import { useCallback, useMemo } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import type { UrgencyKey } from "@/components/route-planner/UnassignedFiltersPopover";

export type UseRoutePlannerFilters = {
  urgencyFilter: Set<UrgencyKey>;
  postcodeFilter: Set<string>;
  serviceFilter: Set<string>;
  setUrgencyFilterArr: (next: UrgencyKey[]) => void;
  setPostcodeFilterArr: (next: string[]) => void;
  setServiceFilterArr: (next: string[]) => void;
  /** Samlet antal aktive filter-værdier på tværs af alle tre kategorier. */
  activeCount: number;
  /** Nulstil alle tre filtre. */
  clearAll: () => void;
};

export const useRoutePlannerFilters = (): UseRoutePlannerFilters => {
  const [urgencyFilterArr, setUrgencyFilterArr] = usePersistentState<UrgencyKey[]>(
    "route-planner:filter:urgency", [],
  );
  const [postcodeFilterArr, setPostcodeFilterArr] = usePersistentState<string[]>(
    "route-planner:filter:postcode", [],
  );
  const [serviceFilterArr, setServiceFilterArr] = usePersistentState<string[]>(
    "route-planner:filter:service", [],
  );

  const urgencyFilter = useMemo(() => new Set(urgencyFilterArr), [urgencyFilterArr]);
  const postcodeFilter = useMemo(() => new Set(postcodeFilterArr), [postcodeFilterArr]);
  const serviceFilter = useMemo(() => new Set(serviceFilterArr), [serviceFilterArr]);

  const activeCount = urgencyFilter.size + postcodeFilter.size + serviceFilter.size;

  const clearAll = useCallback(() => {
    setUrgencyFilterArr([]);
    setPostcodeFilterArr([]);
    setServiceFilterArr([]);
  }, [setUrgencyFilterArr, setPostcodeFilterArr, setServiceFilterArr]);

  return {
    urgencyFilter,
    postcodeFilter,
    serviceFilter,
    setUrgencyFilterArr,
    setPostcodeFilterArr,
    setServiceFilterArr,
    activeCount,
    clearAll,
  };
};