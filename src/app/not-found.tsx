import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="scaffold-page">
      <span className="eyebrow">404</span>
      <h1>We couldn’t find that page</h1>
      <p>Return home to explore hardware categories or select a part photo.</p>
      <Link href="/" className="button button-primary">
        Back to home
      </Link>
    </main>
  );
}
