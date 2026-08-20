import { ShieldAlert, RefreshCw, LogOut, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

/**
 * Genkender databasens rettighedsfejl ("permission denied for function
 * is_business_owner", "row-level security policy", "42501" osv.), så vi
 * aldrig viser den rå engelske besked til brugeren.
 */
export const isPermissionError = (e: unknown): boolean => {
  const err = e as { message?: string; code?: string; details?: string } | null;
  const raw = [err?.message, err?.details, typeof e === "string" ? e : ""]
    .filter(Boolean)
    .join(" ");
  if (err?.code === "42501") return true;
  return /permission denied|row[- ]level security|not authorized|insufficient privilege|rls/i.test(raw);
};

type Props = {
  /** Den oprindelige fejl — vises som teknisk detalje nederst. */
  error?: unknown;
  /** Hvad brugeren forsøgte, fx "ruteplanlæggeren". */
  context?: string;
  onRetry?: () => void;
};

/**
 * Venlig fejlvisning med trin-for-trin hjælp når brugeren rammer en
 * rettighedsfejl i databasen.
 */
export const PermissionErrorNotice = ({ error, context, onRetry }: Props) => {
  const technical =
    (error as { message?: string } | null)?.message ??
    (typeof error === "string" ? error : "");

  const steps = [
    "Genindlæs siden — de fleste rettighedsfejl skyldes en udløbet session.",
    "Log ud og log ind igen, så din adgang bliver hentet på ny.",
    "Tjek at du er logget ind med den konto, der ejer virksomheden — eller er tilknyttet som medarbejder.",
    "Bekræft at virksomhedens databehandleraftale er accepteret af ejeren.",
  ];

  return (
    <Card className="rounded-xl border border-amber-500/30 bg-amber-500/5">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Du mangler adgang{context ? ` til ${context}` : ""}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Databasen afviste handlingen, fordi din bruger ikke har rettigheder til
              dataene lige nu. Det er typisk noget, du selv kan løse på få sekunder.
            </p>
          </div>
        </div>

        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s} className="flex items-start gap-2.5 text-[13px] leading-6 text-foreground/85">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-foreground">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5" onClick={onRetry ?? (() => window.location.reload())}>
            <RefreshCw className="h-3.5 w-3.5" />
            Prøv igen
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/auth">
              <LogOut className="h-3.5 w-3.5" />
              Log ud og ind igen
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <Link to="/kontakt">
              <LifeBuoy className="h-3.5 w-3.5" />
              Kontakt support
            </Link>
          </Button>
        </div>

        {technical && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">Tekniske detaljer</summary>
            <p className="mt-1 break-words font-mono text-[11px]">{technical}</p>
          </details>
        )}
      </CardContent>
    </Card>
  );
};

export default PermissionErrorNotice;
