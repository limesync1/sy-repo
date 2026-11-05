import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Building2, Check, ExternalLink, FileText, Loader2, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FacebookBrandIcon, InstagramBrandIcon } from "@/components/shared/MetaBrandIcons";

type MetaPage = { id: string; name: string; pictureUrl: string | null; instagramName: string | null; forms: Array<{ id: string; name: string; status?: string }> };

type MetaConnection = {
  status: "disconnected" | "pending" | "connected" | "expired" | "error";
  page_name: string | null;
  instagram_account_name: string | null;
  selected_form_ids: string[];
  pixel_id: string | null;
  lead_ads_enabled: boolean;
  conversions_api_enabled: boolean;
  last_synced_at: string | null;
  last_error: string | null;
};

const statusLabel: Record<MetaConnection["status"], string> = {
  disconnected: "Ikke forbundet",
  pending: "Afventer opsætning",
  connected: "Forbundet",
  expired: "Forbind igen",
  error: "Kræver handling",
};

export const MetaLeadsSetup = ({ businessId }: { businessId: string }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: connection, isFetching, refetch } = useQuery({
    queryKey: ["meta-leads-connection", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_connections")
        .select("status, page_name, instagram_account_name, selected_form_ids, pixel_id, lead_ads_enabled, conversions_api_enabled, last_synced_at, last_error")
        .eq("business_id", businessId)
        .maybeSingle();
      if (error) throw error;
      return data as MetaConnection | null;
    },
  });

  const connected = connection?.status === "connected";
  const [problem, setProblem] = useState<{ title: string; text: string; steps: string[] } | null>(null);
  const [starting, setStarting] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [pageId, setPageId] = useState("");
  const [formIds, setFormIds] = useState<string[]>([]);

  const explain = (status: number | null, message?: string) => {
    if (status === 401) return { title: "Du er logget ud", text: "Din session er udløbet.", steps: ["Log ind igen", "Tryk på Forbind Meta igen"] };
    if (status === 403) return { title: "Ingen adgang", text: "Kun virksomhedens ejer kan forbinde Meta.", steps: ["Bed ejeren af virksomheden om at forbinde Meta"] };
    if (status === 400) return { title: "Virksomheden blev ikke fundet", text: "Vi kunne ikke se hvilken virksomhed, der skal forbindes.", steps: ["Genindlæs siden og prøv igen"] };
    if (status === null) return { title: "Ingen forbindelse", text: "Vi kunne ikke nå serveren.", steps: ["Tjek din internetforbindelse", "Prøv igen om lidt"] };
    return { title: "Meta svarede ikke som forventet", text: message || "Der skete en uventet fejl.", steps: ["Prøv igen om et par minutter", "Kontakt support, hvis det fortsætter"] };
  };

  const metaResultProblem = (result: string) => {
    if (result === "configuration-error") return {
      title: "Meta mangler opsætning",
      text: "Serviceyderes Meta-app mangler en nødvendig indstilling.",
      steps: ["Tilføj serviceydere.dk under Appdomæner i Meta", "Tilføj https://serviceydere.dk/meta/callback som gyldig OAuth-omdirigeringsadresse", "Prøv derefter igen"],
    };
    if (result === "token-error") return {
      title: "Meta afviste forbindelsen",
      text: "Den godkendte returadresse matcher sandsynligvis ikke opsætningen i Meta.",
      steps: ["Kontrollér at https://serviceydere.dk/meta/callback står præcist sådan i Meta", "Kontrollér at appen er aktiv", "Prøv at forbinde igen"],
    };
    if (result === "invalid-state") return { title: "Forbindelsen er udløbet", text: "Sikkerhedstjekket kunne ikke godkendes.", steps: ["Gå tilbage til Leads", "Start Meta-forbindelsen igen"] };
    if (result === "save-error") return { title: "Forbindelsen kunne ikke gemmes", text: "Meta godkendte forbindelsen, men den kunne ikke gemmes.", steps: ["Prøv igen", "Kontakt support, hvis det fortsætter"] };
    return { title: "Meta-forbindelsen fejlede", text: "Din eksisterende leadmodtagelse er ikke påvirket.", steps: ["Prøv at forbinde igen", "Kontrollér at du godkender alle de viste adgange"] };
  };

  const startSetup = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-oauth-start", { body: { businessId } });
      if (data?.configured === false) {
        setProblem({
          title: "Meta er ikke klar endnu",
          text: "Forbindelsen til Facebook og Instagram er ikke aktiveret på Serviceydere endnu. Det er ikke en fejl hos dig.",
          steps: ["Dine forespørgsler fra Serviceydere virker som normalt", "Du får besked, når Meta kan forbindes"],
        });
        return;
      }
      if (error || !data?.url) {
        let status: number | null = null;
        let message: string | undefined = data?.error;
        const ctx = (error as { context?: Response } | null)?.context;
        if (ctx && typeof ctx.status === "number") {
          status = ctx.status;
          try { message = (await ctx.clone().json())?.error ?? message; } catch { /* ignore */ }
          if (status === 503) {
            setProblem({ title: "Meta er ikke klar endnu", text: "Forbindelsen til Facebook og Instagram er ikke aktiveret endnu.", steps: ["Prøv igen senere"] });
            return;
          }
        } else if (error) status = null; else status = 500;
        setProblem(explain(status, message));
        return;
      }
      window.location.assign(data.url);
    } catch {
      setProblem(explain(null));
    } finally {
      setStarting(false);
    }
  };

  const loadPages = async () => {
    setLoadingPages(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-connection", { body: { action: "list", businessId } });
      if (error || !data?.pages) {
        let message = data?.error;
        const ctx = (error as { context?: Response } | null)?.context;
        if (ctx) try { message = (await ctx.clone().json())?.error || message; } catch { /* ignore */ }
        setProblem({ title: "Facebook-sider kunne ikke hentes", text: message || "Meta gav ikke adgang til virksomhedens sider.", steps: ["Kontrollér at du er administrator på Facebook-siden", "Forbind Meta igen og godkend alle adgange"] });
        return;
      }
      const available = data.pages as MetaPage[];
      setPages(available);
      const selected = available.find((page) => page.name === connection?.page_name) || available[0];
      setPageId(selected?.id || "");
      setFormIds(connection?.selected_form_ids || []);
      setSetupOpen(true);
    } catch {
      setProblem(explain(null));
    } finally {
      setLoadingPages(false);
    }
  };

  const [syncing, setSyncing] = useState(false);
  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-connection", { body: { action: "sync", businessId } });
      let message = data?.error as string | undefined;
      const ctx = (error as { context?: Response } | null)?.context;
      if (ctx) try { message = (await ctx.clone().json())?.error || message; } catch { /* ignore */ }
      if (error || !data?.ok) throw new Error(message || "Leads kunne ikke hentes fra Meta lige nu.");
      await refetch();
      toast.success(data.imported > 0 ? `${data.imported} forespørgsler hentet fra Meta` : "Ingen nye forespørgsler hos Meta");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Leads kunne ikke hentes fra Meta lige nu.");
    } finally {
      setSyncing(false);
    }
  };

  const saveConnection = async () => {
    if (!pageId) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("meta-connection", { body: { action: "connect", businessId, pageId, formIds } });
    setSaving(false);
    if (error || !data?.ok) {
      let message = data?.error;
      const ctx = (error as { context?: Response } | null)?.context;
      if (ctx) try { message = (await ctx.clone().json())?.error || message; } catch { /* ignore */ }
      setProblem({ title: "Meta kunne ikke færdiggøres", text: message || "Facebook-siden kunne ikke tilmeldes nye leads.", steps: ["Kontrollér din administratoradgang", "Forbind Meta igen, hvis adgangen er udløbet"] });
      return;
    }
    setSetupOpen(false);
    await refetch();
    toast.success(`${data.pageName} sender nu nye forespørgsler til Serviceydere`);
  };

  useEffect(() => {
    const result = searchParams.get("meta");
    if (!result) return;
    const next = new URLSearchParams(searchParams);
    next.delete("meta");
    setSearchParams(next, { replace: true });
    if (result === "select-page") {
      void refetch().then(() => loadPages());
      return;
    }
    if (result === "cancelled") setProblem({ title: "Forbindelsen blev afbrudt", text: "Der blev ikke ændret noget.", steps: ["Tryk på Forbind Meta, når du er klar"] });
    else setProblem(metaResultProblem(result));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPage = pages.find((page) => page.id === pageId);
  const selectedForms = selectedPage?.forms.filter((form) => formIds.includes(form.id)) ?? [];
  const primaryLabel = connected ? "Redigér forbindelse" : connection?.status === "pending" ? "Vælg dine kilder" : "Forbind Meta";

  return (
    <SectionCard
      title="Meta-annonceformularer og måling"
      icon={<FacebookBrandIcon />}
      description={connected ? "Nye forespørgsler fra dine valgte Meta-kilder lander automatisk i indbakken." : "Forbind Facebook og Instagram, så nye annonce-leads lander direkte i indbakken."}
      className="overflow-hidden border-border/80 shadow-premium"
      action={<Badge variant={connected ? "default" : "secondary"} className="gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-primary-foreground" : "bg-muted-foreground"}`} />{statusLabel[connection?.status ?? "disconnected"]}</Badge>}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex -space-x-1.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card shadow-sm"><FacebookBrandIcon className="h-6 w-6" /></span>
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card shadow-sm"><InstagramBrandIcon className="h-6 w-6" /></span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{connected ? connection.page_name : connection?.status === "pending" ? "Kontoen er forbundet" : "Facebook og Instagram"}</p>
            <p className="truncate text-xs text-muted-foreground">{connected ? (connection.instagram_account_name ? `Facebook · Instagram @${connection.instagram_account_name}` : "Facebook · tilføj Instagram via Meta") : connection?.status === "pending" ? "Vælg nu side, Instagram og formularer" : "Ét login forbinder dine Meta-annonceformularer"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button type="button" variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Opdatér Meta-status" title="Opdatér Meta-status">
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          <Button type="button" onClick={connection?.status === "pending" || connected ? loadPages : startSetup} disabled={starting || loadingPages} className="min-w-[190px] gap-2">
            {starting || loadingPages ? <Loader2 className="h-4 w-4 animate-spin" /> : connected ? <Settings2 className="h-4 w-4" /> : connection?.status === "pending" ? <ArrowRight className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            {primaryLabel}
          </Button>
        </div>
      </div>
      {connected && (
        <div className="flex flex-col gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{connection.selected_form_ids.length ? `${connection.selected_form_ids.length} formularer er valgt` : "Alle nuværende og nye formularer modtages automatisk"}{connection.last_synced_at ? ` · Senest hentet ${new Date(connection.last_synced_at).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
              <a href="https://developers.facebook.com/tools/lead-ads-testing" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Send test-lead</a>
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={syncNow} disabled={syncing}>
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Hent seneste forespørgsler nu
            </Button>
          </div>
        </div>
      )}
      {connection?.last_error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Meta-forbindelsen skal opdateres. Tryk på knappen og forbind igen.</span>
        </div>
      )}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="modal-large max-h-[92dvh] overflow-y-auto p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-5 pb-5 pt-6 sm:px-7">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card"><FacebookBrandIcon className="h-5 w-5" /></span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card"><InstagramBrandIcon className="h-5 w-5" /></span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl">Vælg hvor forespørgsler kommer fra</DialogTitle>
            <DialogDescription className="max-w-xl">Vælg virksomhedens Meta-side. En tilknyttet Instagram-konto og dens annonceformularer følger automatisk med.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 px-5 py-5 sm:px-7">
            {pages.length === 0 ? (
              <div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Ingen Facebook-sider blev fundet. Kontrollér, at du er administrator på mindst én side.</span></div>
            ) : (
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div><p className="text-sm font-semibold text-foreground">Virksomhed på Meta</p><p className="text-xs text-muted-foreground">Vælg siden, som annoncerne tilhører.</p></div>
                  <RadioGroup value={pageId} onValueChange={(value) => { setPageId(value); setFormIds([]); }} className="space-y-2">
                {pages.map((page) => (
                  <Label key={page.id} htmlFor={`meta-page-${page.id}`} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3.5 transition-colors ${pageId === page.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/40"}`}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
                      {page.pictureUrl ? (
                        <img src={page.pictureUrl} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <Building2 className="h-5 w-5 text-accent" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-foreground">{page.name}</span>
                      <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><FacebookBrandIcon className="h-3.5 w-3.5" /><span>Facebook</span>{page.instagramName && <><span>·</span><InstagramBrandIcon className="h-3.5 w-3.5" /><span className="truncate">@{page.instagramName}</span></>}</span>
                    </span>
                    <RadioGroupItem id={`meta-page-${page.id}`} value={page.id} />
                  </Label>
                ))}
                  </RadioGroup>
                </div>
                <div className="space-y-3">
                  <div><p className="text-sm font-semibold text-foreground">Leadformularer</p><p className="text-xs text-muted-foreground">Vælg bestemte formularer, eller lad feltet være tomt for at modtage fra alle.</p></div>
                  {!selectedPage ? (
                    <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">Vælg først en Facebook-side</div>
                  ) : selectedPage.forms.length === 0 ? (
                    <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">Ingen formularer fundet. Nye formularer bliver automatisk inkluderet.</div>
                  ) : (
                    <div className="divide-y divide-border rounded-md border border-border">
                      {selectedPage.forms.map((form) => (
                        <Label key={form.id} className="flex cursor-pointer items-center gap-3 px-3 py-3 text-sm hover:bg-secondary/30">
                          <Checkbox checked={formIds.includes(form.id)} onCheckedChange={(checked) => setFormIds((current) => checked ? [...current, form.id] : current.filter((id) => id !== form.id))} />
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{form.name}</span>
                          {form.status && <Badge variant="outline" className="text-[10px]">{form.status}</Badge>}
                        </Label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {selectedPage && (
              <div className="flex items-start gap-3 rounded-md bg-secondary/50 px-4 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div className="text-xs"><p className="font-semibold text-foreground">Klar til at modtage forespørgsler</p><p className="mt-0.5 text-muted-foreground">{selectedPage.name}{selectedPage.instagramName ? ` og Instagram @${selectedPage.instagramName}` : ""} sender fra {selectedForms.length ? `${selectedForms.length} valgte formular${selectedForms.length === 1 ? "" : "er"}` : "alle formularer"}.</p></div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 border-t border-border bg-secondary/30 px-5 py-4 sm:px-7">
            <Button variant="outline" onClick={() => setSetupOpen(false)}>Annuller</Button>
            <Button onClick={saveConnection} disabled={!pageId || saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Gem leadkilder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!problem} onOpenChange={(o) => !o && setProblem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-warning" />{problem?.title}</DialogTitle>
            <DialogDescription>{problem?.text}</DialogDescription>
          </DialogHeader>
          {problem && (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
              {problem.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          )}
          <DialogFooter><Button onClick={() => setProblem(null)}>Forstået</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
};

export default MetaLeadsSetup;