const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const importEncryptionKey = async (secret: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
};

export const encryptMetaToken = async (token: string, secret: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importEncryptionKey(secret);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(token));
  return { ciphertext: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
};

export const decryptMetaToken = async (ciphertext: string, iv: string, secret: string) => {
  const key = await importEncryptionKey(secret);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );
  return decoder.decode(decrypted);
};

export const signMetaState = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToBase64(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

export const createMetaState = async (businessId: string, userId: string, secret: string) => {
  const payload = bytesToBase64(encoder.encode(JSON.stringify({
    businessId,
    userId,
    expiresAt: Date.now() + 10 * 60_000,
  }))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `${payload}.${await signMetaState(payload, secret)}`;
};

export const verifyMetaState = async (state: string, secret: string) => {
  const [payload, signature] = state.split(".");
  if (!payload || !signature || signature !== await signMetaState(payload, secret)) return null;
  const base64 = payload.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
  const parsed = JSON.parse(decoder.decode(base64ToBytes(base64)));
  if (!parsed?.businessId || !parsed?.userId || Number(parsed.expiresAt) < Date.now()) return null;
  return parsed as { businessId: string; userId: string; expiresAt: number };
};