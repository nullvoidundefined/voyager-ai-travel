import { describe, expect, it } from 'vitest';

import { DESTINATIONS } from '../../data/destinations';
import { getDestinationImage } from './destinationImage';

describe('getDestinationImage', () => {
  it('returns the correct slug URL for a curated destination by name', () => {
    const result = getDestinationImage('Tokyo');
    expect(result.url).toBe('/images/destinations/tokyo.jpg');
  });

  it('is case-insensitive', () => {
    expect(getDestinationImage('TOKYO')).toEqual(getDestinationImage('tokyo'));
    expect(getDestinationImage('Tokyo')).toEqual(getDestinationImage('tokyo'));
  });

  it('returns null url for an unknown city', () => {
    const result = getDestinationImage('Atlantis');
    expect(result.url).toBeNull();
  });

  it('returns a non-null URL for every curated destination', () => {
    for (const dest of DESTINATIONS) {
      const result = getDestinationImage(dest.name);
      expect(result.url, `Expected non-null for ${dest.name}`).not.toBeNull();
    }
  });

  it('handles extended cities not in DESTINATIONS', () => {
    const result = getDestinationImage('Chicago');
    expect(result.url).toBe('/images/destinations/chicago.jpg');
  });
});
