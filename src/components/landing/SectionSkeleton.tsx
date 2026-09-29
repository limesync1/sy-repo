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
    className={cn("w-full px-4 py-16 sm:px-6 sm:py-20", className)}
  >
    <div className="mx-auto w-full max-w-6xl">
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <Skeleton className={cn("mx-auto h-3 w-28 rounded-full", dark && "bg-background/15")} />
        <Skeleton className={cn("mx-auto h-8 w-3/4", dark && "bg-background/15")} />
        <Skeleton className={cn("mx-auto h-4 w-2/3", dark && "bg-background/15")} />
      </div>
      {cards > 0 && (
        <div className={cn("mt-10 grid gap-5", cols)}>
          {Array.from({ length: cards }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("w-full rounded-2xl", cardClassName, dark && "bg-background/15")}
            />
          ))}
        </div>
      )}
    </div>
  </section>
);

export default SectionSkeleton;
