import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Wrench } from "lucide-react";
import { PhotographySlot } from "@/components/ui/photography-slot";
import { photography } from "@/config/photography";
export function GuidedFinderBanner() {
  return (
    <section className="guided-banner" aria-label="Help identifying your part">
      <div className="guided-finder">
        <Wrench
          className="banner-icon wrench"
          size={51}
          strokeWidth={2.6}
          aria-hidden="true"
        />
        <div>
          <h2>Not Sure What It Is?</h2>
          <p>
            Answer a few quick questions and we’ll
            <br className="desktop-break" /> help you narrow it down.
          </p>
        </div>
        <Link href="/find-part/guided" className="button button-primary">
          Start Guided Finder
          <ArrowRight size={23} aria-hidden="true" />
        </Link>
      </div>
      <Link
        href="/guides"
        className="guide-link"
        aria-label="How to Identify Your Part"
      >
        <BookOpen
          className="banner-icon"
          size={43}
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <div>
          <h2>
            How to Identify
            <br />
            Your Part
          </h2>
          <p>
            Simple guides, photos,
            <br />
            and measurement tips.
          </p>
        </div>
        <div className="guide-thumbnail">
          {photography.measurement ? (
            <Image
              src={photography.measurement.src}
              alt={photography.measurement.alt}
              fill
              sizes="180px"
            />
          ) : (
            <PhotographySlot description="Measuring a window" />
          )}
          <span className="play-icon" aria-hidden="true">
            <BookOpen size={18} />
          </span>
        </div>
      </Link>
    </section>
  );
}
