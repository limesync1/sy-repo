import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useConversationMessages } from "./useConversationMessages";

const mock = vi.hoisted(() => ({ loads: [] as Array<(value: any) => void>, listeners: [] as Array<(payload: any) => void> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({
    select: () => ({ eq: () => ({ order: () => new Promise(resolve => mock.loads.push(resolve)) }) }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }),
  channel: () => { const channel = { on: (_: any, __: any, callback: any) => { mock.listeners.push(callback); return channel; }, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
} }));
const message = (id: string, conversation_id: string) => ({ id, conversation_id, sender_type: "visitor", sender_name: "Kunde", content: id, created_at: "2026-10-26T12:00:00Z" });
afterEach(() => { cleanup(); mock.loads.length = 0; mock.listeners.length = 0; });
describe("conversation message isolation", () => {
  it("never shows previous messages when switching and ignores late loads/events", async () => {
    const incoming = vi.fn();
    const { result, rerender } = renderHook(({ id }) => useConversationMessages(id, incoming), { initialProps: { id: "a" } });
    await act(async () => mock.loads[0]({ data: [message("old", "a")] }));
    expect(result.current.messages.map(m => m.id)).toEqual(["old"]);
    rerender({ id: "b" });
    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(true);
    act(() => mock.listeners[0]({ new: message("late", "a") }));
    await act(async () => mock.loads[1]({ data: [message("new", "b")] }));
    expect(result.current.messages.map(m => m.id)).toEqual(["new"]);
    expect(incoming).not.toHaveBeenCalled();
  });
  it("retains messages arriving during a pending history load without duplicates", async () => {
    const incoming = vi.fn();
    const { result } = renderHook(() => useConversationMessages("a", incoming));
    act(() => mock.listeners[0]({ new: message("live", "a") }));
    await act(async () => mock.loads[0]({ data: [message("history", "a"), message("live", "a")] }));
    expect(result.current.messages.map(m => m.id)).toEqual(["history", "live"]);
    expect(result.current.loading).toBe(false);
  });
  it("supports retry after a failed fetch and hides messages when deselected", async () => {
    const incoming = vi.fn();
    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useConversationMessages(id, incoming), { initialProps: { id: "a" as string | null } });
    await act(async () => mock.loads[0]({ error: { message: "offline" } }));
    expect(result.current.error).toBe(true);
    act(() => result.current.retry());
    await waitFor(() => expect(mock.loads).toHaveLength(2));
    await act(async () => mock.loads[1]({ data: [message("recovered", "a")] }));
    expect(result.current.error).toBe(false);
    expect(result.current.messages).toHaveLength(1);
    rerender({ id: null });
    expect(result.current.messages).toEqual([]);
  });
});