import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { PhotoProvider } from "@/components/part-finder/photo-provider";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "PartSolved™ | The Part Finder",
    template: "%s | PartSolved™",
  },
  description:
    "Start finding the right window and door hardware with a photo, part number, or details. Explore hardware categories and part identification guidance.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <PhotoProvider>
          <SiteHeader />
          {children}
        </PhotoProvider>
      </body>
    </html>
  );
}
