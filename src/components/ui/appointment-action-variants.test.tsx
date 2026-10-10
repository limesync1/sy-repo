import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("appointment action variants", () => {
  it("uses distinct semantic styles for edit, create and office note actions", () => {
    render(<>
      <Button variant="appointmentEdit">Ret aftale</Button>
      <Button variant="appointmentCreate">Ny aftale</Button>
      <Button variant="appointmentNote">Note til kontoret</Button>
    </>);
    expect(screen.getByRole("button", { name: "Ret aftale" })).toHaveClass("appointment-action-edit");
    expect(screen.getByRole("button", { name: "Ny aftale" })).toHaveClass("appointment-action-create");
    expect(screen.getByRole("button", { name: "Note til kontoret" })).toHaveClass("appointment-action-note");
  });
});