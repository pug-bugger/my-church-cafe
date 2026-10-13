"use client";

import { useId } from "react";

/**
 * An eye with a clock in its corner — "off sale until tomorrow". Drawn in
 * lucide's grid and stroke so it sits with the other icons; lucide itself has
 * no such glyph. The eye is cut away under the clock rather than overlapped,
 * so it reads on any background in either mode.
 */
export function EyeClockIcon({ className }: { className?: string }) {
  // useId's ":r0:" form is not a safe url(#…) fragment everywhere.
  const maskId = `eye-clock-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <mask id={maskId}>
        <rect width="24" height="24" fill="white" stroke="none" />
        <circle cx="18" cy="18" r="7.5" fill="black" stroke="none" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </g>
      <circle cx="18" cy="18" r="5" />
      <path d="M18 15.75V18l1.5 1" />
    </svg>
  );
}
