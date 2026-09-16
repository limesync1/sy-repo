import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Rocket, Loader2, Mail, Users, Building2, Eye, EyeOff, Send, Download, CheckCircle2,
} from "lucide-react";
import { PageHeader, SectionCard, PrimaryButton, StatCard, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * PlatformWaitlistTab — styring af testfase-beskeden på hele sitet og af
 * ventelisten bag den. Herfra kan du:
 *  1) rette teksten i beskeden og slå den til/fra på alle offentlige sider
 *  2) se hvem der har skrevet sig op
 *  3) sende "vi er åbnet"-mailen til alle, der endnu ikke har fået den
 */

type Signup = {
  id: string;
  email: string;
  role_interest: string;
  source: string | null;
  created_at: string;
  notified_at: string | null;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("da-DK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function PlatformWaitlistTab() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<{ enabled: boolean; title: string; body: string } | null>(null);
  const [sending, setSending] = useState(false);

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["beta-notice-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("beta_notice_enabled, beta_notice_title, beta_notice_body")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? {}) as any;
    },
  });

  const { data: signups, isLoading: loadingSignups } = useQuery({
    queryKey: ["beta-signups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beta_signups")
        .select("id, email, role_interest, source, created_at, notified_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as Signup[];
    },
  });

  const form = draft ?? {
    enabled: !!settings?.beta_notice_enabled,
    title: settings?.beta_notice_title ?? "",
    body: settings?.beta_notice_body ?? "",
  };
  const set = (patch: Partial<typeof form>) => setDraft({ ...form, ...patch });

  const saveSettings = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          beta_notice_enabled: values.enabled,
          beta_notice_title: values.title.trim().slice(0, 160) || null,
          beta_notice_body: values.body.trim().slice(0, 600) || null,
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Beskeden er opdateret");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["beta-notice-settings"] });
      qc.invalidateQueries({ queryKey: ["public-beta-notice"] });
    },
    onError: (e: any) => toast.error("Kunne ikke gemme", { description: e.message }),
  });

  const total = signups?.length ?? 0;
  const pending = useMemo(() => (signups ?? []).filter((s) => !s.notified_at).length, [signups]);
  const businesses = useMemo(() => (signups ?? []).filter((s) => s.role_interest === "virksomhed").length, [signups]);
  const notified = total - pending;

  const sendLaunch = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("beta-launch-announce", { body: {} });
    setSending(false);
    if (error) {
      toast.error("Mailen kunne ikke sendes", { description: error.message });
      return;
    }
    const res = data as { sent: number; failed: number };
    toast.success(`${res.sent} mail${res.sent === 1 ? "" : "s"} sendt`, {
      description: res.failed ? `${res.failed} kunne ikke leveres og prøves igen næste gang.` : "Alle på ventelisten har fået besked.",
    });
    qc.invalidateQueries({ queryKey: ["beta-signups"] });
  };

  const exportCsv = () => {
    const rows = [["email", "type", "tilmeldt", "fået besked"], ...(signups ?? []).map((s) => [
      s.email, s.role_interest, s.created_at, s.notified_at ?? "",
    ])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "venteliste.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Venteliste & testfase"
        description="Styr beskeden om testfase på alle sider — og send åbnings-mailen når I er klar."
        action={
          <Button variant="outline" className="h-9 rounded-lg" onClick={exportCsv} disabled={!total}>
            <Download className="mr-1.5 h-4 w-4" /> Hent liste
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Skrevet op i alt" value={total} icon={<Users />} />
        <StatCard label="Venter på besked" value={pending} icon={<Mail />} tone="amber" />
        <StatCard label="Har fået besked" value={notified} icon={<CheckCircle2 />} tone="ok" />
        <StatCard label="Virksomheder" value={businesses} icon={<Building2 />} tone="blue" />
      </div>

      <SectionCard
        title="Beskeden på sitet"
        icon={form.enabled ? <Eye /> : <EyeOff />}
        description="Vises øverst på alle offentlige sider. Slå den fra, når I åbner for alle."
      >
        {loadingSettings ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Indlæser…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Vis besked om testfase</p>
                <p className="text-xs text-muted-foreground">
                  {form.enabled ? "Beskeden er synlig for alle besøgende." : "Beskeden er skjult — sitet ser helt normalt ud."}
                </p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(v) => set({ enabled: v })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="beta-title">Overskrift</Label>
              <Input
                id="beta-title"
                value={form.title}
                maxLength={160}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Vi er i testfase — vi åbner snart"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="beta-body">Brødtekst</Label>
              <Textarea
                id="beta-body"
                rows={4}
                maxLength={600}
                value={form.body}
                onChange={(e) => set({ body: e.target.value })}
                placeholder="Forklar kort hvorfor I ikke er åbne endnu, og hvad der sker, når folk skriver sig op."
              />
              <p className="text-xs text-muted-foreground">{form.body.length}/600 tegn</p>
            </div>

            <div className="flex justify-end">
              <PrimaryButton
                onClick={() => saveSettings.mutate(form)}
                disabled={saveSettings.isPending || !draft}
                icon={saveSettings.isPending ? <Loader2 className="animate-spin" /> : <Rocket />}
              >
                Gem besked
              </PrimaryButton>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Åbn for alle"
        icon={<Send />}
        description="Sender én mail til hver på listen, som ikke allerede har fået den. Ingen får den to gange."
      >
        <div className="flex flex-wrap items-center gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <PrimaryButton disabled={sending || pending === 0} icon={sending ? <Loader2 className="animate-spin" /> : <Send />}>
                Send åbnings-mail til {pending}
              </PrimaryButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send åbnings-mail?</AlertDialogTitle>
                <AlertDialogDescription>
                  {pending} person{pending === 1 ? "" : "er"} får en mail om, at Serviceydere nu er åbnet.
                  Husk bagefter at slå beskeden om testfase fra, så sitet ser åbent ud.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Fortryd</AlertDialogCancel>
                <AlertDialogAction onClick={sendLaunch}>Send nu</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {pending === 0 && total > 0 && (
            <span className="text-sm text-muted-foreground">Alle på listen har fået besked.</span>
          )}
        </div>
      </SectionCard>

      {loadingSignups ? (
        <ListCardSkeleton rows={6} />
      ) : total === 0 ? (
        <EmptyState
          icon={<Mail />}
          title="Ingen på ventelisten endnu"
          description="Når nogen skriver sin e-mail i beskeden øverst på sitet, dukker de op her."
        />
      ) : (
        <Card className="overflow-hidden rounded-xl border-border shadow-sm">
          <div className="divide-y divide-border">
            {(signups ?? []).map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                  {s.role_interest === "virksomhed" ? <Building2 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{s.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.role_interest === "virksomhed" ? "Virksomhed" : "Kunde"} · skrev sig op {fmt(s.created_at)}
                  </p>
                </div>
                <span
                  className={
                    s.notified_at
                      ? "shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                  }
                >
                  {s.notified_at ? "Fået besked" : "Venter"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
