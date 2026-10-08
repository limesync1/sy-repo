// Imperativt spørgsmålsvindue, så logik (fx tidsregistrering) kan spørge
// brugeren ved tvetydige situationer uden at hver skærm skal eje et vindue.
import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Request = { title: string; description: string; confirmLabel: string; cancelLabel?: string; resolve: (ok: boolean) => void };
let push: ((r: Request) => void) | null = null;

export function askConfirm(opts: Omit<Request, "resolve">): Promise<boolean> {
  if (!push) return Promise.resolve(window.confirm(`${opts.title}\n\n${opts.description}`));
  return new Promise((resolve) => push!({ ...opts, resolve }));
}

export function ConfirmDialogHost() {
  const [req, setReq] = useState<Request | null>(null);
  useEffect(() => { push = setReq; return () => { push = null; }; }, []);
  const close = (ok: boolean) => { req?.resolve(ok); setReq(null); };
  return (
    <AlertDialog open={!!req} onOpenChange={(o) => { if (!o) close(false); }}>
      <AlertDialogContent className="planner-overlay max-w-[calc(100vw-2rem)] sm:max-w-md">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle>{req?.title}</AlertDialogTitle>
          <AlertDialogDescription>{req?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:flex">
          <AlertDialogCancel className="mt-0 h-12" onClick={() => close(false)}>{req?.cancelLabel ?? "Annullér"}</AlertDialogCancel>
          <AlertDialogAction className="h-12" onClick={() => close(true)}>{req?.confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
