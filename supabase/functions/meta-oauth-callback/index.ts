import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { encryptMetaToken, verifyMetaState } from "../_shared/meta-crypto.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error_description");
  const appUrl = "https://serviceydere.dk/virksomhed?tab=leads";
  if (error || !code || !state) return Response.redirect(`${appUrl}&meta=cancelled`, 302);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appId = Deno.env.get("META_APP_ID");
  const appSecret = Deno.env.get("META_APP_SECRET");
  const stateSecret = Deno.env.get("META_OAUTH_STATE_SECRET");
  const encryptionSecret = Deno.env.get("META_TOKEN_ENCRYPTION_KEY");
  if (!url || !serviceKey || !appId || !appSecret || !stateSecret || !encryptionSecret) {
    return Response.redirect(`${appUrl}&meta=configuration-error`, 302);
  }

  const verified = await verifyMetaState(state, stateSecret);
  if (!verified) return Response.redirect(`${appUrl}&meta=invalid-state`, 302);
  const redirectUri = `${url}/functions/v1/meta-oauth-callback`;
  const tokenUrl = new URL("https://graph.facebook.com/v23.0/oauth/access_token");
  tokenUrl.search = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }).toString();
  const tokenResponse = await fetch(tokenUrl);
  if (!tokenResponse.ok) return Response.redirect(`${appUrl}&meta=token-error`, 302);
  const tokenData = await tokenResponse.json();
  const shortToken = String(tokenData.access_token || "");
  if (!shortToken) return Response.redirect(`${appUrl}&meta=token-error`, 302);

  const longUrl = new URL("https://graph.facebook.com/v23.0/oauth/access_token");
  longUrl.search = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  }).toString();
  const longResponse = await fetch(longUrl);
  const longData = longResponse.ok ? await longResponse.json() : tokenData;
  const accessToken = String(longData.access_token || shortToken);
  const encrypted = await encryptMetaToken(accessToken, encryptionSecret);
  const admin = createClient(url, serviceKey);
  const { error: saveError } = await admin.from("meta_connections").upsert({
    business_id: verified.businessId,
    status: "pending",
    access_token_ciphertext: encrypted.ciphertext,
    access_token_iv: encrypted.iv,
    token_expires_at: longData.expires_in ? new Date(Date.now() + Number(longData.expires_in) * 1000).toISOString() : null,
    last_error: null,
  }, { onConflict: "business_id" });
  return Response.redirect(`${appUrl}&meta=${saveError ? "save-error" : "select-page"}`, 302);
});