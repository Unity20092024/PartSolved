import { HeroSection } from "@/components/home/hero-section";
import { BrowseCategories } from "@/components/home/category-grid";
import { GuidedFinderBanner } from "@/components/home/guided-finder-banner";
import type { Metadata } from "next";
export const metadata: Metadata = { alternates: { canonical: "https://www.partsolved.com/" } };
export default function Home() {
  return (
    <main id="main-content">
      <HeroSection />
      <div className="home-content">
        <BrowseCategories />
        <GuidedFinderBanner />
        <p className="milestone-note">
          PartSolved is taking shape. Photo matching and partner ordering are
          coming in a future release.
        </p>
      </div>
    </main>
  );
}
