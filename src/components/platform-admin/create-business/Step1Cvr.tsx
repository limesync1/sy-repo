import { Loader2, Search, Building2, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INDUSTRY_GROUPS } from "@/lib/service-taxonomy";
import { Field } from "./shared";
import { IndustryIcon } from "@/components/IndustryIcon";

export default function Step1Cvr(p: any) {
  return (
    <div className="space-y-5">
      {!p.skipCvr && (
        <div className="rounded-xl border border-border bg-card p-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">CVR-opslag</Label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={p.cvr}
                onChange={(e: any) => p.setCvr(e.target.value)}
                onKeyDown={(e: any) => { if (e.key === "Enter") { e.preventDefault(); p.lookupCvr(); } }}
                placeholder="8 cifre"
                inputMode="numeric"
                className="pl-10"
              />
            </div>
            <Button onClick={p.lookupCvr} disabled={p.cvrLoading || p.cvr.replace(/\D/g, "").length !== 8}>
              {p.cvrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1.5">Slå op</span>
            </Button>
          </div>
          {p.cvrError && <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{p.cvrError}</p>}
          <button onClick={() => p.setSkipCvr(true)} className="mt-3 text-xs text-muted-foreground hover:text-foreground underline">
            Spring CVR over (manuel indtastning)
          </button>
        </div>
      )}
      {p.skipCvr && (
        <button onClick={() => p.setSkipCvr(false)} className="text-xs text-muted-foreground hover:text-foreground underline">
          ← Tilbage til CVR-opslag
        </button>
      )}

      <div className="space-y-3">
        <Field label="Virksomhedsnavn *"><Input value={p.name} onChange={(e: any) => p.setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Adresse"><Input value={p.address} onChange={(e: any) => p.setAddress(e.target.value)} /></Field>
          <Field label="Telefon"><Input value={p.phone} onChange={(e: any) => p.setPhone(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Postnr."><Input value={p.zipCode} onChange={(e: any) => p.setZipCode(e.target.value)} /></Field>
          <div className="col-span-2"><Field label="By"><Input value={p.city} onChange={(e: any) => p.setCity(e.target.value)} /></Field></div>
        </div>
        <Field label="Virksomheds-email (vises offentligt)">
          <Input type="email" value={p.businessEmail} onChange={(e: any) => p.setBusinessEmail(e.target.value)} />
        </Field>
        {p.industryText && (
          <div className="rounded-md bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground">
            Branche fra CVR: <span className="text-foreground">{p.industryText}</span>
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kategorier på Serviceydere *</Label>
        <p className="mt-1 text-xs text-muted-foreground">Vælg de kategorier virksomheden tilbydes under.</p>
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-3 space-y-3">
          {INDUSTRY_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.industries.map((ind) => {
                  const active = p.categories.includes(ind.key);
                  return (
                    <button
                      key={ind.key}
                      type="button"
                      onClick={() => p.toggleCategory(ind.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-foreground hover:border-foreground/40"
                      )}
                    >
                      <IndustryIcon category={ind.key} className="h-5 w-5" alt={ind.label} />
                      <span>{ind.label}</span>
                      {active && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Field label="Kort beskrivelse (valgfri)">
        <Textarea rows={3} value={p.description} onChange={(e: any) => p.setDescription(e.target.value)} />
      </Field>
    </div>
  );
}
