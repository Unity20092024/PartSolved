"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
export const navigation = [
  { href: "/windows", label: "Windows" },
  { href: "/doors", label: "Doors" },
  { href: "/guides", label: "Guides" },
  { href: "/support", label: "Support" },
];

export function MobileNavigation({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav className="mobile-navigation" aria-label="Mobile navigation">
      <Link
        href="/#photo-upload"
        className="button button-primary"
        onClick={onNavigate}
      >
        <Camera size={20} aria-hidden="true" />
        Find a Part
      </Link>
      {navigation.map(({ href, label }) => (
        <Link key={href} href={href} onClick={onNavigate}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
