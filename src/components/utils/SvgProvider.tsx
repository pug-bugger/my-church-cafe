// components/svg-icon.tsx
import { cn } from "@/lib/utils";

interface SvgProviderProps extends React.SVGProps<SVGSVGElement> {
  name: string; // The id in your svg file (e.g., "cup")
  className?: string;
}

export const SvgProvider = ({ name, className, ...props }: SvgProviderProps) => {
  return (
    <svg
      className={cn("w-6 h-6", className)} // Default size, overrideable
      aria-hidden="true"
      {...props}
    >
      {/* This points to the file in your public folder */}
      <use href={`/svg-icons.svg#${name}`} />
    </svg>
  );
};