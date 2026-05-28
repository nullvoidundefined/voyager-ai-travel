import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TripMap } from './TripMap';

const mockFetchWithBbox = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    features: [
      {
        center: [-8.22, 39.39],
        bbox: [-9.5, 36.8, -6.2, 42.2],
      },
    ],
  }),
});

const { mockMapboxgl, mockMapInstance } = vi.hoisted(() => {
  const mapInstance = {
    on: vi.fn().mockImplementation((event: string, cb: () => void) => {
      if (event === 'load') cb();
    }),
    fitBounds: vi.fn(),
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

describe('TripMap fitBounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMapboxgl.accessToken = '';
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-mapbox-token';
    vi.stubGlobal('fetch', mockFetchWithBbox);
    // Re-apply the load event firing after clearAllMocks
    mockMapInstance.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'load') cb();
    });
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    vi.unstubAllGlobals();
  });

  it('calls fitBounds with bbox when geocode returns bbox and no pins present', async () => {
    render(<TripMap pins={[]} destinationName='Portugal' />);

    await waitFor(() => expect(mockMapboxgl.Map).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));

    expect(mockMapInstance.fitBounds).toHaveBeenCalledWith(
      [-9.5, 36.8, -6.2, 42.2],
      expect.objectContaining({ padding: 40 }),
    );
  });

  it('does not call fitBounds when pins are present', async () => {
    render(
      <TripMap
        pins={[
          { id: '1', lat: 38.7, lng: -9.1, label: 'Lisbon', type: 'hotel' },
        ]}
        destinationName='Portugal'
      />,
    );

    await waitFor(() => expect(mockMapboxgl.Map).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));

    expect(mockMapInstance.fitBounds).not.toHaveBeenCalled();
  });
});
