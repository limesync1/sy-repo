// ScopeOption — delt visuel "vælg omfang"-knap brugt i Flyt/Flet/Move dialogerne
// så de altid har samme look, padding, ring og radio-prik.
import { cn } from "@/lib/utils";
import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  description: string;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
};

export const ScopeOption = ({
  selected, onClick, disabled, title, description, icon, extra,
}: Props) => (
  <Button
    type="button"
    variant="outline"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "h-auto w-full min-w-0 justify-start whitespace-normal text-left rounded-md border p-3",
      selected ? "border-accent bg-accent/[0.055] ring-2 ring-accent/20 hover:bg-accent/[0.07]" : "border-border bg-card hover:border-accent/40 hover:bg-secondary/40",
      disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
    )}
  >
    <div className="mb-0.5 flex min-w-0 items-start gap-1.5">
      <span
        className={cn(
          "inline-flex h-3.5 w-3.5 rounded-full border-2 shrink-0 mt-0.5",
          selected ? "border-accent bg-accent" : "border-border bg-background",
        )}
      />
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <span className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">{title}</span>
    </div>
    <p className="min-w-0 pl-5 text-[11px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">{description}</p>
    {extra && <div className="pl-5">{extra}</div>}
  </Button>
);