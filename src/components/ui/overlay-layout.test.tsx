import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

describe("shared overlay layout", () => {
  it("reserves room for the close control and keeps content inside the viewport", () => {
    render(<Dialog defaultOpen><DialogContent><DialogHeader><DialogTitle>En meget lang dansk overskrift til et lille vindue</DialogTitle><DialogDescription>Beskrivelse</DialogDescription></DialogHeader></DialogContent></Dialog>);
    expect(screen.getByRole("dialog")).toHaveClass("max-h-[calc(100dvh-1rem)]", "z-[var(--z-modal)]");
    expect(screen.getByText(/En meget lang/).parentElement).toHaveClass("pr-10");
    expect(screen.getByRole("button", { name: "Luk" })).toHaveClass("h-11", "w-11");
  });

  it("keeps popovers and selects above the route HUD with bounded sizes", () => {
    render(<><Popover defaultOpen><PopoverTrigger>Åbn</PopoverTrigger><PopoverContent>Indhold</PopoverContent></Popover><Select defaultOpen><SelectTrigger aria-label="Rute"><SelectValue placeholder="Vælg" /></SelectTrigger><SelectContent><SelectItem value="a">Rute A</SelectItem></SelectContent></Select></>);
    expect(screen.getByText("Indhold")).toHaveClass("z-[var(--z-popover)]", "max-w-[calc(100vw-1rem)]");
    expect(screen.getByRole("listbox")).toHaveClass("z-[var(--z-popover)]", "max-h-[calc(100dvh-1rem)]");
  });

  it("opens from a trigger with viewport-safe modal classes", () => {
    render(<Dialog><DialogTrigger>Vis vindue</DialogTrigger><DialogContent><DialogTitle>Vindue</DialogTitle><DialogDescription>Beskrivelse</DialogDescription></DialogContent></Dialog>);
    fireEvent.click(screen.getByRole("button", { name: "Vis vindue" }));
    expect(screen.getByRole("dialog")).toHaveClass("w-[calc(100vw-1rem)]");
  });
});