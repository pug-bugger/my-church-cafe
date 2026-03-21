/**
 * Turn API-stored paths (/uploads/...) into a browser-loadable URL using NEXT_PUBLIC_API_URL.
 * Local public assets (/drinks/..., /cup.svg) are returned unchanged.
 */
export function resolveMediaUrl(
  pathOrUrl: string | null | undefined
): string {
  if (!pathOrUrl) return "/cup.svg";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith("/uploads/")) {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
    return base ? `${base}${pathOrUrl}` : pathOrUrl;
  }
  return pathOrUrl;
}
