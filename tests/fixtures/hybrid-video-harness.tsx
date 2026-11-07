// Development-only browser fixture. This is never an application route or catalog entry.
import { createRoot } from "react-dom/client";
import { HybridVideoPlayer } from "../../src/components/guides/hybrid-video-player";
import type { HybridVideoPlayerProps } from "../../src/types/video";
declare global {
  interface Window {
    mountVideo: (props: HybridVideoPlayerProps) => void;
    unmountVideo: () => void;
  }
}
const root = createRoot(document.getElementById("video-test-root")!);
window.mountVideo = (props) => root.render(<HybridVideoPlayer {...props} />);
window.unmountVideo = () => root.unmount();
