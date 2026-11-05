import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { FieldLabel } from "@/components/admin/shared/AdminUI";

export function defaultSender(name: string): string {
  const map: Record<string, string> = { æ: "ae", ø: "oe", å: "aa", Æ: "Ae", Ø: "Oe", Å: "Aa" };
  const s = name.replace(/[æøåÆØÅ]/g, (c) => map[c]).replace(/\b(ApS|A\/S|IVS|I\/S)\b/gi, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 11);
  return s.length >= 3 ? s : "Serviceyder";
}

interface Props {
  businessId: string;
  businessName: string;
  smsEnabled: boolean;
  onSmsEnabledChange: (v: boolean) => void;
}

export default function SmsSetupCard({ businessId, businessName, smsEnabled, onSmsEnabledChange }: Props) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["sms-setup", businessId],
    queryFn: async () => {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const [cfg, log] = await Promise.all([
        supabase.from("business_sms_settings").select("sender_name, monthly_cap").eq("business_id", businessId).maybeSingle(),
        supabase.from("sms_messages").select("status, segments").eq("business_id", businessId).gte("created_at", monthStart.toISOString()),
      ]);
      const rows = log.data ?? [];
      return {
        sender: cfg.data?.sender_name ?? "",
        cap: cfg.data?.monthly_cap ?? 200,
        sent: rows.filter((r) => r.status !== "failed").reduce((s, r) => s + (r.segments ?? 1), 0),
        failed: rows.filter((r) => r.status === "failed").length,
      };
    },
  });
  const [sender, setSender] = useState("");
  const [cap, setCap] = useState("200");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setSender(data.sender || defaultSender(businessName));
    setCap(String(data.cap));
  }, [data, businessName]);

  const senderValid = /^[A-Za-z0-9]{3,11}$/.test(sender);
  const capNum = Number(cap);
  const capValid = Number.isInteger(capNum) && capNum >= 0 && capNum <= 10000;

  const save = async () => {
    if (!senderValid || !capValid) return;
    setSaving(true);
    const { error } = await supabase.from("business_sms_settings")
      .upsert({ business_id: businessId, sender_name: sender, monthly_cap: capNum });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("SMS-indstillinger gemt");
    qc.invalidateQueries({ queryKey: ["sms-setup", businessId] });
  };

  const test = async () => {
    setTesting(true);
    const { data: res, error } = await supabase.functions.invoke("send-sms", { body: { businessId } });
    setTesting(false);
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { msg = (await error.context.json()).error ?? msg; } catch { /* ignore */ }
      }
      return toast.error(`Test-SMS fejlede: ${msg}`);
    }
    if (res?.ok) toast.success("Test-SMS sendt til virksomhedens telefon");
    qc.invalidateQueries({ queryKey: ["sms-setup", businessId] });
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">Send også SMS til kunder</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Serviceydere sender SMS'erne for jer. I skal ikke oprette noget selv.
          </p>
        </div>
        <Switch checked={smsEnabled} onCheckedChange={onSmsEnabledChange} aria-label="Send også SMS" className="mt-2" />
      </div>

      {smsEnabled && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Afsendernavn (vises på kundens telefon)</FieldLabel>
              <Input value={sender} maxLength={11} onChange={(e) => setSender(e.target.value.replace(/[^A-Za-z0-9]/g, ""))} className="h-11" />
              <p className={`mt-1 text-xs ${senderValid ? "text-muted-foreground" : "text-destructive"}`}>
                3–11 bogstaver eller tal, uden mellemrum og æ/ø/å.
              </p>
            </div>
            <div>
              <FieldLabel>Højst antal SMS pr. måned</FieldLabel>
              <Input type="number" inputMode="numeric" min={0} max={10000} value={cap} onChange={(e) => setCap(e.target.value)} className="h-11" />
              <p className="mt-1 text-xs text-muted-foreground">Når loftet er nået, sendes der kun e-mail resten af måneden.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
            <span>Denne måned: <strong className="text-foreground">{data?.sent ?? 0}</strong> af {data?.cap ?? 200} SMS sendt</span>
            {!!data?.failed && <span className="text-destructive">{data.failed} fejlede</span>}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={save} disabled={saving || !senderValid || !capValid} className="min-h-11">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Gem SMS-indstillinger
            </Button>
            <Button variant="outline" onClick={test} disabled={testing} className="min-h-11">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send test-SMS til os selv
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Kunder i Danmark og Norden kan få SMS. Hver kunde får højst 5 SMS pr. døgn.
          </p>
        </div>
      )}
    </section>
  );
}
