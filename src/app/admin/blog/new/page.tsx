import { adminPage } from "@/lib/blog/admin-page";
import { writesEnabled } from "@/lib/blog/server";
import { SetupNotice } from "@/components/admin/blog/setup-notice";
import { CreateButton } from "@/components/admin/blog/create-button";
export default async function NewArticle() {
  if (!(await adminPage())) return <SetupNotice />;
  return (
    <>
      <h1>Create an article</h1>
      <p>Create a private draft, then start writing.</p>
      <CreateButton enabled={writesEnabled()} />
    </>
  );
}
