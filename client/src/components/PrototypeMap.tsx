import { useState } from "react";
import type { PlaceWithStats } from "@shared/schema";
import { cn } from "@/lib/utils";

type Props = {
  places: PlaceWithStats[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
};

/**
 * Stylized prototype map of central Lisbon. Hand-drawn SVG — not a real geographic
 * map. Uses normalized 0–100 coordinates from the seed data so pins land in plausible
 * spots over the river and neighbourhoods.
 */
export function PrototypeMap({ places, selectedId, onSelect }: Props) {
  const [hoverId, setHoverId] = useState<number | null>(null);

  return (
    <div
      className="relative w-full overflow-hidden rounded-md border border-card-border bg-card paper-texture"
      style={{ aspectRatio: "4 / 3" }}
      data-testid="map-prototype"
    >
      {/* Hand-drawn neighbourhood blocks */}
      <svg
        viewBox="0 0 100 75"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="riverHatch"
            width="3"
            height="3"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="3"
              stroke="hsl(var(--primary) / 0.18)"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>

        {/* Tagus river — bottom band */}
        <path
          d="M-2 60 Q 25 56, 50 62 T 102 60 L 102 80 L -2 80 Z"
          fill="url(#riverHatch)"
          stroke="hsl(var(--primary) / 0.4)"
          strokeWidth="0.4"
        />
        <text
          x="74"
          y="72"
          fontSize="2.6"
          fill="hsl(var(--primary) / 0.55)"
          fontStyle="italic"
        >
          Rio Tejo
        </text>

        {/* Neighbourhood patches */}
        {[
          { x: 6, y: 6, w: 22, h: 24, label: "Estrela" },
          { x: 30, y: 6, w: 26, h: 22, label: "Príncipe Real" },
          { x: 58, y: 6, w: 36, h: 18, label: "Anjos" },
          { x: 6, y: 32, w: 18, h: 22, label: "Santos" },
          { x: 26, y: 30, w: 22, h: 24, label: "Bairro Alto" },
          { x: 50, y: 26, w: 18, h: 22, label: "Mouraria" },
          { x: 70, y: 26, w: 24, h: 24, label: "Alfama" },
          { x: 60, y: 50, w: 18, h: 8, label: "Cais do Sodré" },
        ].map((b) => (
          <g key={b.label}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={1.2}
              fill="hsl(var(--secondary))"
              stroke="hsl(var(--card-border))"
              strokeWidth="0.4"
            />
            <text
              x={b.x + b.w / 2}
              y={b.y + b.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="2.2"
              fill="hsl(var(--muted-foreground))"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {b.label}
            </text>
          </g>
        ))}

        {/* Compass */}
        <g transform="translate(92, 6)">
          <circle
            r="2.6"
            fill="hsl(var(--card))"
            stroke="hsl(var(--border))"
            strokeWidth="0.3"
          />
          <path d="M0 -2 L0.6 0 L0 2 L-0.6 0 Z" fill="hsl(var(--primary))" />
          <text
            x="0"
            y="-3.4"
            textAnchor="middle"
            fontSize="1.6"
            fill="hsl(var(--muted-foreground))"
          >
            N
          </text>
        </g>
      </svg>

      {/* Pins layer (HTML for accessibility/clicks) */}
      {places.map((p) => {
        // Handle null mapX/mapY by using defaults
        const x = Math.max(2, Math.min(98, p.mapX ?? 50));
        const y = Math.max(2, Math.min(70, (p.mapY ?? 50) * 0.75)); // scale to viewBox
        const isSelected = selectedId === p.id;
        const isHover = hoverId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            onMouseEnter={() => setHoverId(p.id)}
            onMouseLeave={() => setHoverId(null)}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-full",
              "transition-transform",
              isSelected && "z-20 scale-110",
              !isSelected && isHover && "z-10 scale-105",
            )}
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={`${p.name} — ${p.area}`}
            data-testid={`map-pin-${p.id}`}
          >
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "rounded-full border-2 px-2 py-0.5 text-xs font-medium shadow-md whitespace-nowrap",
                  "transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-card-foreground border-primary/60",
                )}
              >
                {p.averageRating > 0 ? p.averageRating.toFixed(1) : "—"}
                <span className="ml-1 opacity-70 text-[10px]">★</span>
              </div>
              <div
                className={cn(
                  "mt-[-2px] h-0 w-0 border-x-[6px] border-x-transparent border-t-[8px]",
                  isSelected ? "border-t-primary" : "border-t-primary/60",
                )}
                aria-hidden
              />
              <div
                className={cn(
                  "pointer-events-none mt-1 max-w-[150px] truncate rounded-full border border-card-border bg-background/90 px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-sm",
                  "opacity-0 transition-opacity",
                  (isSelected || isHover) && "opacity-100",
                  isSelected ? "text-primary" : "text-foreground/80",
                )}
              >
                {p.name}
              </div>
            </div>
          </button>
        );
      })}

      {/* Prototype-map disclaimer */}
      <div
        className="absolute bottom-2 left-2 rounded bg-background/70 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm"
        data-testid="text-map-disclaimer"
      >
        Stylized prototype map — not to scale
      </div>
    </div>
  );
}
