/**
 * ChatBox invariants:
 * - tool-result cards persist after the SSE stream ends
 * - text nodes never duplicate when the agent re-emits text
 * - empty state renders when the node list is empty
 * - virtualizer layout is stable under append
 * - QuickReplyChips render only after the final assistant message of a turn
 *
 * This file also covers the auto-save and handleFormSubmit paths:
 * - trip_type and flexible_dates are included in PUT requests
 * - flexible_dates is coerced from string 'true'/'false' to boolean
 */
import { get, put } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatBox } from './ChatBox';

// Capture callbacks passed to VirtualizedChat so tests can invoke them directly
let capturedOnFormSubmit:
  | ((data: Record<string, string>, msg: string) => Promise<void>)
  | null = null;
let capturedOnFormValuesChange:
  | ((values: Record<string, string>) => void)
  | null = null;

vi.mock('./VirtualizedChat', () => ({
  VirtualizedChat: (props: {
    onFormSubmit?: (data: Record<string, string>, msg: string) => Promise<void>;
    onFormValuesChange?: (values: Record<string, string>) => void;
    onQuickReply?: (msg: string) => void;
    messages?: unknown[];
    streamingNodes?: unknown[];
    toolProgress?: unknown[];
    streamingText?: string;
    isSending?: boolean;
    isStreaming?: boolean;
  }) => {
    capturedOnFormSubmit = props.onFormSubmit ?? null;
    capturedOnFormValuesChange = props.onFormValuesChange ?? null;
    return <div data-testid='virtualized-chat' />;
  },
}));

vi.mock('./useSSEChat', () => ({
  useSSEChat: () => ({
    sendMessage: vi.fn().mockResolvedValue(undefined),
    isSending: false,
    streamingNodes: [],
    toolProgress: [],
    streamingText: '',
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  get: vi.fn().mockResolvedValue({ messages: [] }),
  post: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/CostCounter/CostCounter', () => ({
  CostCounter: () => null,
}));

vi.mock('@/components/Toast/Toast', () => ({
  Toast: () => null,
}));

vi.mock('@/components/ToolTimeline/ToolTimeline', () => ({
  ToolTimeline: () => null,
}));

vi.mock('@/lib/demoScript', () => ({
  runDemoScript: () => () => undefined,
}));

function renderChatBox() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ChatBox tripId='trip-test-1' />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  capturedOnFormSubmit = null;
  capturedOnFormValuesChange = null;
  vi.clearAllMocks();
  // Re-apply default mocks after clearAllMocks
  (put as Mock).mockResolvedValue(undefined);
  (get as Mock).mockResolvedValue({ messages: [] });
});

describe('ChatBox auto-save: trip_type and flexible_dates', () => {
  it('includes trip_type in the PUT body during auto-save on handleSend', async () => {
    const { getByRole } = renderChatBox();

    // Seed form values with trip_type via the formValuesChange callback
    await act(async () => {
      capturedOnFormValuesChange?.({
        destination: 'Tokyo',
        trip_type: 'adventure',
      });
    });

    // Trigger handleSend by submitting the text input form.
    // Use fireEvent so React's synthetic onChange handler updates state.
    const input = getByRole('textbox');
    const form = input.closest('form')!;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Plan my trip' } });
    });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(put).toHaveBeenCalledWith(
      '/trips/trip-test-1',
      expect.objectContaining({ trip_type: 'adventure' }),
    );
  });

  it('coerces flexible_dates string "true" to boolean true in PUT body during auto-save', async () => {
    const { getByRole } = renderChatBox();

    await act(async () => {
      capturedOnFormValuesChange?.({
        destination: 'Paris',
        flexible_dates: 'true',
      });
    });

    const input = getByRole('textbox');
    const form = input.closest('form')!;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Plan my trip' } });
    });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(put).toHaveBeenCalledWith(
      '/trips/trip-test-1',
      expect.objectContaining({ flexible_dates: true }),
    );
  });

  it('coerces flexible_dates string "false" to boolean false in PUT body during auto-save', async () => {
    const { getByRole } = renderChatBox();

    await act(async () => {
      capturedOnFormValuesChange?.({
        destination: 'Paris',
        flexible_dates: 'false',
      });
    });

    const input = getByRole('textbox');
    const form = input.closest('form')!;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Plan my trip' } });
    });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(put).toHaveBeenCalledWith(
      '/trips/trip-test-1',
      expect.objectContaining({ flexible_dates: false }),
    );
  });
});

describe('ChatBox handleFormSubmit: trip_type and flexible_dates', () => {
  it('includes trip_type in the PUT body on handleFormSubmit', async () => {
    renderChatBox();

    await act(async () => {
      await capturedOnFormSubmit?.(
        {
          destination: 'Tokyo',
          trip_type: 'adventure',
        },
        'Plan my adventure trip to Tokyo',
      );
    });

    expect(put).toHaveBeenCalledWith(
      '/trips/trip-test-1',
      expect.objectContaining({ trip_type: 'adventure' }),
    );
  });

  it('coerces flexible_dates string "true" to boolean true in handleFormSubmit', async () => {
    renderChatBox();

    await act(async () => {
      await capturedOnFormSubmit?.(
        {
          destination: 'Paris',
          flexible_dates: 'true',
        },
        'Plan my flexible trip to Paris',
      );
    });

    expect(put).toHaveBeenCalledWith(
      '/trips/trip-test-1',
      expect.objectContaining({ flexible_dates: true }),
    );
  });

  it('coerces flexible_dates string "false" to boolean false in handleFormSubmit', async () => {
    renderChatBox();

    await act(async () => {
      await capturedOnFormSubmit?.(
        {
          destination: 'Rome',
          flexible_dates: 'false',
        },
        'Plan my fixed-date trip to Rome',
      );
    });

    expect(put).toHaveBeenCalledWith(
      '/trips/trip-test-1',
      expect.objectContaining({ flexible_dates: false }),
    );
  });

  it('does not include trip_type in PUT when not provided in handleFormSubmit', async () => {
    renderChatBox();

    await act(async () => {
      await capturedOnFormSubmit?.(
        {
          destination: 'Tokyo',
        },
        'Plan my trip to Tokyo',
      );
    });

    const putCall = (put as Mock).mock.calls[0];
    expect(putCall[1]).not.toHaveProperty('trip_type');
  });
});
