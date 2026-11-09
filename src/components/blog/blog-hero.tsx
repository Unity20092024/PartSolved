import Image from "next/image";
export function BlogHero() {
  return (
    <div className="blog-hero-wrap">
      <section className="blog-hero" aria-labelledby="blog-title">
        <Image
          src="/images/blog/hardware-hero-fallback.webp"
          alt="Residential door handles and a mortise lock beside a wooden door frame"
          fill
          sizes="(max-width: 1440px) 100vw, 1440px"
          priority
          className="blog-hero-image"
        />
        <div className="blog-hero-shade" aria-hidden="true" />
        <div className="blog-hero-copy">
          <span className="blog-hero-accent" aria-hidden="true" />
          <h1 id="blog-title">BLOG</h1>
          <p>Hardware advice, made practical.</p>
        </div>
      </section>
    </div>
  );
}
