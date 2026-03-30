// Central place for building API URLs.
// Defaults to direct microservice calls, but can be switched to the API gateway.
export function buildApiUrl(path: string): string {
  // Default to direct microservice calls so the app still works without the gateway.
  // To use the API gateway, set:
  //   VITE_API_BASE_URL=http://localhost:8080
  //   VITE_API_PREFIX=/api
  const base = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082").replace(/\/$/, "");
  const prefixRaw = import.meta.env.VITE_API_PREFIX ?? "";
  const prefix = prefixRaw === "" ? "" : prefixRaw.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${prefix}${normalizedPath}`;
}

