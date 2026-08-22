// EmployeeWorkspacePicker — vises når brugeren er medarbejder hos flere
// virksomheder. Brugeren vælger hvilket medarbejderpanel der skal åbnes, og
// kan bede os huske valget fremover.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Building2, MapPin, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
    <div className="flex min-h-dvh flex-col bg-secondary/50">
      <header className="border-b border-border bg-card">
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vælg arbejdsplads
          </p>
          <h1 className="mt-1.5 text-2xl font-bold text-foreground sm:text-3xl">
            Hvilket medarbejderpanel vil du åbne?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Du er tilknyttet {employees.length} virksomheder. Vælg den du vil arbejde i —
            du kan altid skifte igen fra din profilmenu.
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
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
                    "group flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all",
                    "hover:border-foreground/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
                    active ? "border-foreground/40 ring-1 ring-foreground/20" : "border-border",
                    pending === emp.business_id && "opacity-70",
                  )}
                >
                  <Avatar className="h-12 w-12 shrink-0 rounded-xl ring-1 ring-border">
                    {biz?.logo_url ? (
                      <AvatarImage src={biz.logo_url} alt={name} className="rounded-xl object-cover" />
                    ) : null}
                    <AvatarFallback className="rounded-xl bg-secondary text-sm font-bold text-foreground">
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
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
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

        <label className="mt-6 flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3">
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
