// MobileSheet — fælles mobilvenlig bottom-sheet med fast struktur:
//   header (sticky, titel + luk-knap, drag-handle øverst)
//   scrollbart indhold (overscroll-contain, safe-area padding)
//   footer (sticky, til primær-CTA)
//
// Bygget oven på shadcn `Sheet` (Radix Dialog) med `side="bottom"`. Bruges som
// drop-in erstatning for Dialog i alle bruger-initierede flows på mobil (fx
// prisberegner, opret/redigér service, opret aftale, kunde-vælger).
//
// På tablet/desktop (sm: og op) opfører den sig stadig som et bottom-sheet,
// men centreret med max-bredde — så samme komponent kan bruges overalt uden
// at man skal swappe Dialog ↔ Sheet manuelt med useIsMobile.
import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface MobileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Titel vist i sticky header. Påkrævet for skærmlæsere. */
  title: React.ReactNode;
  /** Valgfri beskrivelse under titlen — vises mindre og dæmpet. */
  description?: React.ReactNode;
  /** Primær handling — vises i sticky footer på fuld bredde. */
  footer?: React.ReactNode;
  /** Indhold i scrollområdet. */
  children?: React.ReactNode;
  /** Ekstra klasser på content-wrapperen (sjældent nødvendigt). */
  className?: string;
  /** Skjul den lille drag-handle øverst (default: vist). */
  hideHandle?: boolean;
  /** Maksimal højde — default 92dvh så toppen af sheeten altid ses. */
  maxHeightClass?: string;
}

/**
 * Mobil-først bottom sheet med fast layout. Brug i stedet for Dialog når
 * brugeren skal udfylde noget på telefon — det giver tommelfingervenlig
 * placering, naturlig swipe-luk-følelse, og garanterer at primær-CTA'en
 * aldrig forsvinder bag tastatur eller hjemme-bjælken.
 */
export const MobileSheet = ({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
  hideHandle,
  maxHeightClass = "max-h-[92dvh]",
}: MobileSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideCloseButton
        className={cn(
          // Reset shadcn-sheet padding så vi selv styrer det per sektion.
          "p-0 gap-0 flex flex-col",
          // Fuld bredde på mobil; centreret med max-bredde på tablet+.
          "sm:mx-auto sm:max-w-lg",
          maxHeightClass,
          className,
        )}
      >
        {/* Drag-handle: visuel cue om at sheet'en kan lukkes ved at swipe ned. */}
        {!hideHandle && (
          <div className="flex shrink-0 justify-center pt-2 pb-1" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {/* Sticky header — titel + luk. */}
        <header className="shrink-0 border-b border-border/60 px-4 pb-3 pt-1">
          <SheetTitle className="text-base font-semibold leading-tight text-foreground">
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </SheetDescription>
          )}
        </header>

        {/* Scrollbart indhold. overscroll-contain forhindrer at baggrundssiden
            scroller med når man rammer top/bund. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>

        {/* Sticky footer — primær-CTA. pb tager højde for iOS hjemme-bjælke. */}
        {footer && (
          <footer
            className="shrink-0 border-t border-border/60 bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
          >
            {footer}
          </footer>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MobileSheet;