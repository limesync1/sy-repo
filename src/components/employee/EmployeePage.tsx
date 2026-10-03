import type { ComponentProps, ReactNode } from "react";
import { PageTransition } from "@/components/admin/shared/PageTransition";
import { cn } from "@/lib/utils";

type EmployeePageProps = {
  children: ReactNode;
  className?: string;
  transitionKey?: ComponentProps<typeof PageTransition>["transitionKey"];
};

/** Fælles indholdsramme for medarbejdersider — matcher virksomhedspanelets bredde og rytme. */
export function EmployeePage({ children, className, transitionKey }: EmployeePageProps) {
  const classes = cn("employee-page w-full min-w-0 max-w-full space-y-3 sm:space-y-5", className);

  if (transitionKey !== undefined) {
    return (
      <PageTransition transitionKey={transitionKey} className={classes}>
        {children}
      </PageTransition>
    );
  }

  return <div className={classes}>{children}</div>;
}
