// Local rendering adapter: dimensions are supplied by the test, never by a public API.
import Image from "next/image";
export function BlogImage({
  id,
  alt,
  className,
}: {
  id: string;
  alt: string;
  className?: string;
}) {
  return (
    <Image
      src={`/blog/media/${id}`}
      width={1500}
      height={1000}
      alt={alt}
      className={className}
      unoptimized
    />
  );
}
