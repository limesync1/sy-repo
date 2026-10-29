import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CvrLookupField from "./CvrLookupField";
import { lookupCvr } from "@/lib/cvr-lookup";

vi.mock("@/lib/cvr-lookup", () => ({ lookupCvr: vi.fn() }));
const reply = {
  data: { found: true, cvr: "12345678", name: "Registerfirma", address: "Registervej 1", zip_code: "5000", city: "Odense", phone: null, email: null },
  error: null,
};

describe("CVR lookup intent", () => {
  beforeEach(() => vi.mocked(lookupCvr).mockReset());
  afterEach(cleanup);

  it("does not look up or overwrite a prefilled customer on mount or customer selection", () => {
    const onResult = vi.fn();
    const view = render(<CvrLookupField value="12345678" onChange={vi.fn()} onResult={onResult} />);
    view.rerender(<CvrLookupField value="87654321" onChange={vi.fn()} onResult={onResult} />);
    expect(lookupCvr).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("automatically looks up eight digits entered by the user", async () => {
    vi.mocked(lookupCvr).mockResolvedValue(reply);
    const onResult = vi.fn();
    function Form() {
      const [value, setValue] = useState("");
      return <CvrLookupField value={value} onChange={setValue} onResult={onResult} />;
    }
    render(<Form />);
    fireEvent.change(screen.getByLabelText("CVR-nummer"), { target: { value: "1234567" } });
    expect(lookupCvr).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("CVR-nummer"), { target: { value: "12345678" } });
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(reply.data));
    expect(lookupCvr).toHaveBeenCalledExactlyOnceWith("12345678");
  });

  it("allows an explicit lookup of a prefilled CVR", async () => {
    vi.mocked(lookupCvr).mockResolvedValue(reply);
    const onResult = vi.fn();
    render(<CvrLookupField value="12345678" onChange={vi.fn()} onResult={onResult} />);
    fireEvent.click(screen.getByRole("button", { name: "Slå op" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(reply.data));
  });

  it("ignores a pending registry response after selecting another customer", async () => {
    let finish: ((value: typeof reply) => void) | undefined;
    vi.mocked(lookupCvr).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const onResult = vi.fn();
    const view = render(<CvrLookupField value="12345678" onChange={vi.fn()} onResult={onResult} />);
    fireEvent.click(screen.getByRole("button", { name: "Slå op" }));
    view.rerender(<CvrLookupField value="87654321" onChange={vi.fn()} onResult={onResult} />);
    await act(async () => { finish?.(reply); });
    expect(onResult).not.toHaveBeenCalled();
    expect(lookupCvr).toHaveBeenCalledTimes(1);
  });
});