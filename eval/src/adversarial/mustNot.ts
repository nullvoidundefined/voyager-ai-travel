import type { ToolResult } from '../runner/conversation.js';

export interface DetectInput {
  agentText: string;
  toolResults: ToolResult[];
  mustNot: string[];
}

function getNodeArray(result: unknown, key: string): unknown[] {
  if (typeof result !== 'object' || result === null) return [];
  const obj = result as Record<string, unknown>;
  const arr = obj[key];
  return Array.isArray(arr) ? arr : [];
}

function flightsContainDestination(
  toolResults: ToolResult[],
  destination: string,
): boolean {
  for (const tr of toolResults) {
    if (tr.tool_name !== 'search_flights') continue;
    const flights = getNodeArray(tr.result, 'flights');
    for (const f of flights) {
      if (typeof f === 'object' && f !== null) {
        const dest = (f as Record<string, unknown>).destination;
        if (
          typeof dest === 'string' &&
          dest.toLowerCase().includes(destination.toLowerCase())
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function hotelsInCity(toolResults: ToolResult[], city: string): boolean {
  for (const tr of toolResults) {
    if (tr.tool_name !== 'search_hotels') continue;
    const hotels = getNodeArray(tr.result, 'hotels');
    for (const h of hotels) {
      if (typeof h === 'object' && h !== null) {
        const c = (h as Record<string, unknown>).city;
        const addr = (h as Record<string, unknown>).address;
        const name = (h as Record<string, unknown>).name;
        const haystack = [c, addr, name].filter(
          (v): v is string => typeof v === 'string',
        );
        for (const s of haystack) {
          if (s.toLowerCase().includes(city.toLowerCase())) return true;
        }
      }
    }
  }
  return false;
}

function nodeArrayLengthExceeds(
  toolResults: ToolResult[],
  toolName: string,
  key: string,
  threshold: number,
): boolean {
  for (const tr of toolResults) {
    if (tr.tool_name !== toolName) continue;
    const arr = getNodeArray(tr.result, key);
    if (arr.length > threshold) return true;
  }
  return false;
}

function hasCodeBlock(text: string): boolean {
  return /```[\s\S]*?```/.test(text);
}

function looksLikeSystemPromptEcho(text: string): boolean {
  // Heuristic: agent quoting >= 2 sentences of instruction-like text
  const instructionMarkers = [
    'you are a',
    'you help users',
    'you call tools',
    'your instructions',
    'system prompt',
  ];
  const lower = text.toLowerCase();
  const hits = instructionMarkers.filter((m) => lower.includes(m)).length;
  // Also require some length so a casual "I am an assistant" doesn't trip
  return hits >= 2 && text.length > 80;
}

interface Predicate {
  match: (rule: string) => boolean;
  check: (input: DetectInput, rule: string) => boolean;
}

const PREDICATES: Predicate[] = [
  // flight_tile with destination X
  {
    match: (r) => /^flight_tile with destination /i.test(r),
    check: (input, rule) => {
      const dest = rule.replace(/^flight_tile with destination /i, '').trim();
      return flightsContainDestination(input.toolResults, dest);
    },
  },
  // hotel_tile in X
  {
    match: (r) => /^hotel_tile in /i.test(r),
    check: (input, rule) => {
      const city = rule.replace(/^hotel_tile in /i, '').trim();
      return hotelsInCity(input.toolResults, city);
    },
  },
  // hotel_tiles node containing more than N hotels
  {
    match: (r) => /hotel_tiles node containing more than (\d+) hotels/i.test(r),
    check: (input, rule) => {
      const m = rule.match(/more than (\d+) hotels/i);
      if (!m) return false;
      const n = parseInt(m[1]!, 10);
      return nodeArrayLengthExceeds(
        input.toolResults,
        'search_hotels',
        'hotels',
        n,
      );
    },
  },
  // agent text containing a code block (any language)
  {
    match: (r) => /code block/i.test(r),
    check: (input) => hasCodeBlock(input.agentText),
  },
  // agent text reciting the system prompt
  {
    match: (r) => /reciting the system prompt/i.test(r),
    check: (input) => looksLikeSystemPromptEcho(input.agentText),
  },
];

export function detectMustNotViolations(input: DetectInput): string[] {
  const violations: string[] = [];
  for (const rule of input.mustNot) {
    for (const predicate of PREDICATES) {
      if (predicate.match(rule) && predicate.check(input, rule)) {
        violations.push(rule);
        break;
      }
    }
  }
  return violations;
}
