/** Default placeholder for menu products (drinks, desserts, meals). */
export const DEFAULT_PRODUCT_IMAGE = "/small-cup-icon.svg";

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

/** Like resolveMediaUrl but uses the small cup icon when a product has no image. */
export function resolveProductImageUrl(
  pathOrUrl: string | null | undefined
): string {
  if (!pathOrUrl) return DEFAULT_PRODUCT_IMAGE;
  return resolveMediaUrl(pathOrUrl);
}

export function isDefaultProductImageUrl(url: string): boolean {
  return (
    url === DEFAULT_PRODUCT_IMAGE || url.endsWith("/small-cup-icon.svg")
  );
}
