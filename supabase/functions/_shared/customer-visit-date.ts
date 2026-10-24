/** Route scheduling times are internal estimates, never customer promises.
 * An explicitly agreed clock time can still be written in the message itself.
 *
 * Dates are written the way a person would say them: "i dag" and "i morgen"
 * instead of the full weekday + date when the visit is that close. Compared
 * against the Danish calendar day (Europe/Copenhagen), not UTC.
 */
const DK_TIME_ZONE = "Europe/Copenhagen";

function danishCalendarDay(when: Date): string {
  // en-CA gives YYYY-MM-DD directly, avoiding locale parsing.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(when);
}

export function formatCustomerVisitDate(routeDate: string | null | undefined): string {
  if (!routeDate || !/^\d{4}-\d{2}-\d{2}$/.test(routeDate)) return "snarest";
  const date = new Date(`${routeDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== routeDate) return "snarest";

  const today = danishCalendarDay(new Date());
  if (routeDate === today) return "i dag";
  const tomorrow = danishCalendarDay(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (routeDate === tomorrow) return "i morgen";

  return date.toLocaleDateString("da-DK", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
}
