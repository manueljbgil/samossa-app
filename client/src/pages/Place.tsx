import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import type { PlaceWithStats } from "@shared/schema";
import { PlaceMap } from "@/components/PlaceMap";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MapPin, Star, Navigation, X, Plus } from "lucide-react";
import { RatingStars } from "@/components/RatingStars";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { reverseGeocodeLocation } from "@/lib/reverseGeocoder";
import { useAppShell } from "@/components/AppShell";

export default function Place({ overrideId }: { overrideId?: number } = {}) {
  const [, params] = useRoute("/:id?");
  const [, navigate] = useLocation();
  const { setHeaderAction } = useAppShell();

  // Support an override id or read from the route param
  const idFromRoute = params && params.id ? Number(params.id) : NaN;
  const id = overrideId ?? (Number.isFinite(idFromRoute) ? idFromRoute : NaN);
  const { user } = useAuth();
  const { toast } = useToast();

  const [score, setScore] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
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
  const [addForm, setAddForm] = useState({
    name: "",
    description: "",
    labels: "",
    kind: "restaurant",
    area: "",
    city: "",
    address: "",
  });

  const { data: place, isLoading } = useQuery<PlaceWithStats>({
    queryKey: ["/api/places", id],
    enabled: !Number.isNaN(id),
  });

  const { data: ratings } = useQuery<
    {
      id: number;
      userId: number;
      placeId: number;
      score: number;
      note: string | null;
      updatedAt: number;
      user: { id: number; username: string; displayName: string };
    }[]
  >({
    queryKey: ["/api/places", id, "ratings"],
    enabled: !Number.isNaN(id),
  });

  const comments = ratings?.filter((rating) => rating.note?.trim());

  const { data: places } = useQuery<PlaceWithStats[]>({
    queryKey: ["/api/places"],
  });

  const googleMapsUrl =
    place?.latitude != null && place?.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${place.latitude},${place.longitude}`,
        )}&travelmode=driving`
      : place
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${place.address}, ${place.city}`,
          )}`
        : undefined;

  // Listen for marker clicks from PlaceMap (dispatched as a CustomEvent)
  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail;
      if (id) navigate(`/${id}`);
    };
    window.addEventListener("place-click", handler as EventListener);
    return () =>
      window.removeEventListener("place-click", handler as EventListener);
  }, [navigate]);

  // Hydrate the form once the user's existing rating arrives.
  useEffect(() => {
    if (place?.myRating != null) setScore(place.myRating);
    else setScore(0);
  }, [place?.id, place?.myRating]);

  const createPlace = useMutation({
    mutationFn: async (payload: Record<string, string | number | null>) => {
      const res = await apiRequest("POST", "/api/places", payload);
      return res.json();
    },
    onSuccess: (createdPlace: PlaceWithStats) => {
      queryClient.invalidateQueries({ queryKey: ["/api/places"] });
      toast({
        title: "Place added",
        description: `${createdPlace.name} is now on the map.`,
      });
      setIsAddDialogOpen(false);
      setSelectedLocation(null);
      setAddForm({
        name: "",
        description: "",
        labels: "",
        kind: "restaurant",
        area: "",
        city: "",
        address: "",
      });
      navigate(`/${createdPlace.id}`);
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn't add place",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const submit = useMutation({
    mutationFn: async (vars: { score: number; note: string }) => {
      const res = await apiRequest("POST", "/api/ratings", {
        placeId: id,
        score: vars.score,
        note: vars.note || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places"] });
      queryClient.invalidateQueries({ queryKey: ["/api/places", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/ratings"] });
      toast({
        title: place?.myRating != null ? "Rating updated" : "Rating saved",
        description: `You gave ${place?.name} ${score}/5.`,
      });
      setRatingDialogOpen(false);
    },
    onError: (err) => {
      toast({
        title: "Couldn't save rating",
        description: String(err),
        variant: "destructive",
      });
    },
  });

  const handleConfirmLocation = async () => {
    const center = mapCenterGetterRef.current?.();
    if (!center) return;
    setIsResolvingLocation(true);
    setSelectedLocation(center);
    try {
      const resolved = await reverseGeocodeLocation(center);
      if (resolved) {
        setAddForm((current) => ({
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

  const handleAddPlaceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!selectedLocation) return;

    createPlace.mutate({
      name: addForm.name.trim(),
      description: addForm.description.trim(),
      labels: addForm.labels.trim() || null,
      kind: addForm.kind,
      area: addForm.area.trim(),
      city: addForm.city.trim() || null,
      address: addForm.address.trim() || null,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    });
  };

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
        onClick={() => {
          setSelectedLocation(null);
          setIsAddDialogOpen(false);
          setIsSelectingLocation(true);
          toast({
            title: "Choose location",
            description:
              "Center the map on the new place, then confirm the location.",
          });
        }}
        aria-label="Add place"
        data-testid="button-add-place-navbar"
      >
        <Plus className="h-4 w-4" />
      </Button>,
    );

    return () => setHeaderAction(null);
  }, [setHeaderAction, toast, user]);

  const renderAddPlaceControls = () => (
    <>
      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add a new place</DialogTitle>
            <DialogDescription>
              Share a spot with the community by adding its name, description,
              labels, and location.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAddPlaceSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Choose location</label>
                <p className="text-sm text-muted-foreground">
                  Center the map on the new place before confirming the
                  location.
                </p>
                {selectedLocation ? (
                  <p className="text-sm text-foreground">
                    Selected coordinates: {selectedLocation.latitude.toFixed(6)}
                    , {selectedLocation.longitude.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Center the map on the location and press confirm to select
                    it.
                  </p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={addForm.name}
                  onChange={(event) =>
                    setAddForm((current) => ({
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
                  value={addForm.area}
                  onChange={(event) =>
                    setAddForm((current) => ({
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
                  value={addForm.city}
                  onChange={(event) =>
                    setAddForm((current) => ({
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
                  value={addForm.address}
                  onChange={(event) =>
                    setAddForm((current) => ({
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
                  value={addForm.description}
                  onChange={(event) =>
                    setAddForm((current) => ({
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
                  value={addForm.labels}
                  onChange={(event) =>
                    setAddForm((current) => ({
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
                  value={addForm.kind}
                  onChange={(event) =>
                    setAddForm((current) => ({
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
      {isSelectingLocation && !isAddDialogOpen ? (
        <div className="fixed left-1/2 bottom-[var(--app-floating-offset)] z-[70] -translate-x-1/2 sm:bottom-8">
          <Button
            type="button"
            size="sm"
            onClick={() => void handleConfirmLocation()}
            disabled={isResolvingLocation}
            className="gap-2 rounded-full px-[var(--app-confirm-button-pad-x)] py-[var(--app-confirm-button-pad-y)] text-[length:var(--app-confirm-button-font-size)] shadow-xl shadow-primary/30"
          >
            {isResolvingLocation
              ? "Looking up location..."
              : "Confirm location"}
          </Button>
        </div>
      ) : null}
    </>
  );

  // If no id provided, show the map with all places and no detail.
  if (Number.isNaN(id)) {
    if (!places) {
      return (
        <div className="relative">
          {renderAddPlaceControls()}
          <div className="space-y-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      );
    }

    // center on first place if available
    const centerPlace = places[0];
    return (
      <div className="relative">
        {renderAddPlaceControls()}
        <PlaceMap
          place={centerPlace}
          places={places || []}
          selectedId={null}
          pickingLocation={isSelectingLocation}
          onGetCenter={(getCenter) => {
            mapCenterGetterRef.current = getCenter;
          }}
          pickedLocation={selectedLocation}
        />
      </div>
    );
  }

  if (isLoading || !place) {
    return (
      <div className="relative">
        {renderAddPlaceControls()}
        <div className="space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {renderAddPlaceControls()}

      {/* Map background - full viewport width */}
      <PlaceMap
        place={place}
        places={places || []}
        selectedId={place.id}
        pickingLocation={isSelectingLocation}
        onGetCenter={(getCenter) => {
          mapCenterGetterRef.current = getCenter;
        }}
        pickedLocation={selectedLocation}
      />

      {/* Detail card overlay (bottom-left) */}
      <div className="absolute bottom-[var(--app-floating-offset)] left-[var(--app-page-gutter)] right-[var(--app-page-gutter)] z-50 max-w-sm sm:bottom-8 sm:right-auto sm:w-[min(24rem,calc(100vw-2rem))]">
        <Card className="max-h-[var(--app-detail-card-max-height)] overflow-y-auto overflow-x-hidden overscroll-contain p-4 xs:p-5 sm:max-h-[min(70vh,38rem)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {place.kind}
                </span>
                <span className="text-xs text-muted-foreground">
                  {place.area}
                </span>
              </div>
              <h1
                className="mt-1 font-display text-xl font-semibold tracking-tight line-clamp-2 xs:text-2xl"
                data-testid="text-place-name"
              >
                {place.name}
              </h1>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span data-testid="text-place-address" className="line-clamp-1">
                  {place.address} · {place.city}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close widget"
              data-testid="button-close-widget"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-foreground/85 line-clamp-2 xs:text-sm">
            {place.description}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-card-border pt-3">
            <div>
              <div
                className="font-display text-xl font-semibold tabular-nums xs:text-2xl"
                data-testid="text-average-rating"
              >
                {place.averageRating > 0 ? place.averageRating.toFixed(1) : "—"}
                <span className="ml-0.5 text-sm text-muted-foreground">/5</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <RatingStars
                  value={place.averageRating}
                  readOnly
                  size={14}
                  testIdPrefix="stars-average"
                />
              </div>
            </div>
            <div className="text-right">
              <div
                className="font-display text-xl font-semibold tabular-nums xs:text-2xl"
                data-testid="text-rating-count"
              >
                {place.ratingCount}
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {place.ratingCount === 1 ? "rating" : "ratings"}
              </div>
            </div>
          </div>

          {googleMapsUrl ? (
            <div className="mt-4 border-t border-card-border pt-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {!user ? (
                  <Button
                    onClick={() => navigate("/auth")}
                    data-testid="button-go-auth"
                    className="inline-flex w-full justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
                  >
                    <Star className="h-4 w-4" />
                    Sign in to rate
                  </Button>
                ) : (
                  <Button
                    onClick={() => setRatingDialogOpen(true)}
                    className="inline-flex w-full justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
                    data-testid="button-open-rating"
                  >
                    <Star className="h-4 w-4" />
                    {place.myRating != null
                      ? "Update rating"
                      : "Rate this place"}
                  </Button>
                )}
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-card-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-background/80 sm:flex-1"
                  data-testid="link-google-directions"
                >
                  <Navigation className="h-4 w-4" />
                  Get directions
                </a>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex h-[var(--app-detail-comments-height)] flex-col border-t border-card-border pt-3 sm:h-[28vh]">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Comments
            </h2>

            <div className="mt-3 flex-1  pr-1">
              {ratings == null ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((index) => (
                    <Skeleton key={index} className="h-20 w-full rounded-md" />
                  ))}
                </div>
              ) : comments?.length === 0 ? (
                <div className="rounded-md border border-card-border bg-card p-5 text-sm text-muted-foreground">
                  No comments yet. Be the first to rate and leave a note.
                </div>
              ) : (
                <ul className="space-y-3 pb-3">
                  {comments?.map((rating) => (
                    <li key={rating.id}>
                      <Card className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground">
                              {rating.user.displayName}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {rating.score}/5 ·{" "}
                              {new Date(rating.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                          {rating.note}
                        </p>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Rating dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate {place.name}</DialogTitle>
            <DialogDescription>
              Share your honest 0–5 rating and optional notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <RatingStars
                value={score}
                onChange={setScore}
                size={28}
                testIdPrefix="stars-input"
              />
              <span
                className="text-sm tabular-nums text-muted-foreground"
                data-testid="text-current-score"
              >
                {score}/5
              </span>
            </div>

            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note — crispness, filling, vibe…"
              rows={3}
              data-testid="input-note"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {place.myRating != null
                  ? `Last rating: ${place.myRating}/5`
                  : "You haven't rated this place yet."}
              </span>
              <Button
                type="button"
                disabled={score < 1 || submit.isPending}
                onClick={() => submit.mutate({ score, note })}
                data-testid="button-submit-rating"
              >
                {submit.isPending
                  ? "Saving…"
                  : place.myRating != null
                    ? "Update"
                    : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
