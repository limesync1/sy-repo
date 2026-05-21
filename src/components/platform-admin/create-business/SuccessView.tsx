import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyRow } from "./shared";

export default function SuccessView({ result, onCreateAnother, onClose }: any) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <p className="mt-3 text-base font-semibold text-emerald-900">Virksomhed oprettet</p>
        <p className="text-xs text-emerald-800 mt-1">
          {result.userExisted ? "Eksisterende bruger tildelt som ejer" : "Ny bruger oprettet"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <CopyRow label="Slug" value={result.slug} />
        <CopyRow label="Login-URL" value={result.loginUrl} />
        {result.temporaryPassword && (
          <CopyRow label="Engangskodeord" value={result.temporaryPassword} mono highlight />
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCreateAnother} className="flex-1">
          <Sparkles className="mr-2 h-4 w-4" /> Opret en til
        </Button>
        <Button onClick={onClose} className="flex-1">Luk</Button>
      </div>
    </div>
  );
}
