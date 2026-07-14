import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { fromLonLat, toLonLat } from "ol/proj";
import { defaults as defaultControls } from "ol/control";
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
  place: PlaceWithStats;
  places?: PlaceWithStats[];
  selectedId?: number | null;
  onGetCenter?: (getCenter: () => LocationPoint | null) => void;
  pickedLocation?: LocationPoint | null;
  pickingLocation?: boolean;
};

export function PlaceMap({
  place,
  places = [],
  selectedId,
  onGetCenter,
  pickedLocation,
  pickingLocation,
}: Props) {
  const [, navigate] = useLocation();
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

  // create map once
  useEffect(() => {
    if (!mapContainer.current) return;
    if (place.latitude == null || place.longitude == null) return;

    if (mapRef.current) {
      mapRef.current.setTarget(undefined);
      mapRef.current = null;
    }

    const map = new Map({
      target: mapContainer.current,
      controls: defaultControls({ attribution: false }),
      layers: [
        new TileLayer({
          source: new XYZ({
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            attributions: "© OpenStreetMap contributors",
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([place.longitude, place.latitude]),
        zoom: 15,
      }),
    });

    map.on("click", (_e) => {
      // Location selection is handled by pressing confirm on the centered map.
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
    setTimeout(() => map.updateSize(), 100);

    return () => {
      map.setTarget(undefined);
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, []);

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
      const allPlaces = places.length > 0 ? places : [place];

      allPlaces.forEach((p) => {
        if (p.latitude == null || p.longitude == null) return;
        const pixel = map.getPixelFromCoordinate(
          fromLonLat([p.longitude, p.latitude]),
        );
        if (!pixel) return;
        positions.push({
          id: p.id,
          x: pixel[0],
          y: pixel[1],
          place: p,
          isSelected: selectedId != null ? p.id === selectedId : false,
          isHovered: hoverId === p.id,
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
    map.on("change:size", updateMarkerPositions);
    map.on("pointerdrag", updateMarkerPositions);
    map.on("change:view", updateMarkerPositions);
    window.addEventListener("resize", updateMarkerPositions);
    updateMarkerPositions();

    return () => {
      map.un("postrender", updateMarkerPositions);
      map.un("moveend", updateMarkerPositions);
      map.un("change:size", updateMarkerPositions);
      map.un("pointerdrag", updateMarkerPositions);
      map.un("change:view", updateMarkerPositions);
      window.removeEventListener("resize", updateMarkerPositions);
    };
  }, [places, selectedId, place, pickedLocation, hoverId]);

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

  // fly-to when selection changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (selectedId == null) return;
    const allPlaces = places.length > 0 ? places : [place];
    const target = allPlaces.find((p) => p.id === selectedId);
    if (!target || target.latitude == null || target.longitude == null) return;
    const dest = fromLonLat([target.longitude, target.latitude]);
    flyToLocation(dest);
  }, [selectedId, places, place]);

  // when a location is picked for a new place, fly to it and show the marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (!pickedLocation) return;
    const dest = fromLonLat([
      pickedLocation.longitude,
      pickedLocation.latitude,
    ]);
    flyToLocation(dest);
  }, [pickedLocation]);

  // toast for picked coordinates
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");

  useEffect(() => {
    if (!pickedLocation) return;
    setToastText(
      `${pickedLocation.latitude.toFixed(5)}, ${pickedLocation.longitude.toFixed(5)}`,
    );
    setToastOpen(true);
  }, [pickedLocation]);

  if (!place.latitude || !place.longitude) {
    return (
      <div className="flex items-center justify-center w-full rounded-md border border-card-border bg-card h-64">
        <p className="text-sm text-muted-foreground">
          Location data not available
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className="relative overflow-hidden min-h-[calc(100svh-var(--app-header-height))] h-[calc(100svh-var(--app-header-height))] sm:min-h-[calc(100dvh-var(--app-header-height))] sm:h-[calc(100dvh-var(--app-header-height))]"
      style={{
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
      }}
      data-testid="map-place-detail"
    >
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
      <div className="pointer-events-none absolute inset-0 bg-slate-950/12" />
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
            onMouseEnter={() => {
              if (marker.place) setHoverId(marker.place.id);
            }}
            onMouseLeave={() => setHoverId(null)}
            onFocus={() => {
              if (marker.place) setHoverId(marker.place.id);
            }}
            onBlur={() => setHoverId(null)}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (marker.place) {
                if (
                  marker.place.latitude != null &&
                  marker.place.longitude != null
                ) {
                  flyToLocation(
                    fromLonLat([marker.place.longitude, marker.place.latitude]),
                  );
                }
                const currentPath = window.location.pathname;
                if (currentPath !== `/${marker.place.id}`) {
                  navigate(`/${marker.place.id}`);
                }
              }
            }}
            aria-label={marker.place ? marker.place.name : "Picked location"}
          />
        ))}
      </div>
      {pickingLocation ? (
        <div className="pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-full bg-background/90 px-2.5 py-0.5 text-[11px] font-medium text-foreground shadow-lg backdrop-blur-sm xs:top-4 xs:px-3 xs:py-1 xs:text-xs">
          Center the map on the location and confirm it.
        </div>
      ) : hoverId != null ? (
        <div className="pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-full bg-slate-950/90 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-lg backdrop-blur-sm xs:top-4 xs:px-3 xs:py-1 xs:text-xs">
          {markerPositions.find((marker) => marker.id === hoverId)?.place
            ?.name ?? ""}
        </div>
      ) : null}
      <div className="absolute bottom-0 left-0 z-50 rounded-t-none rounded-br-md rounded-bl-none bg-background/70 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm pointer-events-none">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}
