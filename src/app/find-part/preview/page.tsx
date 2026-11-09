export const dynamic = "force-dynamic";
import { canReview } from "@/lib/ai/access";
import { PreviewPage } from "@/components/part-finder/preview-page";
export const metadata = {
  title: "Review Your Photo",
  robots: { index: false, follow: false },
};
export default async function Page() {
  return <PreviewPage photoAssistAvailable={await canReview()} />;
}
