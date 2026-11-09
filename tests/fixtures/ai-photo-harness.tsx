import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  PhotoProvider,
  usePhoto,
} from "@/components/part-finder/photo-provider";
import { PhotoAssist } from "@/components/part-finder/ai/photo-assist";
function Harness() {
  const { draft, setDraft, photo, setPhoto, photoAssist } = usePhoto();
  const [visible, setVisible] = useState(true);
  return (
    <>
      <label>
        Primary photo
        <input
          type="file"
          aria-label="Primary photo"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </label>
      <label>
        Manual markings
        <input
          value={draft.markings}
          onChange={(e) =>
            setDraft((old) => ({ ...old, markings: e.target.value }))
          }
        />
      </label>
      <button onClick={() => setVisible(!visible)}>
        {visible ? "Leave Photo Assist" : "Return to Photo Assist"}
      </button>
      <output data-testid="draft">{JSON.stringify(draft)}</output>
      <output data-testid="primary-photo">
        {photo?.name || "No primary photo"}
      </output>
      <output data-testid="assist-state">
        {JSON.stringify({
          rejected: photoAssist.rejected,
          hasResult: !!photoAssist.result,
        })}
      </output>
      {visible && <PhotoAssist />}
    </>
  );
}
createRoot(document.getElementById("ai-test-root")!).render(
  <PhotoProvider>
    <Harness />
  </PhotoProvider>,
);
