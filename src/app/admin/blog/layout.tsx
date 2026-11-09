import type { Metadata } from "next";
import "../../blog/blog.css";
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
      {children}
    </main>
  );
}
