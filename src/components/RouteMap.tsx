import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { GpxPoint } from "@/lib/gpx";

interface Props {
  points: GpxPoint[];
}

export function RouteMap({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView([0, 0], 2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }

      if (points.length > 1) {
        const latlngs = points.map((p) => [p.lat, p.lon] as [number, number]);
        const line = L.polyline(latlngs, {
          color: "#22c55e",
          weight: 4,
          opacity: 0.9,
        }).addTo(mapRef.current);
        layerRef.current = line;
        mapRef.current.fitBounds(line.getBounds(), { padding: [24, 24] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [points]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-xl border border-border bg-muted"
    />
  );
}
