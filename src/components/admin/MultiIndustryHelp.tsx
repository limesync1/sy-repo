import { Info } from "lucide-react";

/** Forklaring af «Andet / Multi-service» — vises ved branchevalg. */
export const MultiIndustryHelp = ({ compact = false }: { compact?: boolean }) => (
  <div className="rounded-xl border border-border bg-secondary/40 p-3 text-foreground">
    <div className="flex gap-2">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1 text-sm leading-relaxed">
        <p className="font-semibold">Passer din branche ikke? Vælg «Andet / Multi-service»</p>
        {!compact && (
          <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
            <li>Fx hvis du kun laver snerydning, er vicevært eller laver mange forskellige opgaver.</li>
            <li>Du giver selv dine services et navn og en pris – helt som du vil.</li>
            <li>Kunder, aftaler, ruter, medarbejdere og fakturering virker præcis som for alle andre.</li>
            <li>Du kan altid vælge flere brancher samtidig og ændre det senere i Indstillinger.</li>
          </ul>
        )}
        {compact && (
          <p className="text-muted-foreground">
            Fx kun snerydning eller mange slags opgaver. Du navngiver selv dine services, og alt andet virker som normalt.
          </p>
        )}
      </div>
    </div>
  </div>
);
