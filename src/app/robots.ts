import type { MetadataRoute } from "next";
import { siteUrl, isPreviewDeployment } from "@/config/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: isPreviewDeployment() ? undefined : "/",
      disallow: isPreviewDeployment()
        ? "/"
        : [
            "/admin/",
            "/api/",
            "/find-part/preview",
            "/find-part/details",
            "/find-part/review",
            "/find-part/next-steps",
            "/find-part/ai-review",
          ],
    },
    sitemap: isPreviewDeployment() ? undefined : siteUrl("/sitemap.xml"),
  };
}
