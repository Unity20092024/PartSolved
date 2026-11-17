import type { Metadata } from "next";
import { isPreviewDeployment } from "@/config/site";
import "../../blog/blog.css";
import "../../blog/editorial.css";
import "./admin.css";
export const metadata: Metadata = {
  title: "Blog administration",
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="blog-shell blog-admin">
      {isPreviewDeployment() && (
        <p className="blog-notice">Preview dashboard. This page is not the live website. Publishing updates the connected article database; check www.partsolved.com separately before sharing a link.</p>
      )}
      {children}
    </main>
  );
}
