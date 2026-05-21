import { Loader2, KeyRound, MailCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ImpersonateState } from "./useImpersonation";

interface Props {
  state: ImpersonateState | null;
  onClose: () => void;
  onChangeCode: (v: string) => void;
  onRedeem: () => void;
}

/** Dialog der viser status for kode-flowet + felt til at indløse 5-cifret kode. */
export const ImpersonationDialog = ({ state, onClose, onChangeCode, onRedeem }: Props) => (
  <Dialog open={!!state} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" /> Log ind som {state?.business.name}
        </DialogTitle>
        <DialogDescription>
          Vi sender en 5-cifret engangskode til din admin-e-mail. Indtast koden for at åbne virksomhedens panel. Koden er gyldig i 15 minutter og kan kun bruges én gang. Virksomheden får ikke besked.
        </DialogDescription>
      </DialogHeader>

      {state?.loading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Genererer og sender kode…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex items-start gap-3">
              <MailCheck className="h-5 w-5 mt-0.5 text-emerald-600 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Kode sendt på e-mail</p>
                <p className="text-muted-foreground">
                  Vi har sendt en 5-cifret engangskode til <span className="font-medium text-foreground">{state?.sentTo}</span>. Koden er gyldig i 15 minutter.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Indtast kode for at fortsætte</label>
            <Input
              inputMode="numeric"
              maxLength={5}
              placeholder="•••••"
              className="mt-1 text-center font-mono text-2xl tracking-[0.4em] tabular-nums h-12"
              value={state?.inputCode ?? ""}
              onChange={(e) => onChangeCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              onKeyDown={(e) => { if (e.key === "Enter") onRedeem(); }}
            />
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Annullér</Button>
        <Button
          onClick={onRedeem}
          disabled={!state || state.loading || state.redeeming || (state.inputCode ?? "").length !== 5}
        >
          {state?.redeeming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logger ind…</> : "Åbn virksomhedens panel"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);