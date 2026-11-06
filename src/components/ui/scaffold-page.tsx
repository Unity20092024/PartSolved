import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
export function ScaffoldPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main id="main-content" className="scaffold-page">
      <Link href="/" className="back-link">
        <ArrowLeft size={18} aria-hidden="true" />
        Back to home
      </Link>
      <span className="eyebrow">PartSolved · First release</span>
      <h1>{title}</h1>
      <p className="scaffold-description">{description}</p>
      {children}
    </main>
  );
}
