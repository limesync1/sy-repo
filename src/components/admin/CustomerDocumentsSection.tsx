import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Trash2, Loader2, Download, FileSignature } from "lucide-react";
import { toast } from "sonner";

interface Doc {
  id: string;
  title: string;
  document_type: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  is_visible_to_customer: boolean;
  created_at: string;
}

interface Props {
  businessId: string;
  businessCustomerId: string | null;
  customerEmail: string;
}

const TYPE_LABEL: Record<string, string> = {
  contract: "Kontrakt",
  quote: "Tilbud",
  agreement: "Aftale",
  invoice: "Faktura",
  other: "Andet",
};

const formatBytes = (n: number | null) => {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const CustomerDocumentsSection = ({ businessId, businessCustomerId, customerEmail }: Props) => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("contract");
  const [visible, setVisible] = useState(true);

  const load = async () => {
    if (!businessCustomerId) { setDocs([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_documents")
      .select("*")
      .eq("business_customer_id", businessCustomerId)
      .order("created_at", { ascending: false });
    if (!error) setDocs((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [businessCustomerId]);

  if (!businessCustomerId) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        Gem kunden først for at uploade dokumenter (kontrakter, aftaler, tilbud).
      </div>
    );
  }

  const handleUpload = async (file: File) => {
    if (!title.trim()) { toast.error("Angiv en titel først"); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error("Maks 25 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${businessId}/${businessCustomerId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("customer-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("customer_documents").insert({
        business_id: businessId,
        business_customer_id: businessCustomerId,
        customer_email: customerEmail,
        title: title.trim(),
        document_type: docType,
        storage_path: path,
        file_size: file.size,
        mime_type: file.type || null,
        is_visible_to_customer: visible,
      });
      if (insErr) {
        await supabase.storage.from("customer-documents").remove([path]);
        throw insErr;
      }
      toast.success("Dokument uploadet");
      setTitle("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Upload fejlede");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (d: Doc) => {
    const { data, error } = await supabase.storage
      .from("customer-documents")
      .createSignedUrl(d.storage_path, 60);
    if (error || !data?.signedUrl) { toast.error("Kunne ikke åbne fil"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (d: Doc) => {
    if (!confirm(`Slet dokument "${d.title}"?`)) return;
    const { error: rmErr } = await supabase.from("customer_documents").delete().eq("id", d.id);
    if (rmErr) { toast.error(rmErr.message); return; }
    await supabase.storage.from("customer-documents").remove([d.storage_path]);
    toast.success("Slettet");
    load();
  };

  const toggleVisible = async (d: Doc) => {
    const { error } = await supabase
      .from("customer_documents")
      .update({ is_visible_to_customer: !d.is_visible_to_customer })
      .eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2">
        <FileSignature className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-foreground">Dokumenter (kontrakter, tilbud, aftaler)</p>
      </div>

      {/* Upload form */}
      <div className="rounded-md border bg-background p-2.5 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px]">Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fx Rengøringsaftale 2026" className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-[11px]">Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[11px]">
            <Switch checked={visible} onCheckedChange={setVisible} />
            Synlig for kunden i deres portal
          </label>
          <label className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs cursor-pointer hover:bg-muted ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload fil
            <input
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.currentTarget.value = ""; }}
            />
          </label>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Indlæser…</p>
      ) : docs.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Ingen dokumenter endnu.</p>
      ) : (
        <div className="space-y-1.5">
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-2 rounded-md border bg-background p-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{d.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {TYPE_LABEL[d.document_type] || d.document_type} · {formatBytes(d.file_size)} ·{" "}
                  {new Date(d.created_at).toLocaleDateString("da-DK")}
                </p>
              </div>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Switch checked={d.is_visible_to_customer} onCheckedChange={() => toggleVisible(d)} />
              </label>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDownload(d)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(d)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerDocumentsSection;