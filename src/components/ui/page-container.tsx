import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard page shell: centered, width-capped, with responsive gutters that
 * shrink on phones and grow on larger screens. Replaces the ad-hoc
 * `container mx-auto py-6` wrapper each page declared.
 *
 * Pass `fullWidth` for edge-to-edge layouts (e.g. the guest orders board).
 */
export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  fullWidth?: boolean;
}

export function PageContainer({
  className,
  fullWidth = false,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-6 sm:px-6 sm:py-8",
        fullWidth ? "max-w-none" : "max-w-7xl",
        className
      )}
      {...props}
    />
  );
}
