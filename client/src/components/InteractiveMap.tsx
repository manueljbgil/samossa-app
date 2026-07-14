import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { fromLonLat, toLonLat } from "ol/proj";
import type { PlaceWithStats } from "@shared/schema";
import "ol/ol.css";
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from "@/components/ui/toast";

type LocationPoint = {
  latitude: number;
  longitude: number;
};

type Props = {
  places: PlaceWithStats[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
  onGetCenter?: (getCenter: () => LocationPoint | null) => void;
  pickedLocation?: LocationPoint | null;
  pickingLocation?: boolean;
};

export function InteractiveMap({
  places,
  selectedId,
  onSelect,
  onGetCenter,
  pickedLocation,
  pickingLocation,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const pickingLocationRef = useRef(pickingLocation);
  const onGetCenterRef = useRef(onGetCenter);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [markerPositions, setMarkerPositions] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      place?: PlaceWithStats;
      isSelected: boolean;
      isHovered: boolean;
      isPicked: boolean;
    }>
  >([]);

  const getMarkerClassName = (marker: {
    isPicked: boolean;
    isSelected: boolean;
    isHovered: boolean;
  }) => {
    if (marker.isPicked) return "bg-amber-400";
    if (marker.isSelected) return "bg-primary";
    if (marker.isHovered) return "bg-accent";
    return "bg-secondary";
  };

  const getOffsetCenter = (coordinate: number[]) => {
    if (!mapRef.current) return coordinate;
    const map = mapRef.current;
    const pixel = map.getPixelFromCoordinate(coordinate);
    if (!pixel) return coordinate;

    const size = map.getSize();
    const offset = size ? Math.min(size[1] * 0.32, 220) : 160;
    const targetPixel = [pixel[0], pixel[1] + offset];
    return map.getCoordinateFromPixel(targetPixel) || coordinate;
  };

  const flyToLocation = (coordinate: number[], zoom = 15) => {
    const view = mapRef.current?.getView();
    if (!view) return;

    requestAnimationFrame(() => {
      view.cancelAnimations();
      view.animate({
        center: getOffsetCenter(coordinate),
        zoom,
        duration: 700,
      });
    });
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new Map({
      target: mapContainer.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            attributions: "© OpenStreetMap contributors",
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([-8.6383, 38.7223]),
        zoom: 7,
      }),
    });

    // clicks
    map.on("click", (e) => {
      const target = e.originalEvent?.target as HTMLElement | null;
      if (target && target.closest("button[aria-label]")) {
        return;
      }

      map.forEachFeatureAtPixel(e.pixel, (feature: any) => {
        const place = feature.get("place") as PlaceWithStats;
        if (place) onSelect(place.id);
      });
    });

    map.on("pointermove", (e) => {
      const target = e.originalEvent?.target as HTMLElement | null;
      if (target && target.closest("button[aria-label]")) {
        map.getTargetElement().style.cursor = "pointer";
        return;
      }

      let foundPlace: PlaceWithStats | null = null;
      map.forEachFeatureAtPixel(e.pixel, (feature: any) => {
        const place = feature.get("place") as PlaceWithStats | undefined;
        if (place) foundPlace = place;
      });

      const nextHoverId: number | null = foundPlace
        ? Number((foundPlace as { id?: number }).id)
        : null;
      if (nextHoverId !== hoverId) {
        setHoverId(nextHoverId);
      }
      map.getTargetElement().style.cursor = foundPlace ? "pointer" : "";
    });

    mapRef.current = map;
    if (onGetCenterRef.current) {
      onGetCenterRef.current(() => {
        const viewCenter = map.getView().getCenter();
        if (!viewCenter) return null;
        const [longitude, latitude] = toLonLat(viewCenter);
        return { latitude, longitude };
      });
    }

    return () => map.setTarget(undefined);
  }, [onSelect]);

  useEffect(() => {
    pickingLocationRef.current = pickingLocation;
    onGetCenterRef.current = onGetCenter;
  }, [pickingLocation, onGetCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateMarkerPositions = () => {
      const positions: Array<{
        id: number;
        x: number;
        y: number;
        place?: PlaceWithStats;
        isSelected: boolean;
        isHovered: boolean;
        isPicked: boolean;
      }> = [];

      places.forEach((place) => {
        if (place.latitude == null || place.longitude == null) return;
        const pixel = map.getPixelFromCoordinate(
          fromLonLat([place.longitude, place.latitude]),
        );
        if (!pixel) return;
        positions.push({
          id: place.id,
          x: pixel[0],
          y: pixel[1],
          place,
          isSelected: selectedId === place.id,
          isHovered: hoverId === place.id,
          isPicked: false,
        });
      });

      if (pickedLocation) {
        const pixel = map.getPixelFromCoordinate(
          fromLonLat([pickedLocation.longitude, pickedLocation.latitude]),
        );
        if (pixel) {
          positions.push({
            id: -1,
            x: pixel[0],
            y: pixel[1],
            isSelected: false,
            isHovered: false,
            isPicked: true,
          });
        }
      }

      setMarkerPositions(positions);
    };

    map.on("postrender", updateMarkerPositions);
    map.on("moveend", updateMarkerPositions);
    map.on("pointerdrag", updateMarkerPositions);
    map.on("change:view", updateMarkerPositions);
    window.addEventListener("resize", updateMarkerPositions);
    updateMarkerPositions();

    return () => {
      map.un("postrender", updateMarkerPositions);
      map.un("moveend", updateMarkerPositions);
      map.un("pointerdrag", updateMarkerPositions);
      map.un("change:view", updateMarkerPositions);
      window.removeEventListener("resize", updateMarkerPositions);
    };
  }, [places, pickedLocation, selectedId, hoverId]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!selectedId) return;

    const selectedPlace = places.find((place) => place.id === selectedId);
    if (
      !selectedPlace ||
      selectedPlace.latitude == null ||
      selectedPlace.longitude == null
    )
      return;

    const dest = fromLonLat([selectedPlace.longitude, selectedPlace.latitude]);
    flyToLocation(dest);
  }, [selectedId, places]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!pickedLocation) return;
    try {
      const dest = fromLonLat([
        pickedLocation.longitude,
        pickedLocation.latitude,
      ]);
      flyToLocation(dest);
    } catch (err) {
      // noop
    }
  }, [pickedLocation]);

  // toast state for showing picked coordinates
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");

  useEffect(() => {
    if (!pickedLocation) return;
    setToastText(
      `${pickedLocation.latitude.toFixed(5)}, ${pickedLocation.longitude.toFixed(5)}`,
    );
    setToastOpen(true);
  }, [pickedLocation]);

  return (
    <div
      ref={mapContainer}
      className="relative w-full overflow-hidden rounded-md border border-card-border aspect-[3/2] xs:aspect-[4/3]"
      data-testid="map-interactive"
    >
      <div className="pointer-events-none absolute inset-0 bg-slate-950/10" />
      {pickingLocation ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="relative">
            <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-full rounded-full border-2 border-primary bg-background/90 shadow-lg" />
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 z-20">
        {markerPositions.map((marker) => (
          <button
            key={marker.isPicked ? "picked-location" : marker.id}
            type="button"
            className={`pointer-events-auto absolute h-3.5 w-3.5 rounded-full border-2 border-white shadow-lg transition-transform xs:h-4 xs:w-4 ${getMarkerClassName(marker)}`}
            style={{
              left: `${marker.x}px`,
              top: `${marker.y}px`,
              transform: "translate(-50%, -100%)",
            }}
            onClick={() => {
              if (marker.place) {
                if (
                  marker.place.latitude != null &&
                  marker.place.longitude != null
                ) {
                  flyToLocation(
                    fromLonLat([marker.place.longitude, marker.place.latitude]),
                  );
                }
                onSelect(marker.place.id);
              }
            }}
            aria-label={marker.place ? marker.place.name : "Picked location"}
          />
        ))}
      </div>
      <ToastProvider>
        <ToastViewport className="fixed bottom-[calc(var(--app-floating-offset)+3.5rem)] left-1/2 -translate-x-1/2 w-auto max-w-[calc(100vw-1.5rem)] xs:max-w-[420px] sm:bottom-4" />

        <Toast open={toastOpen} onOpenChange={setToastOpen} duration={3000}>
          <div className="flex flex-col">
            <ToastTitle>Location selected</ToastTitle>
            <ToastDescription>{toastText}</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
      </ToastProvider>
      {pickingLocation ? (
        <div className="pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-full bg-background/90 px-2.5 py-0.5 text-[11px] font-medium text-foreground shadow-lg backdrop-blur-sm xs:top-4 xs:px-3 xs:py-1 xs:text-xs">
          Center the map on the location and confirm it.
        </div>
      ) : null}
      <div className="absolute bottom-2 left-2 rounded bg-background/70 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm z-50 pointer-events-none">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}
