import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number; // 0–5 (can be fractional for display)
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  testIdPrefix?: string;
};

export function RatingStars({
  value,
  onChange,
  size,
  readOnly,
  testIdPrefix,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const interactive = !readOnly && typeof onChange === "function";
  const hasExplicitSize = typeof size === "number";
  const responsiveStarSizeClass =
    "h-4 w-4 xs:h-4 xs:w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7";

  return (
    <div
      className="inline-flex items-center gap-0.5 xs:gap-1 sm:gap-1 md:gap-1.5 lg:gap-1.5 xl:gap-2"
      data-testid={testIdPrefix ?? "rating"}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = display >= n;
        const half = !filled && display >= n - 0.5;
        return (
          <button
            key={n}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHover(n)}
            onMouseLeave={() => interactive && setHover(null)}
            onClick={() => interactive && onChange?.(n)}
            className={cn(
              "rounded-full transition-transform",
              interactive &&
                "h-7 w-7 xs:h-8 xs:w-8 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 xl:h-10 xl:w-10 2xl:h-11 2xl:w-11",
              interactive &&
                "hover-elevate active-elevate-2 cursor-pointer hover:scale-110",
              !interactive && "cursor-default",
            )}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            data-testid={`${testIdPrefix ?? "rating"}-star-${n}`}
          >
            <Star
              width={hasExplicitSize ? size : undefined}
              height={hasExplicitSize ? size : undefined}
              strokeWidth={1.6}
              className={cn(
                "transition-colors",
                !hasExplicitSize && responsiveStarSizeClass,
                filled
                  ? "fill-accent text-accent"
                  : half
                    ? "fill-accent/50 text-accent"
                    : "fill-transparent text-muted-foreground",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
