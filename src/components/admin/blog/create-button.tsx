"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { blogRequest } from "./client-api";
export function CreateButton({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <div>
      <button
        className="button button-primary"
        disabled={!enabled || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const data = await blogRequest<{ id: string }>("/api/blog/posts");
            router.push(`/admin/blog/${data.id}`);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Draft could not be created.",
            );
            setBusy(false);
          }
        }}
      >
        New Article
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
