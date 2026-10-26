import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "ui-overlay fixed inset-0 z-[var(--z-overlay)] bg-black/55 dark:bg-black/70",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "ui-modal fixed inset-x-0 bottom-0 top-auto z-[var(--z-modal)] grid w-full max-w-none max-h-[calc(100dvh-0.75rem)] min-w-0 translate-x-0 translate-y-0 content-start gap-4 overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 bg-background p-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl shadow-foreground/10 before:absolute before:left-1/2 before:top-2 before:h-1 before:w-10 before:-translate-x-1/2 before:rounded-full before:bg-muted-foreground/30 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:max-h-[calc(100dvh-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border-b sm:p-6 sm:before:hidden",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-md bg-background/90 text-muted-foreground ring-offset-background transition-[opacity,background-color,color] hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none sm:right-3 sm:top-3">
        <X className="h-4 w-4" />
        <span className="sr-only">Luk</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("min-w-0 flex flex-col space-y-1.5 pr-10 text-left sm:pr-12", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("sticky bottom-[calc(-1*max(1rem,env(safe-area-inset-bottom)))] z-10 -mx-4 -mb-[max(1rem,env(safe-area-inset-bottom))] grid min-w-0 grid-cols-1 gap-2 border-t bg-background/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur min-[380px]:grid-cols-2 [&_button]:min-h-11 sm:static sm:mx-0 sm:mb-0 sm:flex sm:flex-row sm:justify-end sm:border-t-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-xl font-semibold leading-tight tracking-tight sm:text-lg", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-base leading-relaxed text-muted-foreground sm:text-sm", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
