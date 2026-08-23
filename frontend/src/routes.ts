export const ROUTES = {
  home: "/",
  about: "/about",
  api: "/api",
  benchmarks: "/benchmarks",
  modelCard: "/model-card",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
