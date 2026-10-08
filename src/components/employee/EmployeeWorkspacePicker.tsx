// EmployeeWorkspacePicker — vises når brugeren er medarbejder hos flere
// virksomheder. Brugeren vælger hvilket medarbejderpanel der skal åbnes, og
// kan bede os huske valget fremover.
import { useState } from "react";
import { Check, Building2, MapPin, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { setEmployeeWorkspace } from "@/lib/employee-workspace";
import { EmployeePage } from "@/components/employee/EmployeePage";
import { PageHeader } from "@/components/admin/shared/AdminUI";
import type { EmployeeWithBusiness } from "@/hooks/useMyEmployee";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "V";

type Props = {
  employees: EmployeeWithBusiness[];
  /** Kaldes efter valget er gemt — så shell'en kan rendre panelet. */
  onSelected: (businessId: string, remember: boolean) => void;
  /** Aktuelt valgt (når vælgeren åbnes fra profilmenuen). */
  currentBusinessId?: string | null;
};

export const EmployeeWorkspacePicker = ({ employees, onSelected, currentBusinessId }: Props) => {
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const choose = (businessId: string) => {
    setPending(businessId);
    setEmployeeWorkspace(businessId, remember);
    onSelected(businessId, remember);
  };

  return (
    <EmployeePage>
      <PageHeader
        title="Vælg arbejdsplads"
        description="Hvor arbejder du i dag?"
      />
      <div className="mx-auto grid max-w-3xl gap-3 sm:gap-5 items-start">
        <section className="hidden lg:block">
          <div className="flex items-center gap-4 py-2">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center">
              <BrandedIllustration name="chooseWorkspace" className="h-full w-full" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Medarbejderpanel</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />{employees.length} arbejdspladser tilgængelige
              </p>
            </div>
          </div>
        </section>

        <section className="service-panel-card min-w-0 overflow-hidden rounded-md border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold text-foreground tracking-tight">Dine arbejdspladser</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Du kan altid skifte igen fra profilmenuen.</p>
          </div>
          <ul className="divide-y divide-border">
          {employees.map((emp) => {
            const biz = emp.business;
            const name = biz?.name || "Virksomhed";
            const active = currentBusinessId === emp.business_id;
            return (
              <li key={emp.id}>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => choose(emp.business_id)}
                  disabled={!!pending}
                  className={cn(
                    "group flex h-auto min-h-[72px] rounded-none whitespace-normal w-full items-center gap-3 bg-card px-3 py-3 text-left transition-colors sm:px-5",
                    "hover:bg-secondary/60 active:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                    active && "bg-accent/5 shadow-[inset_3px_0_0_hsl(var(--accent))]",
                    pending === emp.business_id && "opacity-70",
                  )}
                >
                  <Avatar className="h-11 w-11 shrink-0 rounded-md bg-card ring-1 ring-border">
                    {biz?.logo_url ? (
                      <AvatarImage src={biz.logo_url} alt={name} className="rounded-md bg-card object-contain p-1" />
                    ) : null}
                    <AvatarFallback className="rounded-[5px] bg-secondary text-sm font-bold text-foreground">
                      {initialsOf(name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-foreground">{name}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {biz?.city ? (
                        <>
                          <MapPin className="h-3 w-3 shrink-0" />
                          {[biz.zip_code, biz.city].filter(Boolean).join(" ")}
                        </>
                      ) : (
                        <>
                          <Building2 className="h-3 w-3 shrink-0" />
                          {biz?.category || "Serviceydere"}
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {emp.title || "Medarbejder"} · {emp.name}
                    </p>
                  </div>

                  {active ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-[5px] bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent">
                      <Check className="h-3 w-3" strokeWidth={3} /> Aktiv
                    </span>
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  )}
                </Button>
              </li>
            );
          })}
          </ul>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 border-t border-border bg-secondary/35 px-4 py-3 transition-colors hover:bg-secondary/60 sm:px-5">
          <Checkbox
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
            aria-label="Husk mit valg"
          />
          <span className="text-sm leading-5 text-foreground">Husk mit valg på denne enhed</span>
        </label>
        </section>
      </div>
    </EmployeePage>
  );
};

export default EmployeeWorkspacePicker;
