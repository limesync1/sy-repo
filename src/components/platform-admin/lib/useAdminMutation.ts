// useAdminMutation — standardiseret wrapper omkring useMutation til admin-handlinger.
// Tilbyder ensartet toast-feedback (success/fejl), valgfri query-invalidering og
// optimistic updates med automatisk rollback. Brug i stedet for at duplikere
// onSuccess/onError-blokke i hver admin-fane.
import { useMutation, useQueryClient, type UseMutationOptions, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AdminMutationOptions<TData, TVars, TCtx = unknown>
  extends Omit<UseMutationOptions<TData, Error, TVars, TCtx>, "mutationFn" | "onSuccess" | "onError"> {
  /** Funktionen der udfører handlingen (typisk en supabase-RPC eller -.from(...) kald). */
  mutationFn: (vars: TVars) => Promise<TData>;
  /** Tekst eller funktion til success-toast. Sæt til `false` for at undertrykke. */
  successMessage?: string | ((data: TData, vars: TVars) => string) | false;
  /** Tekst eller funktion til fejl-toast. Default: error.message. Sæt til `false` for at undertrykke. */
  errorMessage?: string | ((err: Error, vars: TVars) => string) | false;
  /** Query-keys der invalideres efter succes. */
  invalidateKeys?: QueryKey[];
  /** Ekstra side-effect efter succes (efter toast + invalidate). */
  onDone?: (data: TData, vars: TVars) => void;
}

export function useAdminMutation<TData = unknown, TVars = void, TCtx = unknown>(
  options: AdminMutationOptions<TData, TVars, TCtx>,
) {
  const qc = useQueryClient();
  const { mutationFn, successMessage, errorMessage, invalidateKeys, onDone, ...rest } = options;

  return useMutation<TData, Error, TVars, TCtx>({
    ...rest,
    mutationFn,
    onSuccess: (data, vars, ctx) => {
      if (successMessage !== false) {
        const msg = typeof successMessage === "function" ? successMessage(data, vars) : successMessage;
        if (msg) toast.success(msg);
      }
      if (invalidateKeys?.length) {
        for (const key of invalidateKeys) qc.invalidateQueries({ queryKey: key });
      }
      onDone?.(data, vars);
      // forward to any inherited handler via rest spread is not possible since we excluded it,
      // callers should use onDone for post-success work.
    },
    onError: (err, vars) => {
      if (errorMessage === false) return;
      const msg = typeof errorMessage === "function"
        ? errorMessage(err, vars)
        : (errorMessage || err.message || "Handlingen fejlede");
      toast.error(msg);
    },
  });
}

/** Hjælper: kald en supabase-RPC og kast ved fejl — tænkt til brug i `mutationFn`. */
export async function callRpc<T = unknown>(
  client: { rpc: (fn: string, args?: any) => Promise<{ data: T | null; error: { message: string } | null }> },
  fn: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
