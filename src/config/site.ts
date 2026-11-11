// Canonical identity, independent of preview hosts and request headers.
export const SITE_ORIGIN = "https://www.partsolved.com";
export function siteUrl(path = "/") {
  return new URL(path, SITE_ORIGIN).toString();
}
export const isPreviewDeployment = () => process.env.VERCEL_ENV === "preview";
