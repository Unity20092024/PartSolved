import type { VideoSource } from "@/types/video";

export function resolveVideoSource(
  source: VideoSource,
): { playback: string; fallback: string } | null {
  if (source.type === "youtube") {
    if (!/^[A-Za-z0-9_-]{11}$/.test(source.videoId)) return null;
    return {
      playback: `https://www.youtube-nocookie.com/embed/${source.videoId}?playsinline=1&rel=0`,
      fallback: `https://www.youtube.com/watch?v=${source.videoId}`,
    };
  }
  // MP4 sources are same-origin files, never a YouTube media proxy or remote store.
  if (
    !source.src.startsWith("/") ||
    source.src.startsWith("//") ||
    /[\\\s]/.test(source.src)
  )
    return null;
  try {
    const url = new URL(source.src, "https://partsolved.invalid");
    if (
      url.origin !== "https://partsolved.invalid" ||
      !url.pathname.toLowerCase().endsWith(".mp4")
    )
      return null;
    return { playback: source.src, fallback: source.src };
  } catch {
    return null;
  }
}
