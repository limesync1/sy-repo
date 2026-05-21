import { ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDkk } from "./shared";

export default function Step4Review(p: any) {
  const Row = ({ label, value }: any) => (
    <div className="flex justify-between gap-3 py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
  const enabledFeatures = Object.entries(p.features).filter(([, v]) => v).map(([k]) => k);
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Resumé</p>
        <Row label="Virksomhed" value={p.name} />
        {p.cvr && <Row label="CVR" value={p.cvr.replace(/\D/g, "")} />}
        <Row label="Kategorier" value={p.categories.length ? p.categories.join(", ") : "—"} />
        <Row label="Ejer" value={p.ownerEmail} />
        <Row label="Prøveperiode" value={p.forceActive ? "(springes over)" : `${p.trialDays} dage`} />
        <Row label="Plan" value={`${p.billing} · ${formatDkk(p.breakdown?.monthlyAfterDiscount ?? 0)} kr/md`} />
        <Row label="Ekstra logins" value={p.extraLogins} />
        <Row label="Funktioner" value={enabledFeatures.join(", ") || "ingen"} />
        <Row label="Velkomstmail" value={p.sendWelcome ? "Ja" : "Nej"} />
        <Row label="Adgangskode" value={p.passwordMode === "auto" ? "Auto-genereret" : "Manuelt sat"} />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-amber-900 font-semibold flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Admin-options
        </p>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <Checkbox checked={p.forceActive} onCheckedChange={(c: any) => p.setForceActive(!!c)} className="mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Marker som betalende med det samme</p>
            <p className="text-xs text-amber-800 mt-0.5">Springer prøveperioden over. Brug kun hvis virksomheden allerede har betalt eller har en aftale.</p>
          </div>
        </label>
        <div>
          <Label className="text-xs text-amber-900">Note til audit log (valgfri)</Label>
          <Textarea rows={2} value={p.adminNote} onChange={(e: any) => p.setAdminNote(e.target.value)}
            className="mt-1 bg-white" placeholder="Fx 'Migreret fra gammelt system' eller 'Manuelt opsat efter samtale med ejer'" />
        </div>
      </div>
    </div>
  );
}
