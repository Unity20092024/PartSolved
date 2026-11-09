import "server-only";
import { redirect } from "next/navigation";
import { BlogError, blogConfig, requireBlogAdmin } from "./server";
export async function adminPage() {
  if (!blogConfig()) return null;
  try {
    return await requireBlogAdmin();
  } catch (error) {
    if (error instanceof BlogError && [401, 403].includes(error.status))
      redirect("/admin/blog/login?error=access");
    throw error;
  }
}
