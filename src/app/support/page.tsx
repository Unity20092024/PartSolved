import { ScaffoldPage } from "@/components/ui/scaffold-page";
export const metadata = { title: "Support" };
export default function SupportPage() {
  return (
    <ScaffoldPage
      title="Support"
      description="PartSolved is in its first release. Our support resources are being prepared."
    >
      <div className="scaffold-card">
        <h2>Shopping and order support</h2>
        <p>
          Future orders will be placed through our supplier partner, who will
          handle shipping and order support. Partner ordering is not connected
          yet, and no purchases can be made here.
        </p>
        <h2>Your photo stays private</h2>
        <p>
          Selected photos stay temporarily in your browser tab. They are not
          uploaded, and refreshing clears them.
        </p>
      </div>
    </ScaffoldPage>
  );
}
