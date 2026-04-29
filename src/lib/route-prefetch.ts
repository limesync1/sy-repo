// Lille hjælpe-modul til at "varme" lazy-loaded route-chunks op før
// brugeren klikker. Bruges fra App.tsx (idle-prefetch af de mest besøgte
// sider) og fra <SmartLink /> (prefetch on hover/focus/touchstart).
//
// Idéen: vi registrerer chunk-loaderne under samme nøgle som ruten (fx
// "/virksomheder"), og kalder dem så snart browseren har et roligt øjeblik —
// eller så snart brugerens cursor lander på et link der peger derhen. Når
// brugeren faktisk navigerer, er JS-bundlet allerede i hukommelsen og
// React.lazy returnerer instant uden suspense-fallback.
const registry = new Map<string, () => Promise<unknown>>();
const triggered = new Set<string>();

export const registerLazyRoute = (key: string, loader: () => Promise<unknown>) => {
  registry.set(key, loader);
};

export const prefetchLazyRoute = (key: string) => {
  if (triggered.has(key)) return;
  const loader = registry.get(key);
  if (!loader) return;
  triggered.add(key);
  // Fire-and-forget — fejl ignoreres bevidst (chunken hentes igen ved nav).
  loader().catch(() => triggered.delete(key));
};

/** Hjælper til at finde rute-key fra et to=-prop (matcher fx "/virksomheder?x=1"). */
export const routeKeyFromHref = (href: string): string | null => {
  if (!href) return null;
  const path = href.split("?")[0].split("#")[0];
  if (registry.has(path)) return path;
  return null;
};
