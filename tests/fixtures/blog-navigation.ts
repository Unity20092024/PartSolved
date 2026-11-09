// Browser harness only; never imported by the application build.
export function useRouter() {
  return {
    push: (url: string) => {
      window.dispatchEvent(
        new CustomEvent("blog-test-navigation", { detail: url }),
      );
    },
    refresh: () => undefined,
    prefetch: () => Promise.resolve(),
  };
}
export function usePathname() {
  return "/admin/blog";
}
export function useSearchParams() {
  return new URLSearchParams();
}
