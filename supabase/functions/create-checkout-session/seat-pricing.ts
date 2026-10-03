/** Requests can buy more seats, never undercut server-side allocations. */
export function seatQuantity(requested: unknown, allocated: number, locked: number, active: number): number {
  if (typeof requested !== "number" || !Number.isSafeInteger(requested) || requested < 0 || requested > 50) {
    throw new Error("Invalid extraEmployeeLogins");
  }
  return Math.max(requested, allocated, locked, Math.max(0, active - 1));
}

export function employeePriceKey(basePriceId: string): string {
  const period = /^base_(monthly|quarterly|yearly)$/.exec(basePriceId)?.[1];
  if (!period) throw new Error("Invalid basePriceId");
  return `employee_${period}`;
}
