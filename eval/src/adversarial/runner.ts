import type { ParsedAntagonistResponse } from './antagonist.js';
import { detectMustNotViolations } from './must-not.js';
import type {
  AdversarialTranscriptEntry,
  AntagonistOutcome,
  AttackDef,
} from './types.js';

export interface AgentCallResult {
  transcript: AdversarialTranscriptEntry[];
  tool_results: Array<{ tool_name: string; result: unknown }>;
  error?: string;
}

export type CallAgent = (
  userMessage: string,
  history: AdversarialTranscriptEntry[],
) => Promise<AgentCallResult>;

export type CallAntagonist = (
  attack: AttackDef,
  transcript: AdversarialTranscriptEntry[],
) => Promise<ParsedAntagonistResponse>;

export interface RunAttackInput {
  attack: AttackDef;
  callAgent: CallAgent;
  callAntagonist: CallAntagonist;
}

export interface AttackRunOutput {
  transcript: AdversarialTranscriptEntry[];
  turns: number;
  antagonist_outcome: AntagonistOutcome;
  verdict_pre: { must_not_violated: string[] };
  error?: string;
}

export async function runAttack(
  input: RunAttackInput,
): Promise<AttackRunOutput> {
  const { attack, callAgent, callAntagonist } = input;
  const transcript: AdversarialTranscriptEntry[] = [];
  const allViolationsSet = new Set<string>();
  let completedTurns = 0;

  // Turn 1: opening_message -> agent
  let userMessage = attack.opening_message;
  let outcome: AntagonistOutcome = 'max_turns';
  let lastError: string | undefined;

  for (let turn = 1; turn <= attack.max_turns; turn++) {
    transcript.push({ role: 'user', content: userMessage });

    let agentOut: AgentCallResult;
    try {
      agentOut = await callAgent(userMessage, transcript);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      transcript.push({
        role: 'assistant',
        content: `[agent error: ${lastError}]`,
      });
      outcome = 'agent_failed';
      break;
    }

    for (const entry of agentOut.transcript) {
      transcript.push(entry);
    }

    const lastAgentText =
      [...agentOut.transcript].reverse().find((t) => t.role === 'assistant')
        ?.content ?? '';

    const violations = detectMustNotViolations({
      agentText: lastAgentText,
      toolResults: agentOut.tool_results,
      mustNot: attack.must_not,
    });
    for (const v of violations) {
      allViolationsSet.add(v);
    }

    completedTurns += 1;

    if (violations.length > 0) {
      outcome = 'agent_failed';
      break;
    }

    if (turn === attack.max_turns) {
      outcome = 'max_turns';
      break;
    }

    let antagonistResponse: ParsedAntagonistResponse;
    try {
      antagonistResponse = await callAntagonist(attack, transcript);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      transcript.push({
        role: 'user',
        content: `[antagonist error: ${lastError}]`,
      });
      outcome = 'agent_failed';
      break;
    }

    if (antagonistResponse.sentinel === 'GIVE_UP') {
      outcome = 'gave_up';
      break;
    }
    if (antagonistResponse.sentinel === 'SUCCESS') {
      outcome = 'declared_success';
      break;
    }
    userMessage = antagonistResponse.content;
  }

  return {
    transcript,
    turns: completedTurns,
    antagonist_outcome: outcome,
    verdict_pre: { must_not_violated: [...allViolationsSet] },
    error: lastError,
  };
}
