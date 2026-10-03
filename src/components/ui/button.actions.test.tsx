import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./button";

afterEach(cleanup);
describe("Route action variants", () => {
  it("keeps undo, completion and details visually distinct", () => {
    render(<><Button variant="undo">Fortryd udførsel</Button><Button variant="complete">Markér som udført</Button><Button variant="outline">Stopoplysninger</Button></>);
    expect(screen.getByRole("button", { name: "Fortryd udførsel" })).toHaveClass("route-action-undo");
    expect(screen.getByRole("button", { name: "Markér som udført" })).toHaveClass("route-action-complete");
    for (const button of screen.getAllByRole("button")) expect(button).not.toHaveClass("brand-blue-action");
  });
});