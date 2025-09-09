import React from "react";

// Define available icon names for better TypeScript support
export type IconName = "cappuccino" | "latte" | "espresso" | "coffee";

interface SvgIconProps {
  name: IconName;
  size?: number | string;
  className?: string;
  fill?: string;
  color?: string;
  onClick?: () => void;
  title?: string;
}

const SvgIcon: React.FC<SvgIconProps> = ({
  name,
  size = 24,
  className = "",
  fill = "currentColor",
  color = "currentColor",
  onClick,
  title,
}) => {
  const sizeValue = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      width={sizeValue}
      height={sizeValue}
      className={`inline-block ${onClick ? "cursor-pointer" : ""} ${className}`}
      fill={fill}
      style={{ color }}
      onClick={onClick}
      role={onClick ? "button" : "img"}
      aria-label={title || `${name} icon`}
    >
      <use href={`/icons.svg#${name}`} />
      {title && <title>{title}</title>}
    </svg>
  );
};

export default SvgIcon;
