import Image from "next/image";
import { cache } from "react";
import { publicBlogClient, requireBlogAdmin } from "@/lib/blog/server";
import { mediaUrl } from "@/lib/blog/content";
const dimensions = cache(async (id: string, preview: boolean) => {
  const client = preview
    ? (await requireBlogAdmin()).client
    : publicBlogClient();
  if (!client) return null;
  const { data } = await client
    .from("blog_media")
    .select("width,height")
    .eq("id", id)
    .eq("state", "ready")
    .maybeSingle();
  return data;
});
export async function BlogImage({
  id,
  alt,
  className,
  preview = false,
}: {
  id: string;
  alt: string;
  className?: string;
  preview?: boolean;
}) {
  const size = await dimensions(id, preview);
  if (!size) return null;
  return (
    <Image
      src={mediaUrl(id)}
      alt={alt}
      width={size.width}
      height={size.height}
      unoptimized
      sizes="(max-width: 800px) 100vw, 800px"
      className={className}
    />
  );
}
