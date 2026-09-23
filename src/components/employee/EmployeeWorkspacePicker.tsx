// EmployeeWorkspacePicker — vises når brugeren er medarbejder hos flere
// virksomheder. Brugeren vælger hvilket medarbejderpanel der skal åbnes, og
// kan bede os huske valget fremover.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Building2, MapPin, ArrowRight } from "lucide-react";
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
    <div className="service-panel-workspace flex min-h-dvh flex-col bg-secondary/50">
      <header className="service-panel-topbar border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link to="/" aria-label="Forside" className="flex items-center">
            <img
              src="/serviceydere-logo-dark.webp"
              alt="Serviceydere"
              className="h-7 w-auto"
              width={1920}
              height={539}
              decoding="async"
            />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-9">
        <div className="mb-5 sm:mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vælg arbejdsplads
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground">
            Hvilket medarbejderpanel vil du åbne?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Du er tilknyttet {employees.length} virksomheder. Vælg den du vil arbejde i —
            du kan altid skifte igen fra din profilmenu.
          </p>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
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
                    "service-panel-card group flex w-full items-center gap-3 rounded-[5px] border bg-card p-3 text-left transition-all",
                    "hover:border-accent/40 hover:bg-secondary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    active ? "border-accent/45 bg-accent/5 ring-1 ring-accent/20" : "border-border",
                    pending === emp.business_id && "opacity-70",
                  )}
                >
                  <Avatar className="h-11 w-11 shrink-0 rounded-[4px] ring-1 ring-border">
                    {biz?.logo_url ? (
                      <AvatarImage src={biz.logo_url} alt={name} className="rounded-[4px] object-cover" />
                    ) : null}
                    <AvatarFallback className="rounded-[4px] bg-secondary text-sm font-bold text-foreground">
                      {initialsOf(name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{name}</p>
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
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {emp.title || "Medarbejder"} · {emp.name}
                    </p>
                  </div>

                  {active ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">
                      <Check className="h-3 w-3" strokeWidth={3} /> Aktiv
                    </span>
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <label className="service-panel-card mt-4 flex cursor-pointer items-center gap-2.5 rounded-[5px] border border-border bg-card px-3 py-2.5">
          <Checkbox
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
            aria-label="Husk mit valg"
          />
          <span className="text-sm text-foreground">
            Husk mit valg — åbn denne virksomhed automatisk fremover
          </span>
        </label>
      </main>
    </div>
  );
};

export default EmployeeWorkspacePicker;
