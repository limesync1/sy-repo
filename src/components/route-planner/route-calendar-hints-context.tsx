// RouteCalendarHintsContext — gør "hvilke datoer har ruter / er travle /
// overbookede" tilgængeligt for alle dato-popovers nede i træet uden at
// drille props gennem en lang kæde af dialoger.
//
// Provideren sættes én gang på RoutePlanner-siden. DatePickerField og andre
// kalendere kan så vise indikatorer uden at hver dialog skal videresende
// data eksplicit.

import { createContext, useContext, type ReactNode } from "react";

export type RouteCalendarHints = {
  routeDates?: Set<string> | null;
  busyDates?: Set<string> | null;
  overloadedDates?: Set<string> | null;
};

const Ctx = createContext<RouteCalendarHints>({});

export const RouteCalendarHintsProvider = ({
  value,
  children,
}: {
  value: RouteCalendarHints;
  children: ReactNode;
}) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;

export const useRouteCalendarHints = () => useContext(Ctx);