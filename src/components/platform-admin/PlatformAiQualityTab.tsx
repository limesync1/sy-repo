/**
 * PlatformAiQualityTab — kvalitetsstyring af Serviceydere AI i livechatten.
 *
 * Tre områder:
 *  1. Link-fejl (`ai_link_issues`): filtrér på type/status/søgning, luk sager
 *     og godkend en alias-rettelse direkte, så AI'en fremover skriver den
 *     korrekte sti (gemmes i `ai_link_aliases` og læses af edge-funktionen).
 *  2. Review-tickets (`ai_review_tickets`): oprettes automatisk når en kunde
 *     rapporterer et forkert svar — med AI-forslag til rettet videnartikel.
 *  3. Analytics (`ai_answer_events` + `chat_message_feedback`): succesrate pr.
 *     videnkategori korreleret med link-fejl og lyd-dedupe.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAdminMutation } from "@/components/platform-admin/lib/useAdminMutation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Link2, Flag, BarChart3, Check, X, Sparkles, Volume2, Search } from "lucide-react";

// Nye tabeller er endnu ikke i de auto-genererede typer — cast bevidst.
const db = supabase as any;

const KEY_ISSUES = ["ai-link-issues"];
const KEY_TICKETS = ["ai-review-tickets"];
const KEY_ANALYTICS = ["ai-answer-analytics"];

type Issue = {
  id: string;
  source: string;
  kind: "alias" | "invalid";
  raw_link: string;
  resolved_link: string | null;
  link_label: string | null;
  reply_excerpt: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type Ticket = {
  id: string;
  conversation_id: string | null;
  message_id: string | null;
  reported_reason: string | null;
  question_excerpt: string | null;
  answer_excerpt: string | null;
  categories: string[];
  suggested_title: string | null;
  suggested_fix: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type AnswerEvent = {
  id: string;
  message_id: string | null;
  categories: string[];
  link_issue_count: number;
  alias_fix_count: number;
  invalid_link_count: number;
  escalated: boolean;
  sound_played: number;
  sound_deduped: number;
  created_at: string;
};

const ago = (iso: string) => formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: da });

const statusTone: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  ignored: "bg-secondary text-muted-foreground",
};

/* ─────────────────────────── Link-fejl ─────────────────────────── */

function LinkIssues() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("open");
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const [aliasFor, setAliasFor] = useState<Issue | null>(null);
  const [aliasTarget, setAliasTarget] = useState("");

  const { data: issues, isLoading } = useQuery({
    queryKey: [...KEY_ISSUES, status, kind],
    queryFn: async () => {
      let query = db
        .from("ai_link_issues")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (status !== "all") query = query.eq("status", status);
      if (kind !== "all") query = query.eq("kind", kind);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Issue[];
    },
  });

  const { data: aliases } = useQuery({
    queryKey: ["ai-link-aliases"],
    queryFn: async () => {
      const { data, error } = await db
        .from("ai_link_aliases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Array<{ id: string; wrong_path: string; correct_path: string; is_active: boolean }>;
    },
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return issues || [];
    return (issues || []).filter((i) =>
      [i.raw_link, i.resolved_link, i.link_label, i.reply_excerpt].join(" ").toLowerCase().includes(needle),
    );
  }, [issues, q]);

  const setIssueStatus = useAdminMutation<unknown, { id: string; next: string }>({
    mutationFn: async ({ id, next }) => {
      const { error } = await db
        .from("ai_link_issues")
        .update({ status: next, resolved_at: next === "open" ? null : new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    successMessage: "Status opdateret",
    invalidateKeys: [KEY_ISSUES],
  });

  const saveAlias = useAdminMutation<unknown, { wrong: string; correct: string }>({
    mutationFn: async ({ wrong, correct }) => {
      const { error } = await db
        .from("ai_link_aliases")
        .upsert({ wrong_path: wrong, correct_path: correct, is_active: true }, { onConflict: "wrong_path" });
      if (error) throw new Error(error.message);
    },
    successMessage: "Alias godkendt — AI'en bruger den korrekte sti fremover",
    invalidateKeys: [["ai-link-aliases"], KEY_ISSUES],
    onDone: () => {
      setAliasFor(null);
      setAliasTarget("");
      qc.invalidateQueries({ queryKey: KEY_ISSUES });
    },
  });

  const toggleAlias = useAdminMutation<unknown, { id: string; active: boolean }>({
    mutationFn: async ({ id, active }) => {
      const { error } = await db.from("ai_link_aliases").update({ is_active: active }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    successMessage: "Alias opdateret",
    invalidateKeys: [["ai-link-aliases"]],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Søg i sti, label eller svar"
            aria-label="Søg i link-fejl"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]" aria-label="Filtrér på status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Åbne</SelectItem>
            <SelectItem value="resolved">Rettet</SelectItem>
            <SelectItem value="ignored">Ignoreret</SelectItem>
            <SelectItem value="all">Alle</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-[170px]" aria-label="Filtrér på type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle typer</SelectItem>
            <SelectItem value="alias">Auto-rettet (alias)</SelectItem>
            <SelectItem value="invalid">Ugyldigt link</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListCardSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Link2 />} title="Ingen link-fejl" description="AI'en har ikke sendt ugyldige links i denne visning." />
      ) : (
        <div className="space-y-2">
          {rows.map((i) => (
            <div key={i.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={i.kind === "invalid" ? "border-destructive/40 text-destructive" : ""}>
                  {i.kind === "invalid" ? "Ugyldigt" : "Alias"}
                </Badge>
                <code className="rounded bg-secondary px-1.5 py-0.5 text-[12px]">{i.raw_link}</code>
                {i.resolved_link && <span className="text-xs text-muted-foreground">→ <code className="rounded bg-secondary px-1.5 py-0.5 text-[12px]">{i.resolved_link}</code></span>}
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone[i.status] || statusTone.open}`}>
                  {i.status === "resolved" ? "Rettet" : i.status === "ignored" ? "Ignoreret" : "Åben"}
                </span>
                <span className="text-[11px] text-muted-foreground">{ago(i.created_at)}</span>
              </div>
              {i.reply_excerpt && (
                <p className="mt-2 line-clamp-2 text-[13px] text-muted-foreground">{i.reply_excerpt}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setAliasFor(i); setAliasTarget(i.resolved_link || ""); }}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Ret / godkend alias
                </Button>
                {i.status !== "resolved" && (
                  <Button size="sm" variant="ghost" onClick={() => setIssueStatus.mutate({ id: i.id, next: "resolved" })}>
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Markér som rettet
                  </Button>
                )}
                {i.status !== "ignored" && (
                  <Button size="sm" variant="ghost" onClick={() => setIssueStatus.mutate({ id: i.id, next: "ignored" })}>
                    <X className="mr-1.5 h-3.5 w-3.5" /> Ignorér
                  </Button>
                )}
              </div>

              {aliasFor?.id === i.id && (
                <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-3">
                  <label className="text-[12px] font-medium text-foreground" htmlFor={`alias-${i.id}`}>
                    Korrekt sti for <code>{i.raw_link}</code>
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <Input
                      id={`alias-${i.id}`}
                      value={aliasTarget}
                      onChange={(e) => setAliasTarget(e.target.value)}
                      placeholder="/software/priser"
                      className="max-w-xs"
                    />
                    <Button
                      size="sm"
                      disabled={!aliasTarget.startsWith("/") || saveAlias.isPending}
                      onClick={() => {
                        saveAlias.mutate({ wrong: i.raw_link, correct: aliasTarget.trim() });
                        setIssueStatus.mutate({ id: i.id, next: "resolved" });
                      }}
                    >
                      Godkend
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAliasFor(null)}>Annullér</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <SectionCard title="Godkendte alias-rettelser" icon={<Link2 />} description="AI'ens svar omskrives automatisk med disse stier.">
        {(aliases || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen aliaser endnu.</p>
        ) : (
          <ul className="space-y-1.5">
            {(aliases || []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                <code className="rounded bg-secondary px-1.5 py-0.5">{a.wrong_path}</code>
                <span className="text-muted-foreground">→</span>
                <code className="rounded bg-secondary px-1.5 py-0.5">{a.correct_path}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => toggleAlias.mutate({ id: a.id, active: !a.is_active })}
                >
                  {a.is_active ? "Slå fra" : "Slå til"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

/* ─────────────────────── Review-tickets ─────────────────────── */

function ReviewTickets() {
  const [status, setStatus] = useState("open");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: tickets, isLoading } = useQuery({
    queryKey: [...KEY_TICKETS, status],
    queryFn: async () => {
      let query = db.from("ai_review_tickets").select("*").order("created_at", { ascending: false }).limit(200);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Ticket[];
    },
  });

  const update = useAdminMutation<unknown, { id: string; patch: Record<string, unknown> }>({
    mutationFn: async ({ id, patch }) => {
      const { error } = await db.from("ai_review_tickets").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    successMessage: "Ticket opdateret",
    invalidateKeys: [KEY_TICKETS],
  });

  if (isLoading) return <ListCardSkeleton />;
  if (!tickets?.length) {
    return (
      <div className="space-y-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]" aria-label="Filtrér tickets"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Åbne</SelectItem>
            <SelectItem value="resolved">Løst</SelectItem>
            <SelectItem value="ignored">Ignoreret</SelectItem>
            <SelectItem value="all">Alle</SelectItem>
          </SelectContent>
        </Select>
        <EmptyState icon={<Flag />} title="Ingen rapporterede svar" description="Når en kunde rapporterer et forkert AI-svar, lander sagen her." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[150px]" aria-label="Filtrér tickets"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Åbne</SelectItem>
          <SelectItem value="resolved">Løst</SelectItem>
          <SelectItem value="ignored">Ignoreret</SelectItem>
          <SelectItem value="all">Alle</SelectItem>
        </SelectContent>
      </Select>

      {tickets.map((t) => (
        <div key={t.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Rapporteret svar</Badge>
            {t.categories?.map((c) => (
              <Badge key={c} variant="secondary" className="font-mono text-[11px]">{c}</Badge>
            ))}
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone[t.status] || statusTone.open}`}>
              {t.status === "resolved" ? "Løst" : t.status === "ignored" ? "Ignoreret" : "Åben"}
            </span>
            <span className="text-[11px] text-muted-foreground">{ago(t.created_at)}</span>
          </div>

          <dl className="mt-3 space-y-2 text-[13px]">
            <div>
              <dt className="font-medium text-foreground">Kundens spørgsmål</dt>
              <dd className="text-muted-foreground">{t.question_excerpt || "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">AI-svaret</dt>
              <dd className="text-muted-foreground">{t.answer_excerpt || "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Begrundelse</dt>
              <dd className="text-muted-foreground">{t.reported_reason || "(ingen)"}</dd>
            </div>
          </dl>

          {(t.suggested_title || t.suggested_fix) && (
            <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Foreslået videnartikel: {t.suggested_title || "Rettelse"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] text-muted-foreground">{t.suggested_fix}</p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Textarea
              rows={2}
              value={notes[t.id] ?? t.admin_note ?? ""}
              onChange={(e) => setNotes((p) => ({ ...p, [t.id]: e.target.value }))}
              placeholder="Note til vidensbasen"
              className="min-w-[220px] flex-1"
              aria-label="Note til ticket"
            />
            <Button size="sm" onClick={() => update.mutate({ id: t.id, patch: { status: "resolved", admin_note: notes[t.id] ?? t.admin_note, resolved_at: new Date().toISOString() } })}>
              <Check className="mr-1.5 h-3.5 w-3.5" /> Markér som løst
            </Button>
            <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: t.id, patch: { status: "ignored" } })}>
              Ignorér
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Analytics ─────────────────────────── */

function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: KEY_ANALYTICS,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const [events, feedback] = await Promise.all([
        db.from("ai_answer_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
        db.from("chat_message_feedback").select("message_id, rating").limit(1000),
      ]);
      if (events.error) throw new Error(events.error.message);
      return {
        events: (events.data || []) as AnswerEvent[],
        feedback: (feedback.data || []) as Array<{ message_id: string; rating: string }>,
      };
    },
  });

  const perCategory = useMemo(() => {
    if (!data) return [];
    const ratingByMsg = new Map(data.feedback.map((f) => [f.message_id, f.rating]));
    const map = new Map<string, { answers: number; up: number; down: number; linkIssues: number; escalated: number }>();
    for (const e of data.events) {
      const cats = e.categories?.length ? e.categories : ["(ingen kilde)"];
      const rating = e.message_id ? ratingByMsg.get(e.message_id) : undefined;
      for (const c of cats) {
        const row = map.get(c) || { answers: 0, up: 0, down: 0, linkIssues: 0, escalated: 0 };
        row.answers += 1;
        if (rating === "up") row.up += 1;
        if (rating === "down") row.down += 1;
        row.linkIssues += e.link_issue_count || 0;
        if (e.escalated) row.escalated += 1;
        map.set(c, row);
      }
    }
    return Array.from(map.entries())
      .map(([category, v]) => ({
        category,
        ...v,
        rated: v.up + v.down,
        successRate: v.up + v.down > 0 ? Math.round((v.up / (v.up + v.down)) * 100) : null,
      }))
      .sort((a, b) => b.answers - a.answers);
  }, [data]);

  const totals = useMemo(() => {
    const ev = data?.events || [];
    const up = perCategory.reduce((s, r) => s + r.up, 0);
    const down = perCategory.reduce((s, r) => s + r.down, 0);
    return {
      answers: ev.length,
      linkIssues: ev.reduce((s, e) => s + (e.link_issue_count || 0), 0),
      soundPlayed: ev.reduce((s, e) => s + (e.sound_played || 0), 0),
      soundDeduped: ev.reduce((s, e) => s + (e.sound_deduped || 0), 0),
      successRate: up + down > 0 ? Math.round((up / (up + down)) * 100) : null,
    };
  }, [data, perCategory]);

  if (isLoading) return <ListCardSkeleton />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="AI-svar (30 dage)" value={totals.answers} icon={<BarChart3 />} />
        <StatCard
          label="Succesrate"
          value={totals.successRate === null ? "—" : `${totals.successRate}%`}
          icon={<Check />}
          tone={totals.successRate !== null && totals.successRate < 70 ? "warn" : "ok"}
          hint="Tommel op ud af bedømte svar"
        />
        <StatCard label="Link-fejl" value={totals.linkIssues} icon={<Link2 />} tone={totals.linkIssues > 0 ? "warn" : "neutral"} />
        <StatCard
          label="Lyd: afspillet / dedupet"
          value={`${totals.soundPlayed} / ${totals.soundDeduped}`}
          icon={<Volume2 />}
          hint="Dedupe forhindrer dobbelt-afspilning"
        />
      </div>

      <SectionCard
        title="Succesrate pr. videnkategori"
        icon={<BarChart3 />}
        description="Viser om fx software/priser klarer sig dårligere end systemet — og om link-fejl følger med."
      >
        {perCategory.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen målinger endnu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">Kategori</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Svar</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Bedømt</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Succesrate</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Link-fejl</th>
                  <th scope="col" className="py-2 font-medium">Eskaleret</th>
                </tr>
              </thead>
              <tbody>
                {perCategory.map((r) => (
                  <tr key={r.category} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-mono text-[12px]">{r.category}</td>
                    <td className="py-2 pr-3">{r.answers}</td>
                    <td className="py-2 pr-3">{r.rated}</td>
                    <td className="py-2 pr-3">
                      {r.successRate === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={r.successRate < 70 ? "font-semibold text-destructive" : "font-semibold text-emerald-600 dark:text-emerald-400"}>
                          {r.successRate}%
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{r.linkIssues}</td>
                    <td className="py-2">{r.escalated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default function PlatformAiQualityTab() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="AI-kvalitet"
        description="Link-fejl, rapporterede svar og succesrate pr. videnkategori for Serviceydere AI."
      />
      <Tabs defaultValue="links">
        <TabsList>
          <TabsTrigger value="links"><Link2 className="mr-1.5 h-4 w-4" /> Link-fejl</TabsTrigger>
          <TabsTrigger value="tickets"><Flag className="mr-1.5 h-4 w-4" /> Rapporterede svar</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="mr-1.5 h-4 w-4" /> Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="links" className="mt-4"><LinkIssues /></TabsContent>
        <TabsContent value="tickets" className="mt-4"><ReviewTickets /></TabsContent>
        <TabsContent value="analytics" className="mt-4"><Analytics /></TabsContent>
      </Tabs>
    </div>
  );
}
