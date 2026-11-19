// Intercepted local test document only; never an application route.
import { createRoot } from "react-dom/client";
import { SiteHeader } from "@/components/layout/site-header";
import { CatalogRehearsal } from "@/components/admin/catalog/catalog-rehearsal";
import { catalogRehearsalData } from "@/lib/catalog/rehearsal-data";
createRoot(document.getElementById("catalog-test-root")!).render(
  <>
    <SiteHeader />
    <main className="catalog-shell catalog-admin">
      <CatalogRehearsal data={catalogRehearsalData()} />
    </main>
  </>,
);
