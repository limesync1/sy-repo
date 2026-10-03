import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { seatQuantity, employeePriceKey } from '../../../supabase/functions/create-checkout-session/seat-pricing';

function loadHandler(name: string, client: any) {
  const source = fs.readFileSync(`supabase/functions/${name}/index.ts`, 'utf8')
    .replace(/^import .*;\r?\n/gm, '');
  let handler: (req: Request) => Promise<Response>;
  const context = vm.createContext({
    Deno: { env: { get: () => 'test' }, serve: (fn: any) => { handler = fn; } },
    createClient: () => client, Response, Request, console: { error() {}, log() {} },
    sendTemplateEmail: async () => {}, URL, fetch: () => { throw new Error('Unexpected outbound call'); },
  });
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, context);
  return (body: any) => handler!(new Request('https://example.test', {
    method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
}
function mockClient(rows: Record<string, any>) {
  const writes: string[] = [];
  const filters: Record<string, any[]> = {};
  return {
    writes, filters,
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
    rpc: async () => ({ data: true }),
    from(table: string) {
      const query: any = {
        select: () => query,
        eq: (col: string, val: any) => { (filters[table] ??= []).push([col, val]); return query; },
        contains: () => query, order: () => query, limit: () => query, in: () => query,
        maybeSingle: async () => rows[table] ?? { data: null },
        update: () => { writes.push(table); return query; },
        delete: () => { writes.push(table); return query; },
        insert: () => { writes.push(table); return query; },
        then: (resolve: any, reject: any) => Promise.resolve(rows[table] ?? { data: null }).then(resolve, reject),
      };
      return query;
    },
  };
}
describe('selected security findings', () => {
  it.each([undefined, null, '1', -1, 1.5, NaN, Infinity, 51])('rejects malformed seat quantity %s', value => {
    expect(() => seatQuantity(value, 0, 0, 0)).toThrow();
  });
  it('never charges fewer than the server allocation or active logins', () => {
    expect(seatQuantity(0, 4, 2, 7)).toBe(6);
    expect(seatQuantity(0, 4, 8, 2)).toBe(8);
    expect(seatQuantity(9, 4, 0, 2)).toBe(9);
    expect(seatQuantity(0, 0, 0, 1)).toBe(0);
  });
  it('derives the employee price from the billing period', () => {
    expect(employeePriceKey('base_yearly')).toBe('employee_yearly');
    expect(() => employeePriceKey('employee_monthly')).toThrow();
  });
  it('rejects telemetry for a message outside the token-authorized conversation before writes', async () => {
    const client = mockClient({ chat_conversations: { data: { id: 'conversation' } }, chat_messages: { data: null } });
    const response = await loadHandler('livechat-ai-reply', client)({ token: 'a'.repeat(32), action: 'telemetry', messageId: '11111111-1111-4111-8111-111111111111' });
    expect(response.status).toBe(404);
    expect(client.writes).toEqual([]);
    expect(client.filters.chat_messages).toContainEqual(['conversation_id', 'conversation']);
  });
  it('scopes allowed telemetry updates to the same conversation', async () => {
    const client = mockClient({ chat_conversations: { data: { id: 'conversation' } }, chat_messages: { data: { id: 'message' } } });
    const response = await loadHandler('livechat-ai-reply', client)({ token: 'a'.repeat(32), action: 'telemetry', messageId: '11111111-1111-4111-8111-111111111111' });
    expect(response.status).toBe(200);
    expect(client.filters.ai_answer_events).toContainEqual(['conversation_id', 'conversation']);
  });
  it.each(['foreign-stop', 'foreign-employee'])('rejects %s in editable route suggestions before writes', async target => {
    const client = mockClient({
      routes: { data: { business_id: 'business', optimization_suggestions: [{ id: 'suggestion', action: { type: 'swap_assignee', stop_id: '11111111-1111-4111-8111-111111111111', to_employee_id: '22222222-2222-4222-8222-222222222222' } }] } },
      route_stops: { data: target === 'foreign-stop' ? null : { id: 'stop' } },
      employees: { data: target === 'foreign-employee' ? [] : [{ id: 'employee' }] },
    });
    const response = await loadHandler('apply-route-suggestion', client)({ route_id: 'route', suggestion_id: 'suggestion' });
    expect(response.status).toBe(403);
    expect(client.writes).toEqual([]);
    expect(client.filters.route_stops).toContainEqual(['route_id', 'route']);
    expect(client.filters.employees).toContainEqual(['business_id', 'business']);
  });
  it('does not expose database errors from order approval', async () => {
    const client = mockClient({
      orders: { data: { id: 'order', order_group_id: null, status: 'pending', customer_approval_token: 'token' }, error: { message: 'secret database schema', code: '23514' } },
    });
    const response = await loadHandler('customer-approve-order', client)({ token: 'token', decision: 'accepted' });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('secret database schema');
  });
});
