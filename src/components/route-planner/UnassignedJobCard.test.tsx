import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { UnassignedJobCard } from "./UnassignedJobCard";
vi.mock("@/hooks/use-mobile", () => ({ useIsBelowBreakpoint: () => true }));
afterEach(cleanup);
const job = { id: "test-appointment", customer_name: "Lotte Madsen", status: "accepted", address: "Vistorpvej 30, 7540 Haderup" };
describe("appointment card actions", () => {
  it("keeps selection separate from opening and route assignment", () => {
    const open = vi.fn(); const select = vi.fn(); const assign = vi.fn();
    render(<DndContext><UnassignedJobCard job={job} compact onClick={open} onToggleSelect={select} onChooseRoute={assign} /></DndContext>);
    fireEvent.click(screen.getByRole("button", { name: "Vælg Lotte Madsen" }));
    expect(select).toHaveBeenCalledTimes(1); expect(open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Læg på rute" }));
    expect(assign).toHaveBeenCalledTimes(1); expect(open).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("button", { name: "Åbn detaljer for Lotte Madsen" }), { key: "Enter" });
    expect(open).toHaveBeenCalledTimes(1);
  });
});
