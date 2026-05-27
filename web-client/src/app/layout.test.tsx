import { describe, expect, it } from 'vitest';

import { metadata } from './layout';

describe('layout metadata', () => {
  it('title uses pipe separator', () => {
    const title = typeof metadata.title === 'string' ? metadata.title : '';
    expect(title).toContain(' | ');
  });
});
