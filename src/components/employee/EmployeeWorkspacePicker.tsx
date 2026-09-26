// EmployeeWorkspacePicker — vises når brugeren er medarbejder hos flere
// virksomheder. Brugeren vælger hvilket medarbejderpanel der skal åbnes, og
// kan bede os huske valget fremover.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Building2, MapPin, ArrowRight, BriefcaseBusiness } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { setEmployeeWorkspace } from "@/lib/employee-workspace";
import type { EmployeeWithBusiness } from "@/hooks/useMyEmployee";

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
    <div className="service-panel-workspace employee-panel-workspace flex min-h-dvh flex-col bg-secondary/50">
      <header className="service-panel-topbar border-b border-border bg-card">
        <div className="flex h-14 items-center px-4 sm:px-6">
          <Link to="/" aria-label="Forside" className="flex items-center">
            <img
              src="/serviceydere-logo-dark.webp"
              alt="Serviceydere"
              className="h-8 w-auto"
              width={1920}
              height={539}
              decoding="async"
            />
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 content-start items-start gap-4 px-3 py-4 sm:px-6 sm:py-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-6 lg:py-10">
        <section className="overflow-hidden rounded-[5px] border border-border bg-card shadow-sm lg:sticky lg:top-20">
          <div className="border-b border-border bg-secondary/45 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-foreground text-background">
              <BriefcaseBusiness className="h-4 w-4" />
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase text-muted-foreground">Medarbejderpanel</p>
            <h1 className="mt-1 text-xl font-semibold leading-tight text-foreground">Vælg arbejdsplads</h1>
          </div>
          <div className="p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Du har adgang til {employees.length} virksomheder. Vælg hvor du arbejder i dag.
            </p>
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>{employees.length} arbejdspladser tilgængelige</span>
            </div>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-[5px] border border-border bg-card shadow-sm">
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
                <button
                  type="button"
                  onClick={() => choose(emp.business_id)}
                  disabled={!!pending}
                  className={cn(
                    "group flex min-h-[72px] w-full items-center gap-3 bg-card px-3 py-3 text-left transition-colors sm:px-5",
                    "hover:bg-secondary/60 active:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                    active && "bg-accent/5 shadow-[inset_3px_0_0_hsl(var(--accent))]",
                    pending === emp.business_id && "opacity-70",
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-border">
                    {biz?.logo_url ? (
                      <AvatarImage src={biz.logo_url} alt={name} className="rounded-lg object-cover" />
                    ) : null}
                    <AvatarFallback className="rounded-lg bg-secondary text-sm font-bold text-foreground">
                      {initialsOf(name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground tracking-tight">{name}</p>
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
                </button>
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
      </main>
    </div>
  );
};

export default EmployeeWorkspacePicker;
