import "./catalog.css";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="catalog-shell">
      {children}
    </main>
  );
}
