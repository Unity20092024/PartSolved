import { Camera, Search, Package, Headphones } from "lucide-react";
const steps = [
  {
    icon: Camera,
    text: (
      <>
        Snap
        <br />
        or Upload
      </>
    ),
  },
  {
    icon: Search,
    text: (
      <>
        Get Matches
        <br />
        Fast
      </>
    ),
  },
  {
    icon: Package,
    text: (
      <>
        Order Through
        <br />
        Our Partner
      </>
    ),
  },
  {
    icon: Headphones,
    text: (
      <>
        They Handle
        <br />
        Shipping &amp; Support
      </>
    ),
  },
];
export function BenefitSteps() {
  return (
    <ol className="benefit-steps" aria-label="How PartSolved will work">
      {steps.map(({ icon: Icon, text }, index) => (
        <li key={index}>
          <Icon size={35} strokeWidth={1.6} aria-hidden="true" />
          <span>{text}</span>
        </li>
      ))}
    </ol>
  );
}
