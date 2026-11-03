import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, FileText, CheckCircle2, AlertTriangle, Loader2, Send, Sparkles, ExternalLink } from "lucide-react";
import { PageHeader, SectionCard, StatCard, EmptyState } from "@/components/admin/shared/AdminUI";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Admin control for the automatic SEO engine: settings, topic queue, drafts, published articles and Google status. */
const STEP_LABEL: Record<string, string> = { discover: "Find emner", write: "Skriv artikel", submit: "Indsend sitemap", inspect: "Tjek indeksering", refresh: "Forbedr svage sider" };

export default function PlatformSeoEngineTab() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const settings = useQuery({ queryKey: ["seo-settings"], queryFn: async () => (await supabase.from("seo_settings").select("*").single()).data });
  const topics = useQuery({ queryKey: ["seo-topics"], queryFn: async () => (await supabase.from("seo_topics").select("*").in("status", ["queued", "rejected"]).order("score", { ascending: false }).limit(40)).data ?? [] });
  const articles = useQuery({ queryKey: ["seo-articles"], queryFn: async () => (await supabase.from("seo_articles").select("id, slug, title, status, published_at, created_at, index_status, needs_improvement").neq("status", "rejected").order("created_at", { ascending: false }).limit(100)).data ?? [] });
  const runs = useQuery({ queryKey: ["seo-runs"], queryFn: async () => (await supabase.from("seo_runs").select("*").order("started_at", { ascending: false }).limit(10)).data ?? [] });
  const refreshAll = () => ["seo-settings", "seo-topics", "seo-articles", "seo-runs"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => { const { error } = await supabase.from("seo_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", true); if (error) throw error; },
    onSuccess: () => { toast.success("Gemt"); refreshAll(); },
    onError: (e: Error) => toast.error(`Kunne ikke gemme: ${e.message}`),
  });

  const runStep = async (action: string, topicId?: string) => {
    setBusy(topicId ?? action);
    const { data, error } = await supabase.functions.invoke("seo-engine", { body: { action, topicId } });
    setBusy(null);
    if (error) { const d = error instanceof FunctionsHttpError ? await error.context.text() : error.message; toast.error(`${STEP_LABEL[action]} fejlede: ${d}`); return; }
    if (data?.error) toast.error(`${STEP_LABEL[action]} fejlede: ${data.error}`);
    else if (data?.problems) toast.warning(`Artiklen bestod ikke kvalitetstjekket: ${data.problems.join(", ")}`);
    else if (data?.skipped) toast.info(data.skipped);
    else toast.success(`${STEP_LABEL[action]} er færdig`);
    refreshAll();
  };

  const setArticle = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("seo_articles").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Opdateret"); refreshAll(); }
  };
  const setTopic = async (id: string, status: string) => { await supabase.from("seo_topics").update({ status }).eq("id", id); refreshAll(); };

  const s = settings.data;
  const list = articles.data ?? [];
  const published = list.filter((a) => a.status === "published");
  const drafts = list.filter((a) => a.status === "draft");
  const indexed = published.filter((a) => /indexed/i.test(a.index_status ?? "") && !/not/i.test(a.index_status ?? ""));
  const refreshSuggestions = (topics.data ?? []).filter((t) => t.kind === "refresh" && t.status === "queued");
  const newTopics = (topics.data ?? []).filter((t) => t.kind === "new");

  return (
    <div className="space-y-4">
      <PageHeader title="SEO-motor" description="Finder emner i Google, skriver artikler, udgiver dem og indsender til Google helt automatisk." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Udgivet" value={published.length} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Venter godkendelse" value={drafts.length} icon={<Sparkles className="h-4 w-4" />} tone={drafts.length ? "warn" : "neutral"} />
        <StatCard label="Indekseret i Google" value={indexed.length} icon={<CheckCircle2 className="h-4 w-4" />} tone="ok" />
        <StatCard label="Emner i kø" value={newTopics.filter((t) => t.status === "queued").length} icon={<Search className="h-4 w-4" />} />
      </div>

      <SectionCard title="Indstillinger">
        {s?.paused_reason && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Sat på pause: {s.paused_reason}
            <Button size="sm" variant="outline" className="min-h-11" onClick={() => save.mutate({ paused_reason: null })}>Genoptag</Button>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Label htmlFor="seo-on" className="text-sm">Automatik slået til</Label>
            <Switch id="seo-on" checked={!!s?.enabled} onCheckedChange={(v) => save.mutate({ enabled: v })} />
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Label htmlFor="seo-auto" className="text-sm">Udgiv uden min godkendelse</Label>
            <Switch id="seo-auto" checked={!!s?.auto_publish} onCheckedChange={(v) => save.mutate({ auto_publish: v })} />
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Label className="text-sm">Artikler pr. uge</Label>
            <Select value={String(s?.articles_per_week ?? 3)} onValueChange={(v) => save.mutate({ articles_per_week: Number(v) })}>
              <SelectTrigger className="h-11 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5, 7, 14, 21].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Kører hver morgen kl. 07: mandag findes nye emner, artikler skrives på de valgte dage, nye artikler indsendes til Google, og søndag tjekkes om de er indekseret.</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STEP_LABEL).map(([k, label]) => (
            <Button key={k} variant="outline" className="min-h-11" disabled={!!busy} onClick={() => runStep(k)}>
              {busy === k && <Loader2 className="h-4 w-4 animate-spin" />}{label} nu
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Artikler" description="Kladder skal godkendes før de vises på hjemmesiden.">
        {!list.length ? <EmptyState icon={<FileText />} title="Ingen artikler endnu" description="Tryk «Find emner nu» og derefter «Skriv artikel nu»." /> : (
          <ul className="divide-y divide-border">
            {list.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{a.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <Badge variant={a.status === "published" ? "default" : "secondary"}>{a.status === "published" ? "Udgivet" : "Kladde"}</Badge>
                    {a.index_status && <Badge variant="outline">Google: {a.index_status}</Badge>}
                    {a.needs_improvement && <Badge variant="destructive">Bør forbedres</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status === "published" && <Button asChild variant="ghost" className="min-h-11"><a href={`/blog/${a.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Se</a></Button>}
                  {a.status === "draft" && <>
                    <Button className="min-h-11" onClick={() => setArticle(a.id, { status: "published", published_at: new Date().toISOString() })}><CheckCircle2 className="h-4 w-4" /> Godkend</Button>
                    <Button variant="outline" className="min-h-11" onClick={() => setArticle(a.id, { status: "rejected" })}>Afvis</Button>
                  </>}
                  {a.status === "published" && <Button variant="outline" className="min-h-11" onClick={() => setArticle(a.id, { status: "draft" })}>Afpublicér</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {refreshSuggestions.length > 0 && (
        <SectionCard title="Forslag til bedre titler" description="Sider med mange visninger men få klik i Google.">
          <ul className="divide-y divide-border">
            {refreshSuggestions.map((t) => {
              const sug = t.suggestion as { title?: string; description?: string } | null;
              return (
                <li key={t.id} className="space-y-1 py-3 text-sm">
                  <p className="font-medium text-foreground">{t.target_path} · {t.impressions} visninger, {t.clicks} klik</p>
                  <p className="text-foreground">Ny titel: {sug?.title}</p>
                  <p className="text-muted-foreground">Ny beskrivelse: {sug?.description}</p>
                  <Button variant="outline" className="min-h-11" onClick={() => setTopic(t.id, "done")}>Markér som håndteret</Button>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Emnekø" description="Søgninger hvor vi vises i Google men får få klik, sorteret efter potentiale.">
        {!newTopics.length ? <p className="text-sm text-muted-foreground">Ingen emner endnu.</p> : (
          <ul className="divide-y divide-border">
            {newTopics.map((t) => (
              <li key={t.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <span className="font-medium text-foreground">{t.keyword}</span>
                  <span className="ml-2 text-muted-foreground">{t.source === "gsc" ? `${t.impressions} visninger · plads ${Number(t.position ?? 0).toFixed(0)}` : t.source}</span>
                  {t.status === "rejected" && <Badge variant="destructive" className="ml-2">Fejlede kvalitetstjek</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="min-h-11" disabled={!!busy} onClick={() => runStep("write", t.id)}>
                    {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Skriv nu
                  </Button>
                  {t.status === "queued" && <Button variant="ghost" className="min-h-11" onClick={() => setTopic(t.id, "rejected")}>Fjern</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Seneste kørsler">
        <ul className="space-y-1 text-sm">
          {(runs.data ?? []).map((r) => (
            <li key={r.id} className="flex justify-between gap-3">
              <span className="text-foreground">{STEP_LABEL[r.kind] ?? r.kind} · {new Date(r.started_at).toLocaleString("da-DK")}</span>
              <span className={r.status === "ok" ? "text-foreground" : "text-destructive"}>{r.status === "ok" ? "OK" : r.status === "running" ? "Kører" : `Fejl: ${(r.details as { error?: string })?.error ?? r.status}`}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
