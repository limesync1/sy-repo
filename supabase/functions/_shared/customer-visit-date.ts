/** Route scheduling times are internal estimates, never customer promises.
 * An explicitly agreed clock time can still be written in the message itself.
 */
export function formatCustomerVisitDate(routeDate: string | null | undefined): string {
  if (!routeDate || !/^\d{4}-\d{2}-\d{2}$/.test(routeDate)) return "snarest";
  const date = new Date(`${routeDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== routeDate) return "snarest";
  return date.toLocaleDateString("da-DK", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
}