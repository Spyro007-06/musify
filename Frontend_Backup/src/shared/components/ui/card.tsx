import { PropsWithChildren } from "react";
import { cn } from "@/shared/utils/utils";

type CardProps = PropsWithChildren<{ className?: string }>;

export function Card({ children, className }: CardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] p-4 backdrop-blur-xl transition duration-200",
        className
      )}
    >
      {children}
    </article>
  );
}
