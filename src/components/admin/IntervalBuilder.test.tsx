import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IntervalBuilder } from "./IntervalBuilder";

function Editor() {
  const [value, setValue] = useState(["engangskøb"]);
  return <><IntervalBuilder value={value} onChange={setValue} /><output aria-label="Selected intervals">{JSON.stringify(value)}</output></>;
}

describe("service interval selection", () => {
  it("keeps multiple recurring intervals alongside a one-time purchase", () => {
    render(<Editor />);
    const options = screen.getAllByRole("checkbox");
    fireEvent.click(options[0]);
    fireEvent.click(options[1]);
    expect(JSON.parse(screen.getByLabelText("Selected intervals").textContent || "[]")).toEqual(["engangskøb", "ugentlig", "hver_14_dag"]);
  });

  it("deselects one interval without removing the others", () => {
    render(<Editor />);
    const options = screen.getAllByRole("checkbox");
    fireEvent.click(options[0]);
    fireEvent.click(options[1]);
    fireEvent.click(options[0]);
    expect(JSON.parse(screen.getByLabelText("Selected intervals").textContent || "[]")).toEqual(["engangskøb", "hver_14_dag"]);
  });
});