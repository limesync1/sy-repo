// SectionSkeleton — rolig pladsholder for forsidens sektioner mens de
// hentes. Den holder præcis samme højde som den færdige sektion, så siden
// ikke hopper når indholdet lander, og den fader blødt ud.
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  /** Antal kort i grid'et. 0 = kun overskrift + brødtekst. */
  cards?: number;
  /** Kolonner i kort-grid'et. */
  cols?: string;
  /** Højde på hvert kort. */
  cardClassName?: string;
  /** Mørk sektion (hero/CTA/footer) — brug en dæmpet lys puls. */
  dark?: boolean;
  className?: string;
};

export const SectionSkeleton = ({
  cards = 3,
  cols = "sm:grid-cols-2 lg:grid-cols-3",
  cardClassName = "h-52",
  dark = false,
  className,
}: Props) => (
  <section
    aria-hidden
    className={cn("w-full px-4 py-12 sm:px-6 sm:py-14 lg:py-16 2xl:py-24", className)}
  >
    <div className="mx-auto w-full max-w-7xl">
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <Skeleton className={cn("mx-auto h-3 w-28 rounded-full", dark && "bg-ocean-foreground/15")} />
        <Skeleton className={cn("mx-auto h-8 w-3/4", dark && "bg-ocean-foreground/15")} />
        <Skeleton className={cn("mx-auto h-4 w-2/3", dark && "bg-ocean-foreground/15")} />
      </div>
      {cards > 0 && (
        <div className={cn("mt-10 grid gap-5", cols)}>
          {Array.from({ length: cards }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("w-full rounded-lg", cardClassName, dark && "bg-ocean-foreground/15")}
            />
          ))}
        </div>
      )}
    </div>
  </section>
);

export default SectionSkeleton;
