"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Presentation mode fills the screen with just one board (the menu, the order
 * board). The real Fullscreen API is used where it exists, so browser chrome
 * goes too; the caller's fixed overlay is what actually hides the app header,
 * and stands alone on browsers — iOS Safari — that refuse element fullscreen.
 *
 * Attach `rootRef` to the element that becomes the overlay.
 */
export function usePresentationMode<T extends HTMLElement = HTMLDivElement>() {
  const rootRef = useRef<T>(null);
  const [presenting, setPresenting] = useState(false);

  const togglePresenting = useCallback(() => {
    setPresenting((wasPresenting) => {
      if (wasPresenting) {
        if (document.fullscreenElement)
          void document.exitFullscreen().catch(() => {});
        return false;
      }
      void rootRef.current?.requestFullscreen?.().catch(() => {});
      return true;
    });
  }, []);

  // Esc leaves native fullscreen without telling React; keep the two in step.
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return { rootRef, presenting, togglePresenting };
}
