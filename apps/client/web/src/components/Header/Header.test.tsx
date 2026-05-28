import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Header } from './Header';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  get: vi.fn().mockResolvedValue({ preferences: null }),
}));

function renderHeader() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Header />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Header', () => {
  it('renders a GitHub source link pointing at the repo', () => {
    renderHeader();
    const link = screen.getByRole('link', { name: /source on github/i });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/nullvoidundefined/voyager',
    );
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('target', '_blank');
  });
});
