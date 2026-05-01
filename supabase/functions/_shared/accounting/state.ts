import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DEFAULT_ACCOUNTING_SETTINGS: Record<string, unknown> = {
  push_pending: true,
  default_payment_terms_days: 14,
  default_vat_rate: 25,
  auto_create_products: true,
  send_order_as: "order",
};

export function cleanAccountingSettings(
  base: Record<string, unknown> | null | undefined,
  extra: Record<string, unknown> = {},
) {
  const next = { ...DEFAULT_ACCOUNTING_SETTINGS, ...(base ?? {}), ...extra };
  delete next.oauth_state;
  delete next.oauth_state_at;
  delete next.oauth_return_to;
  if (!("oauth_refresh_token" in extra)) delete next.oauth_refresh_token;
  return next;
}

export async function clearAccountingRuntimeState(
  admin: SupabaseClient,
  businessId: string,
  note = "Nulstillet ved skift/frakobling af regnskabsprogram",
) {
  await Promise.all([
    admin.from("accounting_sync_queue").delete().eq("business_id", businessId),
    admin.from("accounting_sync_log").delete().eq("business_id", businessId),
    admin.from("accounting_sync_dlq").update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_note: note,
    }).eq("business_id", businessId).eq("resolved", false),
    admin.from("accounting_integrations").update({
      last_error: null,
      last_error_at: null,
      consecutive_failures: 0,
      paused_until: null,
      last_kick_at: null,
    }).eq("business_id", businessId),
  ]);
}

export async function prepareAccountingProviderSwitch(
  admin: SupabaseClient,
  businessId: string,
  provider: string,
) {
  await clearAccountingRuntimeState(admin, businessId);
  const { data: existing } = await admin
    .from("accounting_integrations")
    .select("id, settings")
    .eq("business_id", businessId)
    .maybeSingle();

  const settings = cleanAccountingSettings(existing?.settings as Record<string, unknown> | null);
  if (existing) {
    await admin.from("accounting_integrations").update({
      provider,
      is_active: false,
      api_token: null,
      api_secret: null,
      agreement_number: null,
      organization_id: null,
      settings,
      last_error: null,
      last_error_at: null,
      consecutive_failures: 0,
      paused_until: null,
      last_kick_at: null,
    }).eq("id", existing.id);
  } else {
    await admin.from("accounting_integrations").insert({
      business_id: businessId,
      provider,
      is_active: false,
      settings,
    });
  }
}