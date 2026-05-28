import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TripMap } from './TripMap';

const { mockMapboxgl } = vi.hoisted(() => {
  const mapInstance = {
    on: vi.fn(),
    remove: vi.fn(),
  };
  const mapboxgl = {
    accessToken: '',
    Map: vi.fn().mockImplementation(() => mapInstance),
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      setPopup: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
    Popup: vi.fn().mockImplementation(() => ({
      setHTML: vi.fn().mockReturnThis(),
    })),
  };
  return { mockMapInstance: mapInstance, mockMapboxgl: mapboxgl };
});

vi.mock('mapbox-gl', () => ({
  default: mockMapboxgl,
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockMapboxgl.accessToken = '';
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-mapbox-token';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  });

  it('renders the map container when API key is set', () => {
    render(<TripMap pins={PINS} />);
    expect(screen.getByTestId('trip-map')).toBeInTheDocument();
  });

  it('renders a fallback message when no API key is present', () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    render(<TripMap pins={[]} />);
    expect(screen.getByText(/map unavailable/i)).toBeInTheDocument();
  });

  it('sets the Mapbox accessToken from the env var before initializing the map', async () => {
    render(<TripMap pins={[]} />);
    await waitFor(() => expect(mockMapboxgl.Map).toHaveBeenCalled());
    expect(mockMapboxgl.accessToken).toBe('test-mapbox-token');
  });

  it('creates a Mapbox Map instance with the correct style', async () => {
    render(<TripMap pins={[]} />);
    await waitFor(() => expect(mockMapboxgl.Map).toHaveBeenCalled());
    expect(mockMapboxgl.Map).toHaveBeenCalledWith(
      expect.objectContaining({
        style: 'mapbox://styles/mapbox/streets-v12',
      }),
    );
  });
});
