import { getCycleNumber } from "./cycle-label";

type RecurringOrder = { id: string; parent_order_id?: string | null; recurrence_cycle?: number | null; completed_cycles?: number | null; status: string };
type Subscription = { order_id?: string | null; status: string; next_service_date?: string | null };

/** A generated order's completion count is not its series position. */
export function orderCycleNumber(order: RecurringOrder): number {
  if (typeof order.recurrence_cycle === "number" && order.recurrence_cycle >= 0) return order.recurrence_cycle + 1;
  if (order.parent_order_id) return 1;
  return getCycleNumber({ completedCycles: order.completed_cycles, isCompleted: order.status === "completed" }) ?? 1;
}

/** Only the current active subscription owner announces the next occurrence. */
export function nextDatesByOrder(orders: RecurringOrder[], subscriptions: Subscription[]): Map<string, string> {
  const result = new Map<string, string>();
  const byId = new Map(orders.map(order => [order.id, order]));
  const root = (order: RecurringOrder) => order.parent_order_id || order.id;
  const openRoots = new Set(orders.filter(order => !["completed", "cancelled"].includes(order.status)).map(root));
  for (const sub of subscriptions) {
    if (sub.status !== "active" || !sub.order_id || !sub.next_service_date) continue;
    const order = byId.get(sub.order_id);
    if (!order || order.status !== "completed" || openRoots.has(root(order))) continue;
    if (orders.some(other => root(other) === root(order) && orderCycleNumber(other) > orderCycleNumber(order))) continue;
    if (!Number.isFinite(Date.parse(sub.next_service_date))) continue;
    const previous = result.get(order.id);
    if (!previous || Date.parse(sub.next_service_date) < Date.parse(previous)) result.set(order.id, sub.next_service_date);
  }
  return result;
}
