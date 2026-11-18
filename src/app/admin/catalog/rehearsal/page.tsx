import { notFound, redirect } from "next/navigation";
import { isPreviewDeployment } from "@/config/site";
import { catalogAdmin } from "@/lib/catalog/server";
import { CatalogError } from "@/lib/catalog/model";
import { catalogRehearsalData } from "@/lib/catalog/rehearsal-data";
import { CatalogRehearsal } from "@/components/admin/catalog/catalog-rehearsal";
export default async function Rehearsal() {
  if (!isPreviewDeployment()) notFound();
  try {
    await catalogAdmin();
  } catch (error) {
    if (error instanceof CatalogError && [401, 403].includes(error.status))
      redirect("/admin/blog/login?error=access");
    throw error;
  }
  return <CatalogRehearsal data={catalogRehearsalData()} />;
}
