// Virksomhedens egen mailkonto (SMTP) til kundemails.
// Adgangskoden er AES-GCM-krypteret med SMTP_ENCRYPTION_KEY og forlader aldrig serveren.
// Serverfunktioner kan ikke bruge port 25 og 587, derfor tillades kun 465 (SSL) og 2525.
import nodemailer from "npm:nodemailer@6.9.16";
import { encryptMetaToken, decryptMetaToken } from "./meta-crypto.ts";

export const SMTP_ALLOWED_PORTS = [465, 2525] as const;

export type SmtpRow = {
  business_id: string; enabled: boolean; host: string; port: number; username: string;
  from_email: string; from_name: string | null; password_ciphertext: string; password_iv: string;
  verified_at: string | null;
};

const key = () => {
  const k = Deno.env.get("SMTP_ENCRYPTION_KEY");
  if (!k) throw new Error("SMTP_ENCRYPTION_KEY mangler");
  return k;
};

export const encryptSmtpPassword = (pw: string) => encryptMetaToken(pw, key());
export const decryptSmtpPassword = (c: string, iv: string) => decryptMetaToken(c, iv, key());

export function createSmtpTransport(cfg: { host: string; port: number; username: string; password: string }) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    requireTLS: cfg.port !== 465,
    auth: { user: cfg.username, pass: cfg.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

/** Oversætter tekniske SMTP-fejl til dansk, forståeligt sprog. */
export function friendlySmtpError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const code = (e as any)?.code ?? "";
  const rc = (e as any)?.responseCode ?? 0;
  if (code === "EAUTH" || rc === 535 || /auth/i.test(msg))
    return "Brugernavn eller adgangskode blev afvist. Bruger I Gmail eller Outlook, skal I bruge en app-adgangskode.";
  if (code === "ENOTFOUND" || /getaddrinfo|dns/i.test(msg)) return "Serveradressen findes ikke. Tjek stavningen.";
  if (code === "ETIMEDOUT" || code === "ECONNECTION" || /timeout|timed out/i.test(msg))
    return "Kunne ikke få forbindelse. Tjek serveradresse og port (465 eller 2525).";
  if (code === "ESOCKET" || /ssl|tls|certificate/i.test(msg)) return "Sikker forbindelse fejlede. Prøv port 465.";
  if (rc === 550 || rc === 553 || /sender|from/i.test(msg))
    return "Mailserveren vil ikke sende fra den afsenderadresse. Brug samme e-mail som I logger ind med.";
  return `Mailserveren svarede: ${msg.slice(0, 180)}`;
}

/** Sender via virksomhedens SMTP. Kaster en dansk fejl ved problemer. */
export async function sendViaBusinessSmtp(row: SmtpRow, mail: { to: string; subject: string; html: string; text: string; fallbackName: string }) {
  const password = await decryptSmtpPassword(row.password_ciphertext, row.password_iv);
  const transport = createSmtpTransport({ host: row.host, port: row.port, username: row.username, password });
  try {
    await transport.sendMail({
      from: { name: row.from_name || mail.fallbackName, address: row.from_email },
      to: mail.to, subject: mail.subject, html: mail.html, text: mail.text,
    });
  } catch (e) {
    throw new Error(friendlySmtpError(e));
  } finally {
    transport.close();
  }
}
