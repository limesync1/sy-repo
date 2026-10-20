import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionLabelMark } from "@/components/shared/UiArtwork";
import BlueFlowBackground from "./BlueFlowBackground";

/**
 * CTABand — mørkt afslutnings-bånd der bruges i bunden af alle
 * offentlige sider, så hver side ender med ét tydeligt næste skridt.
 */
type Props = {
  animated?: boolean;
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
  className?: string;
};

const CTABand = ({ animated = true, eyebrow, title, body, primary, secondary, className }: Props) => (
  <section className={cn("w-full bg-background px-4 py-10 sm:px-6 sm:py-12 lg:px-8 2xl:py-16", animated && "home-closing", className)}>
    <div
      className="public-blue-surface relative isolate mx-auto max-w-7xl overflow-hidden rounded-lg bg-ocean px-5 py-9 text-ocean-foreground sm:px-8 sm:py-11 2xl:px-10 2xl:py-16"
    >
      {animated && <BlueFlowBackground variant="closing" />}
      <div className="public-content-enter relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-ocean-foreground/70">
              <SectionLabelMark />
              {eyebrow}
            </span>
          )}
          <h2 className="mt-4 text-balance text-[1.85rem] font-semibold leading-[1.12] sm:text-[2.35rem]">
            {title}
          </h2>

          {body && <p className="mt-3 text-[15px] leading-7 text-ocean-foreground/90">{body}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
          <SmartLink to={primary.to}>
            <Button
              size="lg"
              variant="heroLight"
              className="group h-11 w-full gap-2 rounded-lg px-6 text-sm font-semibold sm:w-auto"
            >
              {primary.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </SmartLink>
          {secondary && (
            <SmartLink to={secondary.to}>
              <Button
                size="lg"
                variant="heroDark"
                className="h-11 w-full gap-2 rounded-lg px-6 text-sm font-semibold sm:w-auto"
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
