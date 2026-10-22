/// <reference types="vite/client" />
/// <reference types="vite-imagetools/client" />

declare module "*.mjs" {
  export const buildPlannerGuide: (options?: { silent?: boolean }) => unknown;
}
