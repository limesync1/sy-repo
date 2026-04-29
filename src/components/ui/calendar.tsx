import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center px-8",
        caption_label: "text-sm font-semibold capitalize text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 inline-flex items-center justify-center rounded-md bg-transparent p-0 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.7rem] uppercase tracking-wide",
        row: "flex w-full mt-1.5",
        cell: cn(
          "relative h-9 w-9 p-0 text-center text-sm",
          "focus-within:relative focus-within:z-20",
          // Range middle: soft secondary band that connects endpoints
          "[&:has([aria-selected].day-range-middle)]:bg-secondary",
          // Range start/end: half-width band so the endpoint pill sits on the band
          "[&:has([aria-selected].day-range-start)]:bg-gradient-to-r [&:has([aria-selected].day-range-start)]:from-transparent [&:has([aria-selected].day-range-start)]:to-secondary",
          "[&:has([aria-selected].day-range-end)]:bg-gradient-to-r [&:has([aria-selected].day-range-end)]:from-secondary [&:has([aria-selected].day-range-end)]:to-transparent",
          // When start === end (single day), don't show any band
          "[&:has([aria-selected].day-range-start.day-range-end)]:!bg-transparent",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        ),
        day: cn(
          "h-9 w-9 p-0 font-normal rounded-full inline-flex items-center justify-center transition-colors",
          "text-foreground hover:bg-secondary/70 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "aria-selected:opacity-100",
        ),
        day_range_start: "day-range-start !bg-foreground !text-background hover:!bg-foreground hover:!text-background focus:!bg-foreground focus:!text-background shadow-sm",
        day_range_end: "day-range-end !bg-foreground !text-background hover:!bg-foreground hover:!text-background focus:!bg-foreground focus:!text-background shadow-sm",
        day_selected:
          "!bg-foreground !text-background hover:!bg-foreground hover:!text-background focus:!bg-foreground focus:!text-background shadow-sm",
        day_today: "border border-foreground/40 text-foreground font-semibold aria-selected:!border-transparent",
        day_outside: "day-outside text-muted-foreground/50",
        day_disabled: "text-muted-foreground/40 line-through hover:bg-transparent hover:text-muted-foreground/40 cursor-not-allowed",
        day_range_middle:
          "day-range-middle !bg-transparent !text-foreground hover:!bg-secondary/80 hover:!text-foreground rounded-none !shadow-none font-normal",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
