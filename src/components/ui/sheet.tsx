import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "ui-overlay fixed inset-0 z-[var(--z-overlay)] bg-black/55 dark:bg-black/70",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "ui-sheet fixed z-[var(--z-modal)] min-w-0 gap-4 overflow-x-hidden overscroll-contain bg-background p-6 shadow-2xl shadow-foreground/10 transition motion-reduce:transition-none",
  {
    variants: {
      side: {
        top: "ui-sheet-top inset-x-0 top-0 border-b",
        bottom:
          "ui-sheet-bottom inset-x-0 bottom-0 max-h-[calc(100dvh-0.5rem)] rounded-t-lg border border-b-0 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-2xl sm:rounded-lg sm:border sm:pb-6",
        left: "ui-sheet-left inset-y-2 left-2 h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-sm rounded-lg border lg:inset-y-0 lg:left-0 lg:h-full lg:rounded-none lg:border-y-0 lg:border-l-0 lg:border-r",
        right:
          "ui-sheet-right inset-y-2 right-2 h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-sm rounded-lg border lg:inset-y-0 lg:right-0 lg:h-full lg:w-3/4 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Hide the dimmed background overlay. Useful for non-modal sheets that should let users interact with the page behind. */
  hideOverlay?: boolean;
  /** Hide the default top-right close (X) button. */
  hideCloseButton?: boolean;
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, hideOverlay, hideCloseButton, overlayClassName, ...props }, ref) => (
    <SheetPortal>
      {!hideOverlay && <SheetOverlay className={overlayClassName} />}
      <SheetPrimitive.Content ref={ref} data-side={side} className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        {!hideCloseButton && (
          <SheetPrimitive.Close className="absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-md bg-background/90 text-muted-foreground ring-offset-background transition-[opacity,background-color,color] hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none sm:right-3 sm:top-3 sm:h-10 sm:w-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Luk</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  ),
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex min-w-0 flex-col space-y-2 pr-10 text-left sm:pr-12", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:flex sm:flex-row sm:justify-end", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
