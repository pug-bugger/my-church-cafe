"use client";

import type { ReactNode } from "react";
import type { DrinkSubtypeSection } from "@/lib/drinkSubtypeGroups";

type DrinkSubtypeSectionsProps<T> = {
  sections: DrinkSubtypeSection<T>[];
  /** `nested` uses h3 (under a parent Drinks heading); `standalone` uses h2. */
  variant?: "nested" | "standalone";
  renderItems: (items: T[]) => ReactNode;
  className?: string;
};

export function DrinkSubtypeSections<T>({
  sections,
  variant = "standalone",
  renderItems,
  className,
}: DrinkSubtypeSectionsProps<T>) {
  if (!sections.length) return null;

  const Heading = variant === "nested" ? "h3" : "h2";
  const headingClass =
    variant === "nested"
      ? "text-base font-semibold tracking-tight"
      : "text-lg font-semibold tracking-tight";

  return (
    <div className={className ?? "space-y-8"}>
      {sections.map((section) => (
        <section key={section.title} className="space-y-4">
          <Heading className={headingClass}>{section.title}</Heading>
          {renderItems(section.items)}
        </section>
      ))}
    </div>
  );
}
