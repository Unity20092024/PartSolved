import Image from "next/image";
import { photography } from "@/config/photography";
import { PhotographySlot } from "@/components/ui/photography-slot";
import { PhotoUploadCard } from "@/components/part-finder/photo-upload-card";
import { BenefitSteps } from "./benefit-steps";
export function HeroSection() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-background">
        {photography.hero ? (
          <Image
            src={photography.hero.src}
            alt={photography.hero.alt}
            fill
            priority
            sizes="100vw"
            className="hero-photo"
          />
        ) : (
          <PhotographySlot
            description="Residential window & door hardware"
            className="hero-photo-slot"
          />
        )}
      </div>
      <div className="hero-inner">
        <div className="hero-copy">
          <h1 id="hero-title">
            Take a Picture.
            <br />
            Find the <span>RIGHT PART.</span>
          </h1>
          <p className="hero-description">
            Quickly identify window and door parts
            <br className="desktop-break" /> with a photo, part number, or
            details.
          </p>
          <BenefitSteps />
        </div>
        <svg className="hero-arrow" viewBox="0 0 150 100" aria-hidden="true">
          <defs>
            <linearGradient id="arrow-red" x2="0" y2="1">
              <stop stopColor="#fa2328" />
              <stop offset="1" stopColor="#b60009" />
            </linearGradient>
          </defs>
          <path
            d="M8 91C39 40 72 30 111 30L104 13l39 26-39 30 5-20C65 44 33 62 8 91Z"
            fill="url(#arrow-red)"
            stroke="white"
            strokeWidth="3"
          />
        </svg>
        <PhotoUploadCard />
      </div>
    </section>
  );
}
