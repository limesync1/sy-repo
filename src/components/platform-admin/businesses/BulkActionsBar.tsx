import { ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Props {
  count: number;
  onUpdate: (patch: { is_verified?: boolean; is_active?: boolean }) => void;
  onDelete: () => void;
  onClear: () => void;
}

/** Bar med bulk-handlinger (verificering, aktivering, slet) vises når noget er valgt. */
export const BulkActionsBar = ({ count, onUpdate, onDelete, onClear }: Props) => (
  <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm">
    <span className="font-medium">{count} valgt</span>
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5">
            Handlinger <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onUpdate({ is_verified: true })}>Verificér</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdate({ is_verified: false })}>Fjern verifikation</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdate({ is_active: true })}>Aktivér</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdate({ is_active: false })}>Deaktivér</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" /> Slet
      </Button>
      <Button size="sm" variant="ghost" className="h-9" onClick={onClear}>Ryd</Button>
    </div>
  </div>
);