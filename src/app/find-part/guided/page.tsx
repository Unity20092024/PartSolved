export const dynamic = "force-dynamic";
import { canReview } from "@/lib/ai/access";
import { GuidedFinder } from "@/components/part-finder/guided-finder";
export const metadata = { title: "Guided Finder" };
export default async function Page() {
  return <GuidedFinder photoAssistAvailable={await canReview()} />;
}
