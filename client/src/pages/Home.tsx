import { useState, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { PlaceWithStats } from "@shared/schema";
import { InteractiveMap } from "@/components/InteractiveMap";
import Place from "@/pages/Place";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RatingStars } from "@/components/RatingStars";
import { Search, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { reverseGeocodeLocation } from "@/lib/reverseGeocoder";

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapCenterGetterRef = useRef<
    (() => { latitude: number; longitude: number } | null) | null
  >(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    labels: "",
    kind: "restaurant",
    area: "",
    city: "",
    address: "",
  });

  const { data: places, isLoading } = useQuery<PlaceWithStats[]>({
    queryKey: ["/api/places"],
  });

  const createPlace = useMutation({
    mutationFn: async (payload: Record<string, string | number | null>) => {
      const res = await apiRequest("POST", "/api/places", payload);
      return res.json();
    },
    onSuccess: (place: PlaceWithStats) => {
      queryClient.invalidateQueries({ queryKey: ["/api/places"] });
      toast({
        title: "Place added",
        description: `${place.name} is now on the map.`,
      });
      setIsAddDialogOpen(false);
      setSelectedLocation(null);
      setForm({
        name: "",
        description: "",
        labels: "",
        kind: "restaurant",
        area: "",
        city: "",
        address: "",
      });
      navigate(`/${place.id}`);
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn't add place",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    if (!places) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return places;
    return places.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.area.toLowerCase().includes(needle) ||
        p.kind.toLowerCase().includes(needle),
    );
  }, [places, q]);

  const handleConfirmLocation = async () => {
    const center = mapCenterGetterRef.current?.();
    if (!center) return;
    setIsResolvingLocation(true);
    setSelectedLocation(center);
    try {
      const resolved = await reverseGeocodeLocation(center);
      if (resolved) {
        setForm((current) => ({
          ...current,
          area: resolved.area || current.area,
          city: resolved.city || current.city,
          address: resolved.address || current.address,
        }));
      }
    } finally {
      setIsResolvingLocation(false);
      setIsSelectingLocation(false);
      setIsAddDialogOpen(true);
      toast({
        title: "Location selected",
        description: "Now enter the place details.",
      });
    }
  };

  const handleAddDialogOpenChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setIsSelectingLocation(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!selectedLocation) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      labels: form.labels.trim() || null,
      kind: form.kind,
      area: form.area.trim(),
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    };

    createPlace.mutate(payload);
  };

  // selection is driven by the router path (navigate("/:id"))

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              The city's best samosas, plotted.
            </h1>
            <p className="text-sm text-muted-foreground">
              Tap a pin to read the place's story, then leave your honest 0–5
              rating. Your ratings build the average for everyone.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {user ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!user) {
                    navigate("/auth");
                    return;
                  }
                  setSelectedLocation(null);
                  setIsAddDialogOpen(false);
                  setIsSelectingLocation(true);
                  toast({
                    title: "Choose location",
                    description:
                      "Center the map on the new place, then confirm the location.",
                  });
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add place
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {isLoading ? (
        <Skeleton className="aspect-[4/3] w-full rounded-md" />
      ) : (
        <InteractiveMap
          places={filtered}
          selectedId={selectedId}
          onSelect={(id: number) => {
            setSelectedId(id);
            navigate(`/${id}`);
          }}
          pickingLocation={isSelectingLocation}
          onGetCenter={(getCenter) => {
            mapCenterGetterRef.current = getCenter;
          }}
          pickedLocation={selectedLocation}
        />
      )}

      {isSelectingLocation && !isAddDialogOpen ? (
        <div className="fixed bottom-[6.5rem] left-1/2 z-50 -translate-x-1/2 sm:bottom-8">
          <Button
            type="button"
            size="sm"
            onClick={() => void handleConfirmLocation()}
            disabled={isResolvingLocation}
            className="gap-2 rounded-full px-4 py-2 shadow-xl shadow-primary/30"
          >
            {isResolvingLocation
              ? "Looking up location..."
              : "Confirm location"}
          </Button>
        </div>
      ) : null}

      {/* Render place detail when a hash/selectedId is present */}
      {selectedId != null && <Place overrideId={selectedId} />}

      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add a new place</DialogTitle>
            <DialogDescription>
              Share a spot with the community by adding its name, description,
              labels, and location.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Choose location</label>
                <p className="text-sm text-muted-foreground">
                  You’ve already selected the location on the map. Add the rest
                  of the place details here.
                </p>
                {selectedLocation ? (
                  <p className="text-sm text-foreground">
                    Selected coordinates: {selectedLocation.latitude.toFixed(6)}
                    , {selectedLocation.longitude.toFixed(6)}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Samosa House"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Area</label>
                <Input
                  value={form.area}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      area: event.target.value,
                    }))
                  }
                  placeholder="Alfama"
                  disabled
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  placeholder="Lisbon"
                  disabled
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  placeholder="Rua de São Miguel 12"
                  disabled
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="What makes this place special?"
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Labels</label>
                <Input
                  value={form.labels}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      labels: event.target.value,
                    }))
                  }
                  placeholder="cozy, spicy, late-night"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.kind}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      kind: event.target.value,
                    }))
                  }
                >
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Cafe</option>
                  <option value="bakery">Bakery</option>
                  <option value="bar">Bar</option>
                  <option value="tasca">Tasca</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPlace.isPending || !selectedLocation}
              >
                {createPlace.isPending ? "Saving..." : "Add place"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2 rounded-md border border-card-border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search places, neighbourhoods, kinds…"
          className="h-8 border-0 bg-transparent p-0 focus-visible:ring-0"
          data-testid="input-search-places"
        />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            All places
          </h2>
          <span
            className="text-xs text-muted-foreground"
            data-testid="text-places-count"
          >
            {filtered.length} {filtered.length === 1 ? "place" : "places"}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No places match "{q}".
          </Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full rounded-md border border-card-border bg-card p-4 text-left hover-elevate active-elevate-2"
                  onClick={() => {
                    navigate(`/${p.id}`);
                  }}
                  data-testid={`card-place-${p.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className="truncate font-display text-base font-semibold"
                          data-testid={`text-place-name-${p.id}`}
                        >
                          {p.name}
                        </h3>
                        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {p.kind}
                        </span>
                      </div>
                      {p.area || p.address ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[p.area, p.address].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <RatingStars
                        value={p.averageRating}
                        readOnly
                        size={14}
                        testIdPrefix={`stars-card-${p.id}`}
                      />
                      <span
                        className="text-[10px] tabular-nums text-muted-foreground"
                        data-testid={`text-rating-summary-${p.id}`}
                      >
                        {p.averageRating > 0 ? p.averageRating.toFixed(1) : "—"}{" "}
                        · {p.ratingCount}{" "}
                        {p.ratingCount === 1 ? "rating" : "ratings"}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
