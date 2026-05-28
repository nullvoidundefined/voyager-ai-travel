import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TripMap } from './TripMap';

const { mockSetOptions, mockImportLibrary } = vi.hoisted(() => {
  const MockMap = vi.fn().mockImplementation(() => ({}));
  const MockAdvancedMarkerElement = vi
    .fn()
    .mockImplementation(() => ({ map: null }));
  const setOptionsFn = vi.fn();
  const importLibraryFn = vi.fn().mockImplementation((lib: string) => {
    if (lib === 'maps') return Promise.resolve({ Map: MockMap });
    if (lib === 'marker')
      return Promise.resolve({
        AdvancedMarkerElement: MockAdvancedMarkerElement,
      });
    return Promise.resolve({});
  });
  return { mockSetOptions: setOptionsFn, mockImportLibrary: importLibraryFn };
});

vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: mockSetOptions,
  importLibrary: mockImportLibrary,
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
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  it('renders the map container when API key is set', () => {
    render(<TripMap pins={PINS} />);
    expect(screen.getByTestId('trip-map')).toBeInTheDocument();
  });

  it('renders a fallback message when no API key is present', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    render(<TripMap pins={[]} />);
    expect(screen.getByText(/map unavailable/i)).toBeInTheDocument();
  });

  it('calls setOptions with v2 property names key and v (not apiKey/version)', async () => {
    render(<TripMap pins={[]} />);
    await waitFor(() => expect(mockSetOptions).toHaveBeenCalled());
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'test-api-key', v: 'weekly' }),
    );
    expect(mockSetOptions).not.toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: expect.anything() }),
    );
    expect(mockSetOptions).not.toHaveBeenCalledWith(
      expect.objectContaining({ version: expect.anything() }),
    );
  });

  it('loads the maps library after setOptions', async () => {
    render(<TripMap pins={[]} />);
    await waitFor(() => expect(mockImportLibrary).toHaveBeenCalledWith('maps'));
  });
});
