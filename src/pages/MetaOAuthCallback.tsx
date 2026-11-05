import { useEffect } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

const META_CALLBACK_FUNCTION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth-callback`;

const MetaOAuthCallback = () => {
  const query = window.location.search;
  const hasOAuthResponse = new URLSearchParams(query).has("state");

  useEffect(() => {
    if (!hasOAuthResponse) return;
    window.location.replace(`${META_CALLBACK_FUNCTION}${query}`);
  }, [hasOAuthResponse, query]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-md rounded-md border border-border bg-card p-6 text-center shadow-premium">
        {hasOAuthResponse ? (
          <>
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-accent" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">Forbinder Meta</h1>
            <p className="mt-2 text-sm text-muted-foreground">Vent et øjeblik, mens vi færdiggør forbindelsen.</p>
          </>
        ) : (
          <>
            <AlertCircle className="mx-auto h-7 w-7 text-warning" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">Forbindelsen kunne ikke fortsætte</h1>
            <p className="mt-2 text-sm text-muted-foreground">Gå tilbage til Forespørgsler og tryk på Forbind Meta igen.</p>
            <a className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href="/virksomhed?tab=leads">
              Tilbage til Forespørgsler
            </a>
          </>
        )}
      </section>
    </main>
  );
};

export default MetaOAuthCallback;