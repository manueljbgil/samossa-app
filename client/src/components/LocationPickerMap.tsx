import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import XYZ from "ol/source/XYZ";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat, toLonLat } from "ol/proj";
import Style from "ol/style/Style";
import Circle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import "ol/ol.css";

type LocationPoint = {
  latitude: number;
  longitude: number;
};

type Props = {
  value?: LocationPoint | null;
  onChange: (location: LocationPoint) => void;
};

const getMarkerStyle = () =>
  new Style({
    image: new Circle({
      radius: 12,
      fill: new Fill({ color: "hsl(var(--primary) / 0.96)" }),
      stroke: new Stroke({
        color: "hsl(var(--background))",
        width: 3,
      }),
    }),
  });

export function LocationPickerMap({ value, onChange }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 1000,
    });

    const map = new Map({
      target: mapContainer.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            attributions: "© OpenStreetMap contributors",
          }),
        }),
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([0, 0]),
        zoom: 2,
      }),
    });

    map.on("click", (e) => {
      const [longitude, latitude] = toLonLat(e.coordinate);
      onChange({ latitude, longitude });
    });

    mapRef.current = map;
    const resizeMap = () => {
      map.updateSize();
    };
    window.requestAnimationFrame(() => setTimeout(resizeMap, 100));

    return () => map.setTarget(undefined);
  }, [onChange]);

  useEffect(() => {
    const map = mapRef.current;
    const vectorSource = vectorSourceRef.current;
    if (!map || !vectorSource) return;

    map.updateSize();
    vectorSource.clear();
    if (!value) return;

    const feature = new Feature({
      geometry: new Point(fromLonLat([value.longitude, value.latitude])),
    });
    feature.setStyle(getMarkerStyle());
    vectorSource.addFeature(feature);

    map.getView().animate({
      center: fromLonLat([value.longitude, value.latitude]),
      duration: 250,
    });
  }, [value]);

  return (
    <div className="overflow-hidden rounded-md border border-card-border">
      <div
        ref={mapContainer}
        className="h-72 w-full"
        data-testid="location-picker-map"
      />
    </div>
  );
}
