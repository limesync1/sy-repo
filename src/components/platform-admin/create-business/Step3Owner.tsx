import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Field } from "./shared";

export default function Step3Owner(p: any) {
  return (
    <div className="space-y-5">
      <div>
        <Field label="Ejer-e-mail *">
          <Input type="email" value={p.ownerEmail} onChange={(e: any) => p.setOwnerEmail(e.target.value)}
            placeholder={p.suggestedFromBusiness || "ejer@eksempel.dk"} autoFocus />
        </Field>
        {p.suggestedFromBusiness && p.suggestedFromBusiness !== p.ownerEmail && (
          <button onClick={() => p.setOwnerEmail(p.suggestedFromBusiness)}
            className="mt-1.5 text-xs text-muted-foreground hover:text-foreground underline">
            Brug virksomheds-email ({p.suggestedFromBusiness})
          </button>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          Hvis brugeren allerede findes, tildeles den som ejer. Ellers oprettes en ny bruger.
        </p>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Adgangskode (kun ved ny bruger)</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["auto", "manual"] as const).map((m) => (
            <button key={m} type="button" onClick={() => p.setPasswordMode(m)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                p.passwordMode === m ? "border-foreground bg-secondary" : "border-border bg-card hover:border-foreground/30"
              )}>
              <p className="text-sm font-medium">{m === "auto" ? "Generér automatisk" : "Sæt selv"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {m === "auto" ? "Vi laver et sikkert engangskodeord" : "Indtast en specifik adgangskode"}
              </p>
            </button>
          ))}
        </div>
        {p.passwordMode === "manual" && (
          <Input className="mt-2" type="text" placeholder="Min. 8 tegn"
            value={p.customPassword} onChange={(e: any) => p.setCustomPassword(e.target.value)} />
        )}
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border bg-card p-3">
        <Checkbox checked={p.sendWelcome} onCheckedChange={(c: any) => p.setSendWelcome(!!c)} className="mt-0.5" />
        <div>
          <p className="text-sm font-medium">Send velkomstmail</p>
          <p className="text-xs text-muted-foreground mt-0.5">Indeholder login-link og adgangskode.</p>
        </div>
      </label>
    </div>
  );
}
