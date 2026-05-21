import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FLAG_REASONS } from "./shared";

interface Props {
  open: boolean;
  review: any | null;
  reason: string;
  setReason: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
}

export default function FlagDialog({ open, review, reason, setReason, note, setNote, onClose, onSubmit, isPending }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flag anmeldelse</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs">
            <p className="font-medium text-foreground">{review?.reviewer_name} → {review?.businesses?.name}</p>
            {review?.comment && <p className="mt-1 text-muted-foreground italic">"{review.comment}"</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Årsag</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FLAG_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Intern note (valgfri)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1 text-sm" placeholder="Kontekst for andre admins..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annullér</Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? "Flagger..." : "Flag anmeldelse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}