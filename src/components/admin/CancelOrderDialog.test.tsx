import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CancelOrderDialog } from "./CancelOrderDialog";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), warning: vi.fn() } }));

function setup(payment_status = "unpaid") {
  const onCancel = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CancelOrderDialog order={{ id: "order-id", payment_status }} onCancel={onCancel} onClose={onClose} /></QueryClientProvider>);
  return { onCancel, onClose };
}

describe("cancellation credit choice", () => {
  beforeEach(() => vi.clearAllMocks());
  it("credits successfully before cancelling", async () => {
    const events: string[] = [];
    invoke.mockImplementation(async (_name, { body }) => {
      if (body.action === "check_capabilities") return { data: { caps: { can_credit: true, exists_in_provider: true } }, error: null };
      events.push("credit");
      return { data: { ok: true }, error: null };
    });
    const { onCancel } = setup();
    onCancel.mockImplementation(async () => { events.push("cancel"); });
    fireEvent.click(await screen.findByRole("button", { name: "Opret kreditnota og annullér" }));
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith("order-id"));
    expect(events).toEqual(["credit", "cancel"]);
  });
  it("never cancels when creating the credit note fails", async () => {
    invoke.mockResolvedValueOnce({ data: { caps: { can_credit: true, exists_in_provider: true } } }).mockResolvedValueOnce({ error: new Error("Failed") });
    const { onCancel, onClose } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Opret kreditnota og annullér" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(onCancel).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
  it("lets the office handle credit without creating one", async () => {
    invoke.mockResolvedValue({ data: { caps: { can_credit: true, exists_in_provider: true } } });
    const { onCancel } = setup();
    fireEvent.click(await screen.findByRole("button", { name: /Annullér uden kreditnota/ }));
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith("order-id"));
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it("skips creating a second credit note for credited orders", async () => {
    const { onCancel } = setup("credited");
    fireEvent.click(screen.getByRole("button", { name: "Annullér aftale" }));
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith("order-id"));
    expect(invoke).not.toHaveBeenCalled();
  });
  it("cancels normally when there is no accounting invoice", async () => {
    invoke.mockResolvedValue({ data: { caps: { can_credit: false, exists_in_provider: false } } });
    const { onCancel } = setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Annullér aftale" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Annullér aftale" }));
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith("order-id"));
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});