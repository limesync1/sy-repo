type DayRoute = { id: string; planned_start_time?: string | null; created_at?: string | null; name?: string | null };

export function orderDayRoutes<T extends DayRoute>(routes: readonly T[], completedIds: ReadonlySet<string> = new Set()): T[] {
  return [...routes].sort((a, b) => {
    const completion = Number(completedIds.has(a.id)) - Number(completedIds.has(b.id));
    const time = (a.planned_start_time?.slice(0, 5) || "24:00").localeCompare(b.planned_start_time?.slice(0, 5) || "24:00");
    return completion || time || (a.created_at || "").localeCompare(b.created_at || "")
      || (a.name || "").localeCompare(b.name || "", "da") || a.id.localeCompare(b.id);
  });
}