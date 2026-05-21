import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Trash2 } from "lucide-react";
import { STATUS_OPTIONS } from "./shared";

interface Props {
  count: number;
  onChangeStatus: (v: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

export default function OrdersBulkBar({ count, onChangeStatus, onDelete, onClear }: Props) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm">
      <span className="font-medium text-foreground">{count} valgt</span>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 gap-1.5">
              Skift status <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {STATUS_OPTIONS.map((s) => (
              <DropdownMenuItem key={s.value} onClick={() => onChangeStatus(s.value)}>{s.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-red-600 hover:text-red-700" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Slet
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={onClear}>Ryd</Button>
      </div>
    </div>
  );
}