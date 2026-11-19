import type { Metadata } from "next";
import "../../catalog/catalog.css";
export const metadata: Metadata = {
  title: "Private catalog administration",
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="catalog-shell catalog-admin">
      {children}
    </main>
  );
}
