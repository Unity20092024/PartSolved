"use client";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { isInvitationLanding } from "@/lib/blog/invitation";

/** Default invitations can return to Site URL '/'. Route them before analytics. */
const subscribe = () => () => {};
export function SiteAnalytics() {
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  useEffect(() => {
    if (pathname === "/" && isInvitationLanding(window.location.hash)) {
      window.location.replace(`/admin/blog/activate${window.location.hash}`);
      return;
    }
  }, [pathname]);
  if (!hydrated || pathname.startsWith("/admin/") || isInvitationLanding(window.location.hash)) return null;
  return <Analytics beforeSend={(event) => {
    const url = new URL(event.url);
    return url.pathname.startsWith("/admin/") || isInvitationLanding(url.hash) ? null : event;
  }} />;
}
