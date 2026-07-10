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

export function RatingStars({ value, onChange, size = 22, readOnly, testIdPrefix }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const interactive = !readOnly && typeof onChange === "function";

  return (
    <div className="inline-flex items-center gap-1" data-testid={testIdPrefix ?? "rating"}>
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
              interactive && "hover-elevate active-elevate-2 cursor-pointer hover:scale-110",
              !interactive && "cursor-default",
            )}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            data-testid={`${testIdPrefix ?? "rating"}-star-${n}`}
          >
            <Star
              width={size}
              height={size}
              strokeWidth={1.6}
              className={cn(
                "transition-colors",
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
