// PaymentTestModeBanner — viser at preview kører i Stripe test mode.
const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <strong>Testtilstand</strong> — i preview behandles betalinger i Stripes testmiljø. Brug kort{" "}
      <code className="font-mono">4242 4242 4242 4242</code>, vilkårlig fremtidig udløbsdato og CVC.
    </div>
  );
}