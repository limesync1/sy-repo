import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // Konsekvent skeleton-base: samme farve, samme rounded, samme pulse-rytme
  // (defineret i tailwind.config.ts) overalt i appen. `bg-muted/70` gør den
  // lidt blødere på lyse baggrunde uden at "forsvinde" på mørke kort.
  return (
    <div
      aria-hidden="true"
      className={cn("loading-skeleton max-w-full shrink-0 motion-safe:animate-pulse rounded-md bg-muted/70", className)}
      {...props}
    />
  );
}

export { Skeleton };
