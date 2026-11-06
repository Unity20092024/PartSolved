"use client";

import { useEffect, useState } from "react";
export function PhotoPreview({ photo }: { photo: File }) {
  const [source, setSource] = useState<{ file: File; url: string } | null>(
    null,
  );
  useEffect(() => {
    const url = URL.createObjectURL(photo);
    // Object URLs require client-side allocation and cleanup when the file changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSource({ file: photo, url });
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  return (
    <figure className="photo-preview">
      {source?.file === photo && (
        // Local blob previews cannot use the server-side Next image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source.url}
          alt="Your selected part photo"
          width={480}
          height={320}
        />
      )}
      <figcaption>{photo.name}</figcaption>
    </figure>
  );
}
