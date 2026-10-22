/// <reference types="vite/client" />
/// <reference types="vite-imagetools/client" />

declare module "*&format=webp&quality=88" {
  const url: string;
  export default url;
}

declare module "*.mjs" {
  export const buildPlannerGuide: (options?: { silent?: boolean }) => unknown;
}
