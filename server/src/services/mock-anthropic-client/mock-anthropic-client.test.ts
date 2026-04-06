import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MockAnthropicClient,
  isAnthropicMockMode,
} from './mock-anthropic-client.js';

describe('MockAnthropicClient', () => {
  it('exposes a messages.stream method that satisfies the orchestrator interface', () => {
    const client = new MockAnthropicClient();
    expect(typeof client.messages.stream).toBe('function');
  });

  it('streams a deterministic end_turn response with text content', async () => {
    const client = new MockAnthropicClient();
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'test',
      tools: [],
      messages: [{ role: 'user', content: 'Hi' }],
    });

    const finalMessage = await stream.finalMessage();

    expect(finalMessage.stop_reason).toBe('end_turn');
    expect(finalMessage.content).toHaveLength(1);
    expect(finalMessage.content[0]?.type).toBe('text');
    expect(finalMessage.usage.input_tokens).toBe(0);
    expect(finalMessage.usage.output_tokens).toBeGreaterThan(0);
  });

  it('emits text events to listeners registered via .on()', async () => {
    const client = new MockAnthropicClient();
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'test',
      tools: [],
      messages: [{ role: 'user', content: 'Hi' }],
    });

    const seen: string[] = [];
    stream.on('text', (chunk) => seen.push(chunk));
    await stream.finalMessage();

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.join('')).toContain('mock');
  });

  it('returns a chainable .on() so callers can register multiple listeners fluently', () => {
    const client = new MockAnthropicClient();
    const stream = client.messages.stream({
      model: 'm',
      max_tokens: 1,
      system: '',
      tools: [],
      messages: [],
    });
    const result = stream.on('text', () => {}).on('text', () => {});
    expect(result).toBe(stream);
  });
});

describe('isAnthropicMockMode', () => {
  const ORIGINAL = process.env.E2E_MOCK_ANTHROPIC;

  beforeEach(() => {
    delete process.env.E2E_MOCK_ANTHROPIC;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.E2E_MOCK_ANTHROPIC;
    } else {
      process.env.E2E_MOCK_ANTHROPIC = ORIGINAL;
    }
    vi.unstubAllEnvs();
  });

  it('returns false when the env flag is unset', () => {
    expect(isAnthropicMockMode()).toBe(false);
  });

  it('returns true when E2E_MOCK_ANTHROPIC=1', () => {
    process.env.E2E_MOCK_ANTHROPIC = '1';
    expect(isAnthropicMockMode()).toBe(true);
  });

  it('returns false for any other value', () => {
    process.env.E2E_MOCK_ANTHROPIC = 'true';
    expect(isAnthropicMockMode()).toBe(false);
    process.env.E2E_MOCK_ANTHROPIC = '0';
    expect(isAnthropicMockMode()).toBe(false);
  });
});
