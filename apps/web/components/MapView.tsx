"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapMarker {
  id: string;
  lon: number;
  lat: number;
  color: string;
  label?: string;
  size?: number;
  onClick?: () => void;
}

interface MapViewProps {
  bbox?: [number, number, number, number];
  markers?: MapMarker[];
  className?: string;
  interactive?: boolean;
}

// Self-styled dark basemap over MapLibre's free, no-key demo vector tiles
// (country polygons + centroids) — no third-party API key required, and full
// control over the "mission control" palette.
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    maplibre: { type: "vector", url: "https://demotiles.maplibre.org/tiles/tiles.json" },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#05070d" } },
    {
      id: "countries-fill",
      type: "fill",
      source: "maplibre",
      "source-layer": "countries",
      paint: { "fill-color": "#0f1526" },
    },
    {
      id: "countries-boundary",
      type: "line",
      source: "maplibre",
      "source-layer": "countries",
      paint: { "line-color": "#1e2740", "line-width": 1 },
    },
    {
      id: "countries-label",
      type: "symbol",
      source: "maplibre",
      "source-layer": "centroids",
      layout: {
        "text-field": "{NAME}",
        "text-font": ["Open Sans Semibold"],
        "text-size": 11,
      },
      paint: { "text-color": "#5b6478", "text-halo-color": "#05070d", "text-halo-width": 1 },
      minzoom: 1.5,
    },
  ],
};

export function MapView({ bbox, markers = [], className = "", interactive = true }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [20, 15],
      zoom: 1.3,
      interactive,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bbox) return;
    const apply = () =>
      map.fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { padding: 48, duration: 900 }
      );
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [bbox]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const place = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      markers.forEach((m) => {
        const el = document.createElement("div");
        el.style.width = `${m.size ?? 10}px`;
        el.style.height = `${m.size ?? 10}px`;
        el.style.borderRadius = "999px";
        el.style.background = m.color;
        el.style.boxShadow = `0 0 0 4px ${m.color}33, 0 0 12px 2px ${m.color}88`;
        el.style.cursor = m.onClick ? "pointer" : "default";
        if (m.onClick) el.addEventListener("click", m.onClick);
        const marker = new maplibregl.Marker({ element: el }).setLngLat([m.lon, m.lat]);
        if (m.label) {
          marker.setPopup(
            new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
              `<div style="font-family:Inter,sans-serif;font-size:12px;color:#0b0f1a">${m.label}</div>`
            )
          );
        }
        marker.addTo(map);
        markersRef.current.push(marker);
      });
    };

    if (map.loaded()) place();
    else map.once("load", place);
  }, [markers]);

  return <div ref={containerRef} className={`${className}`} />;
}
