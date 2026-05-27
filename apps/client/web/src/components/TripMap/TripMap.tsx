'use client';

import { useEffect, useRef } from 'react';

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
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current) return;

    let cancelled = false;

    void import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (cancelled || !containerRef.current) return;

      (mapboxgl as unknown as { accessToken: string }).accessToken = token;

      const defaultCenter: [number, number] =
        center ?? (pins.length > 0 ? [pins[0].lng, pins[0].lat] : [0, 20]);

      const map = new (
        mapboxgl as unknown as { Map: new (opts: unknown) => unknown }
      ).Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: defaultCenter,
        zoom,
      });

      mapRef.current = map;

      (map as { on: (event: string, cb: () => void) => void }).on(
        'load',
        () => {
          pins.forEach((pin) => {
            const el = document.createElement('div');
            el.style.backgroundColor = PIN_COLORS[pin.type];
            el.style.width = '14px';
            el.style.height = '14px';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid #fff';

            const Popup = (
              mapboxgl as unknown as {
                Popup: new (opts: unknown) => {
                  setHTML: (h: string) => unknown;
                };
              }
            ).Popup;
            const popup = new Popup({ offset: 10 }).setHTML(
              `<strong>${pin.label}</strong>`,
            );

            const Marker = (
              mapboxgl as unknown as {
                Marker: new (opts: unknown) => {
                  setLngLat: (pos: [number, number]) => unknown;
                  setPopup: (p: unknown) => unknown;
                  addTo: (m: unknown) => unknown;
                };
              }
            ).Marker;
            const marker = new Marker({ element: el });
            (
              marker.setLngLat([pin.lng, pin.lat]) as {
                setPopup: (p: unknown) => unknown;
              }
            ).setPopup(popup);
            (marker as unknown as { addTo: (m: unknown) => unknown }).addTo(
              map,
            );
            markersRef.current.push(marker);
          });
        },
      );
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => (m as { remove: () => void }).remove());
      markersRef.current = [];
      if (mapRef.current) (mapRef.current as { remove: () => void }).remove();
      mapRef.current = null;
    };
  }, [pins, center, zoom, token]);

  if (!token) {
    return (
      <div data-testid='trip-map' className={styles.unavailable}>
        <p>Map unavailable: Mapbox token not configured.</p>
      </div>
    );
  }

  return (
    <div data-testid='trip-map' ref={containerRef} className={styles.map} />
  );
}
