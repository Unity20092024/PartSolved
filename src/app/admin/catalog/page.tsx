import Link from "next/link";
import { redirect } from "next/navigation";
import { blogConfig } from "@/lib/blog/server";
import { isPreviewDeployment } from "@/config/site";
import {
  catalogAdmin,
  catalogEnabled,
  catalogWritesEnabled,
  catalogCollections,
  adminCatalogList,
} from "@/lib/catalog/server";
import { CatalogManager } from "@/components/admin/catalog/catalog-manager";
import { CatalogError } from "@/lib/catalog/model";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  if (!blogConfig())
    return (
      <>
        <h1>Catalog setup required</h1>
        <p>
          Use the existing PartSolved Supabase project and administrator
          account. The catalog migration and connection flags require approval
          before shared writes.
        </p>
      </>
    );
  try {
    await catalogAdmin();
  } catch (error) {
    if (error instanceof CatalogError && [401, 403].includes(error.status))
      redirect("/admin/blog/login?error=access");
    throw error;
  }
  const page = Number((await searchParams).page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000)
    redirect("/admin/catalog");
  return (
    <>
      <nav className="catalog-actions">
        <Link href="/admin/blog">Blog dashboard</Link>
        <Link href="/catalog">Public catalog</Link>
        {isPreviewDeployment() && (
          <Link href="/admin/catalog/rehearsal">
            Open synthetic Preview rehearsal
          </Link>
        )}
      </nav>
      <header className="catalog-heading">
        <p className="catalog-eyebrow">Private publishing tools</p>
        <h1>Catalog administration</h1>
        <p>
          Manage manufacturer products, variants, supplier identities and
          documented specifications.
        </p>
      </header>
      {!catalogEnabled() ? (
        <section className="catalog-notice">
          <h2>Shared catalog connection is awaiting approval</h2>
          <p>
            The candidate database migration has not been applied by this
            feature. Catalog writes are disabled independently of the blog. No
            product counts or successful saves are simulated.
          </p>
          {isPreviewDeployment() && (
            <Link className="catalog-button" href="/admin/catalog/rehearsal">
              Try the protected rehearsal
            </Link>
          )}
        </section>
      ) : (
        <>
          {!catalogWritesEnabled() && (
            <p className="catalog-notice">
              Catalog writes are disabled. Review is available; saves, uploads
              and imports require the approved catalog write flag.
            </p>
          )}
          <CatalogManager
            initial={{
              ...(await adminCatalogList(page)),
              collections: await catalogCollections(true),
            }}
            enabled={catalogWritesEnabled()}
          />
        </>
      )}
    </>
  );
}
