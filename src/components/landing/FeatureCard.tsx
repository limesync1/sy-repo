import type { ReactNode } from "react";
import SmartLink from "@/components/SmartLink";
import { cn } from "@/lib/utils";

/**
 * FeatureCard — ét kort i et grid. Bruges til fordele, funktioner,
 * brancher og produktområder på tværs af de offentlige sider, så alle
 * grids ser ens ud.
 */
type Props = {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  /** Gør hele kortet klikbart. */
  to?: string;
  /** Fremhævet variant — bruges til ét kort pr. grid. */
  highlight?: boolean;
  /** Lille label i hjørnet, fx "Populær". */
  tag?: string;
  footer?: ReactNode;
  className?: string;
};

const FeatureCard = ({ icon, title, body, to, highlight, tag, footer, className }: Props) => {
  const content = (
    <div
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border p-5 transition-all duration-200",
        highlight
          ? "border-accent/35 bg-accent-soft/60 hover:border-accent/60"
          : "border-border bg-card hover:border-foreground/20",
        "hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
    >
      {tag && (
        <span className="absolute right-4 top-4 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
          {tag}
        </span>
      )}
      {icon && (
        <span
          className={cn(
            "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl",
            highlight ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <h3 className="text-[15px] font-semibold tracking-tight text-foreground sm:text-base">{title}</h3>
      {body && <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{body}</p>}
      {footer && <div className="mt-4 pt-1">{footer}</div>}
    </div>
  );

  if (!to) return content;
  return (
    <SmartLink to={to} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
      {content}
    </SmartLink>
  );
};

export default FeatureCard;
