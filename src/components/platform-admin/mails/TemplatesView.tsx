import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton, StatGridSkeleton } from "@/components/admin/shared/Skeletons";
import { Send, Eye, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function TemplatesView() {
  const [selected, setSelected] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Default test-recipient = current admin email
  useEffect(() => {
    if (sendEmail) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setSendEmail(data.user.email);
    });
  }, [sendEmail]);

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ["admin-template-list"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-preview-template", { method: "GET" });
      if (error) throw error;
      return (data?.templates || []) as { name: string; displayName: string; hasPreview: boolean }[];
    },
  });

  const { data: preview, isLoading: previewLoading, isFetching: previewFetching } = useQuery({
    queryKey: ["admin-template-preview", selected],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-preview-template", {
        body: { templateName: selected },
      });
      if (error) throw error;
      return data as { displayName: string; subject: string; html: string; previewData: any; renderError: string | null };
    },
    enabled: !!selected,
  });

  const sendTest = async () => {
    if (!selected || !sendEmail.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-preview-template", {
        body: {
          action: "send",
          templateName: selected,
          recipientEmail: sendEmail.trim(),
          idempotencyKey: `admin-test-${selected}-${Date.now()}`,
          templateData: preview?.previewData ?? {},
        },
      });
      if (error || !data?.sent) throw error || new Error("Modtageren kan ikke kontaktes");
      toast.success(`Test sendt til ${sendEmail.trim()}`);
      setSendOpen(false);
      setSendEmail("");
    } catch (e: any) {
      toast.error("Kunne ikke sende", { description: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="rounded-xl border-border shadow-sm overflow-hidden">
        <div className="border-b border-border bg-secondary/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Skabeloner {list ? `(${list.length})` : ""}
        </div>
        {listLoading ? (
          <div className="p-3"><ListCardSkeleton rows={6} /></div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
            {(list || []).map((t) => (
              <button
                key={t.name}
                onClick={() => setSelected(t.name)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                  selected === t.name ? "bg-secondary text-foreground" : "hover:bg-secondary/50 text-foreground",
                )}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.displayName}</p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">{t.name}</p>
                </div>
                {!t.hasPreview && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="rounded-xl border-border shadow-sm overflow-hidden min-h-[600px] flex flex-col">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon={<Eye />} title="Vælg en skabelon" description="Klik på en skabelon i listen for at se preview." />
          </div>
        ) : previewLoading ? (
          <div className="p-6 space-y-3">
            <StatGridSkeleton count={2} />
            <ListCardSkeleton rows={6} />
          </div>
        ) : preview?.renderError ? (
          <div className="p-6">
            <Card className="border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Kunne ikke rendere: {preview.renderError}
            </Card>
          </div>
        ) : preview ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Emne</p>
                <p className="truncate text-sm font-semibold text-foreground">{preview.subject || "—"}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{selected}</p>
              </div>
              <Button size="sm" onClick={() => setSendOpen(true)} disabled={previewFetching}>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Send test
              </Button>
            </div>
            <iframe
              title="email preview"
              srcDoc={preview.html}
              className="flex-1 w-full bg-white"
              sandbox=""
            />
          </>
        ) : null}
      </Card>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send test-mail</DialogTitle>
            <DialogDescription>
              Sender skabelonen <span className="font-mono">{selected}</span> med dens preview-data til en valgt modtager.
              Mailen tæller som en almindelig transactional-mail og logges i send-loggen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Modtager-email</label>
            <Input type="email" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} placeholder="modtager@eksempel.dk" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sending}>Annullér</Button>
            <Button onClick={sendTest} disabled={sending || !sendEmail.trim()}>
              {sending ? "Sender..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}