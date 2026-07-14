import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/RatingStars";
import { useAuth } from "@/lib/auth";
import type { RatingWithPlace } from "@shared/schema";
import { useAppShell } from "@/components/AppShell";
import { ArrowLeft, Map } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { setHeaderAction } = useAppShell();

  const { data: ratings, isLoading } = useQuery<RatingWithPlace[]>({
    queryKey: ["/api/me/ratings"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) {
      setHeaderAction(null);
      return () => setHeaderAction(null);
    }

    setHeaderAction(
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="hidden sm:inline-flex"
        onClick={() => navigate("/")}
        aria-label="Open map"
        data-testid="button-open-map-navbar"
      >
        <Map className="h-4 w-4" />
      </Button>,
    );

    return () => setHeaderAction(null);
  }, [navigate, setHeaderAction, user]);

  if (!user) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sign in to see your ratings.
        </p>
        <Button
          type="button"
          className="mt-3"
          onClick={() => navigate("/auth")}
          data-testid="button-go-auth"
        >
          Sign in
        </Button>
      </Card>
    );
  }

  const avg =
    ratings && ratings.length > 0
      ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length
      : 0;

  return (
    <div className="space-y-4 xs:space-y-5">
      <div className="mt-2 hidden sm:block">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => navigate("/")}
          data-testid="button-back-to-map"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to map
        </Button>
      </div>

      <Card className="p-4 xs:p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Profile
        </div>
        <h1
          className="mt-1 font-display text-xl font-semibold tracking-tight xs:text-2xl"
          data-testid="text-display-name"
        >
          {user.displayName}
        </h1>
        <div
          className="mt-1 text-sm text-muted-foreground"
          data-testid="text-username"
        >
          @{user.username}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-card-border pt-4 xs:mt-5 xs:gap-4">
          <div>
            <div
              className="font-display text-2xl font-semibold tabular-nums xs:text-3xl"
              data-testid="text-my-rating-count"
            >
              {ratings?.length ?? 0}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {ratings?.length === 1 ? "rating" : "ratings"}
            </div>
          </div>
          <div className="text-right">
            <div
              className="font-display text-2xl font-semibold tabular-nums xs:text-3xl"
              data-testid="text-my-average"
            >
              {avg > 0 ? avg.toFixed(1) : "—"}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              your average
            </div>
          </div>
        </div>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Your ratings
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        ) : !ratings || ratings.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            You haven't rated any place yet. Open the map and try one.
          </Card>
        ) : (
          <ul className="space-y-2">
            {ratings.map((r) => (
              <li key={r.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    navigate(`/${r.place.id}`);
                  }}
                  className="cursor-pointer rounded-md border border-card-border bg-card p-4 hover-elevate active-elevate-2"
                  data-testid={`card-my-rating-${r.place.id}`}
                >
                  <div className="flex flex-col gap-3 xs:flex-row xs:items-start xs:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-base font-semibold">
                        {r.place.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.place.area} · {r.place.kind}
                      </p>
                      {r.note ? (
                        <p className="mt-1 text-sm text-foreground/80">
                          "{r.note}"
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1 xs:items-end">
                      <RatingStars
                        value={r.score}
                        readOnly
                        size={14}
                        testIdPrefix={`stars-my-${r.place.id}`}
                      />
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {r.score}/5
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
