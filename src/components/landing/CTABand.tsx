import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * CTABand — mørkt afslutnings-bånd der bruges i bunden af alle
 * offentlige sider, så hver side ender med ét tydeligt næste skridt.
 */
type Props = {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
  className?: string;
};

const CTABand = ({ eyebrow, title, body, primary, secondary, className }: Props) => (
  <section className={cn("w-full bg-ocean px-4 py-10 sm:px-6 sm:py-12 lg:px-8 2xl:py-16", className)}>
    <div
      className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-2xl px-5 py-9 text-ocean-foreground sm:px-8 sm:py-11 2xl:rounded-3xl 2xl:px-10 2xl:py-16"
      style={{ backgroundColor: "hsl(var(--hero-bg))" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-[100px] opacity-40"
        style={{ backgroundColor: "hsl(var(--hero-mid))" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full blur-[110px] opacity-25"
        style={{ backgroundColor: "hsl(var(--hero-cyan))" }}
      />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-ocean-foreground/70">
              <span aria-hidden className="h-px w-6 bg-ocean-foreground/40" />
              {eyebrow}
            </span>
          )}
          <h2 className="mt-4 text-balance text-[1.85rem] font-semibold leading-[1.06] tracking-[-0.03em] sm:text-[2.35rem]">
            {title}
          </h2>

          {body && <p className="mt-3 text-[15px] leading-7 text-ocean-foreground/75">{body}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
          <SmartLink to={primary.to}>
            <Button
              size="lg"
              className="group h-11 w-full gap-2 rounded-full bg-background px-6 text-sm font-semibold text-foreground hover:bg-background/90 sm:w-auto"
            >
              {primary.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </SmartLink>
          {secondary && (
            <SmartLink to={secondary.to}>
              <Button
                size="lg"
                variant="outline"
                className="h-11 w-full gap-2 rounded-full border-background/40 bg-background/5 px-6 text-sm font-semibold text-ocean-foreground backdrop-blur hover:bg-background/15 hover:text-ocean-foreground sm:w-auto"
              >
                {secondary.label}
              </Button>
            </SmartLink>
          )}
        </div>
      </div>
    </div>
  </section>
);

export default CTABand;
