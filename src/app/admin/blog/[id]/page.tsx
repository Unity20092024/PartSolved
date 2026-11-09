import { notFound } from "next/navigation";
import { adminPage } from "@/lib/blog/admin-page";
import {
  adminArticle,
  adminCollections,
  writesEnabled,
  schedulerReady,
} from "@/lib/blog/server";
import { uuid } from "@/lib/blog/content";
import { SetupNotice } from "@/components/admin/blog/setup-notice";
import { ArticleEditor } from "@/components/admin/blog/article-editor";
export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await adminPage())) return <SetupNotice />;
  const { id } = await params;
  if (!uuid(id)) notFound();
  const [article, collections] = await Promise.all([
    adminArticle(id),
    adminCollections(),
  ]);
  if (!article) notFound();
  return (
    <ArticleEditor
      key={article.id}
      article={article}
      {...collections}
      enabled={writesEnabled()}
      scheduling={schedulerReady()}
    />
  );
}
