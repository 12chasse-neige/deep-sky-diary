import { useEffect, useRef, useState } from 'react';

const POSTER = `${import.meta.env.BASE_URL}media/deep-sky-panorama.png`;
// Use the bundled web export by default; .env.local can override the clip.
const VIDEO =
  import.meta.env.VITE_SKY_VIDEO ?? `${import.meta.env.BASE_URL}media/deep-sky-loop.mp4`;

/** The image always stays underneath: loading errors and blocked autoplay keep a usable backdrop. */
export function SkyBackground({ moving }: { moving: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const syncPlayback = () => {
      if (moving && !document.hidden) {
        void element.play().catch(() => setReady(false));
      } else {
        element.pause();
      }
    };
    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      document.removeEventListener('visibilitychange', syncPlayback);
      element.pause();
    };
  }, [moving, failed]);

  return (
    <div className="sky-background" data-moving={moving} aria-hidden="true">
      <div className="sky-media">
        <img src={POSTER} alt="" fetchPriority="high" />
        {VIDEO && !failed && (
          <video
            ref={video}
            className={ready ? 'is-ready' : ''}
            src={VIDEO}
            poster={POSTER}
            muted
            loop
            playsInline
            preload="metadata"
            onPlaying={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="sky-veil" />
    </div>
  );
}
