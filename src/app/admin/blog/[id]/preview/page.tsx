import Link from "next/link";
import { notFound } from "next/navigation";
import { adminPage } from "@/lib/blog/admin-page";
import { adminArticle } from "@/lib/blog/server";
import { uuid } from "@/lib/blog/content";
import { ArticleView } from "@/components/blog/article-view";
import { SetupNotice } from "@/components/admin/blog/setup-notice";
export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await adminPage())) return <SetupNotice />;
  const { id } = await params;
  if (!uuid(id)) notFound();
  const article = await adminArticle(id);
  if (!article) notFound();
  return (
    <>
      <Link className="button button-secondary" href={`/admin/blog/${id}`}>
        ← Back to editor
      </Link>
      <ArticleView
        document={article.document}
        updatedAt={article.updated_at}
        preview
      />
    </>
  );
}
