/// <reference types="vite/client" />

declare module "*.mjs" {
  export const buildPlannerGuide: (options?: { silent?: boolean }) => unknown;
}
