"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { HybridVideoPlayerProps } from "@/types/video";
import { resolveVideoSource } from "@/lib/video-source";
import "./video-guides.css";

export function HybridVideoPlayer(props: HybridVideoPlayerProps) {
  // A different source gets a fresh player; React removes the old iframe/video.
  const key =
    props.source.type === "youtube"
      ? `youtube:${props.source.videoId}`
      : `mp4:${props.source.src}`;
  return <VideoPlayer key={key} {...props} />;
}
function VideoPlayer({ title, source, thumbnail }: HybridVideoPlayerProps) {
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const resolved = resolveVideoSource(source);

  useEffect(() => {
    const media = video.current;
    if (active) (media || iframe.current)?.focus();
    return () => {
      if (!media) return;
      media.pause();
      media.removeAttribute("src");
      media.load(); // Abort pending media work and release resources on close/unmount.
    };
  }, [active]);

  function close() {
    setActive(false);
    setFailed(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return (
    <figure className="hybrid-video-player">
      <div className="hybrid-video-frame">
        {!active || !resolved ? (
          <>
            <Image
              src={thumbnail.src}
              alt={thumbnail.alt}
              width={thumbnail.width}
              height={thumbnail.height}
              loading="lazy"
              sizes="(max-width: 700px) 100vw, 560px"
              className="hybrid-video-thumbnail"
            />
            {resolved && (
              <button
                ref={trigger}
                type="button"
                className="hybrid-video-play"
                aria-label={`Play ${title}`}
                onClick={() => setActive(true)}
              >
                <span aria-hidden="true" />
                <span>Play video</span>
              </button>
            )}
          </>
        ) : source.type === "youtube" ? (
          <iframe
            ref={iframe}
            src={resolved.playback}
            title={title}
            tabIndex={0}
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onError={() => setFailed(true)}
          />
        ) : (
          // Caption tracks are supplied when available, rather than an empty fake track.
          <video
            ref={video}
            src={resolved.playback}
            controls
            playsInline
            preload="none"
            autoPlay={false}
            tabIndex={0}
            aria-label={title}
            onError={() => setFailed(true)}
          >
            {source.captions && (
              <track
                kind="captions"
                src={source.captions.src}
                srcLang={source.captions.language}
                label={source.captions.label}
                default
              />
            )}
            Your browser does not support embedded MP4 video. Use the direct
            video link below.
          </video>
        )}
      </div>
      <figcaption>
        <p className="hybrid-video-help">
          {active
            ? "Use the player’s Play control to start. Videos do not play automatically."
            : source.type === "youtube"
              ? "YouTube connects only after you choose Play. Then use its Play control to start."
              : "The MP4 is not loaded until you choose to play it."}
        </p>
        {(!resolved || failed) && (
          <p role="alert" className="field-error">
            {!resolved
              ? "This video source is unavailable."
              : "This video could not be loaded. Try the fallback link or a related written guide."}
          </p>
        )}
        <div className="hybrid-video-actions">
          {resolved && (
            <a
              href={resolved.fallback}
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.type === "youtube"
                ? "Watch on YouTube"
                : "Open MP4 directly"}
              <span className="sr-only">: {title} (opens a new tab)</span>
            </a>
          )}
          {active && (
            <button type="button" onClick={close}>
              Close video
            </button>
          )}
        </div>
        {source.type === "youtube" && (
          <p className="hybrid-video-help">
            If embedding is restricted, use Watch on YouTube. YouTube may
            process viewing data after its player is loaded.
          </p>
        )}
      </figcaption>
    </figure>
  );
}
