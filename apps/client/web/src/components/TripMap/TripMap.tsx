'use client';

import { useEffect, useRef } from 'react';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

import styles from './TripMap.module.scss';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: 'hotel' | 'experience' | 'leg';
}

interface TripMapProps {
  pins: MapPin[];
  center?: [number, number];
  zoom?: number;
}

const PIN_COLORS: Record<MapPin['type'], string> = {
  hotel: '#005f8e',
  experience: '#d4882a',
  leg: '#2a7d4f',
};

export function TripMap({ pins, center, zoom = 11 }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;

    let cancelled = false;

    setOptions({ key: apiKey, v: 'weekly' });

    void (async () => {
      const { Map } = await importLibrary('maps');
      if (cancelled || !containerRef.current) return;

      const defaultCenter =
        center != null
          ? { lat: center[1], lng: center[0] }
          : pins.length > 0
            ? { lat: pins[0].lat, lng: pins[0].lng }
            : { lat: 20, lng: 0 };

      const map = new Map(containerRef.current, {
        center: defaultCenter,
        zoom,
        mapId: 'DEMO_MAP_ID',
        disableDefaultUI: true,
        zoomControl: true,
      });

      mapRef.current = map;

      if (pins.length === 0) return;

      const { AdvancedMarkerElement } = await importLibrary('marker');
      if (cancelled) return;

      for (const pin of pins) {
        const dot = document.createElement('div');
        dot.style.cssText = `
          background:${PIN_COLORS[pin.type]};
          width:14px;height:14px;
          border-radius:50%;
          border:2px solid #fff;
          box-shadow:0 1px 3px rgba(0,0,0,.4);
        `;

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: pin.lat, lng: pin.lng },
          content: dot,
          title: pin.label,
        });

        markersRef.current.push(marker);
      }
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => {
        m.map = null;
      });
      markersRef.current = [];
      mapRef.current = null;
    };
  }, [pins, center, zoom, apiKey]);

  if (!apiKey) {
    return (
      <div data-testid='trip-map' className={styles.unavailable}>
        <p>Map unavailable: Google Maps API key not configured.</p>
      </div>
    );
  }

  return (
    <div data-testid='trip-map' ref={containerRef} className={styles.map} />
  );
}
