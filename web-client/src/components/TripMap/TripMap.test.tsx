import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TripMap } from './TripMap';

vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(),
    })),
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      setPopup: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
    Popup: vi.fn().mockImplementation(() => ({
      setHTML: vi.fn().mockReturnThis(),
    })),
  },
}));

const PINS = [
  {
    id: '1',
    lat: 40.71,
    lng: -74.01,
    label: 'Hotel Alpha',
    type: 'hotel' as const,
  },
  {
    id: '2',
    lat: 40.75,
    lng: -73.99,
    label: 'Central Park',
    type: 'experience' as const,
  },
];

describe('TripMap', () => {
  it('renders the map container when token is set', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_token';
    render(<TripMap pins={PINS} />);
    expect(screen.getByTestId('trip-map')).toBeInTheDocument();
  });

  it('renders a fallback message when no token is present', () => {
    const original = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    render(<TripMap pins={PINS} />);
    expect(screen.getByText(/map unavailable/i)).toBeInTheDocument();
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = original;
  });
});
