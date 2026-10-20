import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CustomerDialogHost, { openCustomerDialog } from "./CustomerDialogHost";
import CreateOrderDialogHost, { openCreateOrderDialog } from "@/components/route-planner/CreateOrderDialogHost";

vi.mock("./CustomerEditDialog", () => ({ default: ({ open, initial, onOpenChange }: any) => (
  <div data-testid="customer" data-open={open}>{initial?.email ?? "empty"}
    <button onClick={() => onOpenChange(false)}>Close customer</button>
  </div>
) }));
vi.mock("@/components/route-planner/CreateManualOrderDialog", () => ({ default: ({ open, initialCustomer, onOpenChange }: any) => (
  <div data-testid="order" data-open={open}>{initialCustomer?.customer_email ?? "empty"}
    <button onClick={() => onOpenChange(false)}>Close order</button>
  </div>
) }));

describe("isolated panel dialog state", () => {
  it("opens and closes customer state without rerendering its parent", async () => {
    const parentRender = vi.fn();
    function Parent() {
      parentRender();
      return <CustomerDialogHost channel="test-customers" businessId="business" businessName="Test" />;
    }
    const view = render(<Parent />);
    const renders = parentRender.mock.calls.length;
    expect(screen.queryByTestId("customer")).toBeNull();
    act(() => openCustomerDialog("test-customers", { type: "private", email: "first@example.test" }));
    expect(await screen.findByTestId("customer")).toHaveTextContent("first@example.test");
    fireEvent.click(screen.getByText("Close customer"));
    expect(screen.getByTestId("customer")).toHaveAttribute("data-open", "false");
    expect(screen.getByTestId("customer")).toHaveTextContent("first@example.test");
    await waitFor(() => expect(screen.queryByTestId("customer")).toBeNull());
    act(() => openCustomerDialog("test-customers"));
    expect(await screen.findByTestId("customer")).toHaveTextContent("empty");
    expect(parentRender).toHaveBeenCalledTimes(renders);
    view.unmount();
  });

  it("keeps order channels separate and clears customer prefill on a fresh order", async () => {
    const view = render(<>
      <CreateOrderDialogHost channel="orders-a" businessId="business" businessName="Test" />
      <CreateOrderDialogHost channel="orders-b" businessId="business" businessName="Test" />
    </>);
    act(() => openCreateOrderDialog("orders-a", { customer_email: "customer@example.test" }));
    expect(await screen.findByTestId("order")).toHaveTextContent("customer@example.test");
    expect(screen.getAllByTestId("order")).toHaveLength(1);
    fireEvent.click(screen.getByText("Close order"));
    await waitFor(() => expect(screen.queryByTestId("order")).toBeNull());
    act(() => openCreateOrderDialog("orders-b"));
    expect(await screen.findByTestId("order")).toHaveTextContent("empty");
    view.unmount();
    act(() => openCreateOrderDialog("orders-a"));
    expect(screen.queryByTestId("order")).toBeNull();
  });
});