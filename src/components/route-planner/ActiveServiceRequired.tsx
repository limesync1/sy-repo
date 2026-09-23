import { Button } from "@/components/ui/button";
import { PackagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ActiveServiceRequired({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center px-5 py-8 text-center">
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-secondary text-foreground">
        <PackagePlus className="h-5 w-5" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">Opret en aktiv service først</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
        En bestilling skal altid knyttes til en service, som kunderne kan bestille.
      </p>
      <Button className="mt-4 h-8 gap-1.5 rounded-md text-xs" onClick={() => navigate("/virksomhed/services")}>
        <PackagePlus className="h-3.5 w-3.5" /> Gå til services
      </Button>
      {!compact && <p className="mt-2 text-[11px] text-muted-foreground">Aktivér en eksisterende service eller opret en ny.</p>}
    </div>
  );
}
