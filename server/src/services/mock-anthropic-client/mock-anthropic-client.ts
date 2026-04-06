import type Anthropic from '@anthropic-ai/sdk';

/**
 * Deterministic mock of the @anthropic-ai/sdk client used by the
 * AgentOrchestrator. Returns a single end_turn response with a
 * fixed text message and zero tool calls so the orchestrator
 * loop terminates after one iteration.
 *
 * Goal: let the E2E suite boot the server and exercise the chat
 * surface without burning Anthropic tokens or requiring an API
 * key in CI. The mock satisfies the subset of the SDK interface
 * actually consumed by AgentOrchestrator.run():
 *
 *   client.messages.stream(params)
 *     .on('text', cb)
 *     .finalMessage() -> { content, stop_reason, usage }
 *
 * Anything else (non-streaming messages.create, tool_use blocks,
 * multi-turn iteration) is intentionally not supported. If a new
 * code path needs more, extend this mock instead of branching
 * inside the orchestrator.
 */

const MOCK_RESPONSE_TEXT =
  'This is a mock response from the E2E_MOCK_ANTHROPIC test stub. The real agent loop is bypassed in this run.';

interface MockStreamListeners {
  text: Array<(chunk: string) => void>;
}

class MockMessageStream {
  private readonly listeners: MockStreamListeners = { text: [] };

  on(event: 'text', cb: (chunk: string) => void): this {
    if (event === 'text') {
      this.listeners.text.push(cb);
    }
    return this;
  }

  async finalMessage(): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    stop_reason: 'end_turn';
    usage: { input_tokens: number; output_tokens: number };
  }> {
    // Emit the text in word-sized chunks so any consumer that
    // listens for text deltas observes a realistic streaming pattern.
    for (const word of MOCK_RESPONSE_TEXT.split(' ')) {
      for (const cb of this.listeners.text) {
        cb(`${word} `);
      }
    }

    return {
      content: [{ type: 'text', text: MOCK_RESPONSE_TEXT }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 0, output_tokens: MOCK_RESPONSE_TEXT.length },
    };
  }
}

export class MockAnthropicClient {
  messages = {
    stream: (_params: unknown): MockMessageStream => new MockMessageStream(),
  };
}

/**
 * True when the server should swap the real Anthropic SDK for the
 * deterministic mock. Recognized only as the literal string '1'
 * to avoid accidental activation from truthy strings.
 */
export function isAnthropicMockMode(): boolean {
  return process.env.E2E_MOCK_ANTHROPIC === '1';
}

/**
 * Returns a mock client when E2E_MOCK_ANTHROPIC=1, otherwise
 * undefined. Callers should fall back to constructing a real
 * Anthropic client when this returns undefined.
 *
 * The return type is cast to `Anthropic` because the orchestrator's
 * config field is typed against the real SDK class. The mock only
 * implements the subset of methods the orchestrator actually calls;
 * any other access at runtime is a programming error and should
 * crash loudly.
 */
export function getMockAnthropicClientIfEnabled(): Anthropic | undefined {
  if (!isAnthropicMockMode()) {
    return undefined;
  }
  return new MockAnthropicClient() as unknown as Anthropic;
}
