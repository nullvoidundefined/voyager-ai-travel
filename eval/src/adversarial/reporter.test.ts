import { describe, expect, it } from 'vitest';

import {
  diffReports,
  formatDiff,
  formatFailureCatalog,
  formatRollupTable,
  rollupByCategory,
  summarize,
} from './reporter.js';
import type {
  AdversarialReport,
  AttackResult,
  Category,
  CategoryRollup,
} from './types.js';

function makeResult(
  attack_id: string,
  category: Category,
  severity: 'P0' | 'P1' | 'P2',
  passed: boolean,
  must_not_violated: string[] = [],
): AttackResult {
  return {
    attack_id,
    category,
    severity,
    turns: 2,
    transcript: [
      { role: 'user', content: 'opening' },
      { role: 'assistant', content: 'response' },
    ],
    verdict: {
      passed,
      must_not_violated,
      refusal_quality: passed ? 'graceful' : 'cave-after-pressure',
      evidence_turns: [1],
      rationale: passed ? 'Refused cleanly.' : 'Caved.',
    },
    antagonist_outcome: passed ? 'gave_up' : 'agent_failed',
  };
}

describe('rollupByCategory', () => {
  it('groups results by category with pass/fail counts and rate', () => {
    const results = [
      makeResult('A1-mars', 'A', 'P0', true),
      makeResult('A2-hogwarts', 'A', 'P0', false, ['hotel_tile in Hogwarts']),
      makeResult('B1-france', 'B', 'P1', true),
    ];
    const rollup = rollupByCategory(results);
    expect(rollup.A).toEqual<CategoryRollup>({
      passed: 1,
      failed: 1,
      pass_rate: 0.5,
      p0_failures: 1,
    });
    expect(rollup.B).toEqual<CategoryRollup>({
      passed: 1,
      failed: 0,
      pass_rate: 1,
      p0_failures: 0,
    });
  });
});

describe('summarize', () => {
  it('aggregates totals, pass rate, and P0 failures', () => {
    const results = [
      makeResult('A1', 'A', 'P0', false),
      makeResult('A2', 'A', 'P0', true),
      makeResult('B1', 'B', 'P1', true),
    ];
    const s = summarize(results);
    expect(s.total).toBe(3);
    expect(s.passed).toBe(2);
    expect(s.failed).toBe(1);
    expect(s.pass_rate).toBeCloseTo(0.67, 1);
    expect(s.p0_failures).toBe(1);
  });
});

describe('formatRollupTable', () => {
  it('renders a single-line-per-category table with totals', () => {
    const results = [
      makeResult('A1', 'A', 'P0', true),
      makeResult('A2', 'A', 'P0', false),
      makeResult('B1', 'B', 'P1', true),
    ];
    const table = formatRollupTable(results);
    expect(table).toContain('A grounding');
    expect(table).toContain('B specificity');
    expect(table).toContain('OVERALL');
  });
});

describe('formatFailureCatalog', () => {
  it('lists only failed attacks with rationale and severity', () => {
    const results = [
      makeResult('A1', 'A', 'P0', true),
      makeResult('A2', 'A', 'P0', false, ['hotel_tile in Hogwarts']),
    ];
    const catalog = formatFailureCatalog(results);
    expect(catalog).toContain('[FAIL] A2');
    expect(catalog).toContain('P0');
    expect(catalog).not.toContain('[FAIL] A1');
  });
});

function makeReport(attacks: AttackResult[]): AdversarialReport {
  return {
    timestamp: '2026-05-28T00:00:00.000Z',
    duration_ms: 1,
    summary: summarize(attacks),
    by_category: rollupByCategory(attacks),
    attacks,
  };
}

describe('diffReports', () => {
  it('detects NEW failures (was pass, now fail)', () => {
    const prev = makeReport([makeResult('A1', 'A', 'P0', true)]);
    const curr = makeReport([makeResult('A1', 'A', 'P0', false)]);
    const diff = diffReports(prev, curr);
    expect(diff.new_failures.map((a) => a.attack_id)).toEqual(['A1']);
    expect(diff.new_passes).toEqual([]);
    expect(diff.persistent_failures).toEqual([]);
  });

  it('detects NEW passes (was fail, now pass)', () => {
    const prev = makeReport([makeResult('A1', 'A', 'P0', false)]);
    const curr = makeReport([makeResult('A1', 'A', 'P0', true)]);
    const diff = diffReports(prev, curr);
    expect(diff.new_passes.map((a) => a.attack_id)).toEqual(['A1']);
  });

  it('detects persistent failures (failed in both)', () => {
    const prev = makeReport([makeResult('A1', 'A', 'P0', false)]);
    const curr = makeReport([makeResult('A1', 'A', 'P0', false)]);
    const diff = diffReports(prev, curr);
    expect(diff.persistent_failures.map((a) => a.attack_id)).toEqual(['A1']);
  });

  it('handles attacks present in only one report (new in catalog)', () => {
    const prev = makeReport([]);
    const curr = makeReport([makeResult('A1', 'A', 'P0', false)]);
    const diff = diffReports(prev, curr);
    expect(diff.new_failures.map((a) => a.attack_id)).toEqual(['A1']);
  });
});

describe('formatDiff', () => {
  it('renders the three buckets with counts', () => {
    const prev = makeReport([makeResult('A1', 'A', 'P0', true)]);
    const curr = makeReport([makeResult('A1', 'A', 'P0', false)]);
    const out = formatDiff(diffReports(prev, curr));
    expect(out).toContain('NEW FAILURES');
    expect(out).toContain('A1');
  });
});
