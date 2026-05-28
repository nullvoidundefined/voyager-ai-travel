interface MockRequest {
  params: Record<string, string>;
  body: Record<string, unknown>;
  user: { id: string };
  socket: { setTimeout: (ms: number) => void };
  on: (event: string, handler: () => void) => void;
}

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  chunks: string[];
  ended: boolean;
  writeHead: (status: number, headers: Record<string, string>) => void;
  write: (chunk: string) => boolean;
  end: () => void;
  flushHeaders: () => void;
  setTimeout: (ms: number) => void;
  flush: () => void;
  status: (code: number) => MockResponse;
  json: (data: unknown) => void;
  jsonData: unknown;
}

export function createMockReq(
  tripId: string,
  userId: string,
  message: string,
  planConfirmation?: Record<string, unknown>,
): MockRequest {
  return {
    params: { id: tripId },
    body: planConfirmation ? { message, planConfirmation } : { message },
    user: { id: userId },
    socket: { setTimeout: () => {} },
    on: () => {},
  };
}

export function createMockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    chunks: [],
    ended: false,
    jsonData: null,
    writeHead(status, headers) {
      res.statusCode = status;
      res.headers = { ...res.headers, ...headers };
    },
    write(chunk: string) {
      res.chunks.push(chunk);
      return true;
    },
    end() {
      res.ended = true;
    },
    flushHeaders() {},
    setTimeout() {},
    flush() {},
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.jsonData = data;
    },
  };
  return res;
}

export interface ParsedSSEEvent {
  type: string;
  data: Record<string, unknown>;
}

export function parseSSEChunks(chunks: string[]): ParsedSSEEvent[] {
  const events: ParsedSSEEvent[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split('\n');
    let eventType = '';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) eventType = line.slice(7);
      if (line.startsWith('data: ')) data = line.slice(6);
    }
    if (eventType && data) {
      try {
        events.push({
          type: eventType,
          data: JSON.parse(data) as Record<string, unknown>,
        });
      } catch {
        // Skip malformed events
      }
    }
  }
  return events;
}
