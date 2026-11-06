import { IntakeReview } from "@/components/part-finder/intake-review";
export const metadata = {
  title: "Identification Next Steps",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <IntakeReview nextSteps />;
}
