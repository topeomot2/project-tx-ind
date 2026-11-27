import { idFromTitle } from "./spec-ids.ts";

export type FailureKind = "assertion" | "not-implemented" | "other";

/** Why a test failed, from its failure messages. */
export function classifyFailure(messages: readonly string[]): FailureKind {
  const text = messages.join("\n");
  if (/\bNotImplemented\b/.test(text)) {
    return "not-implemented";
  }
  if (/\bAssertionError\b/.test(text)) {
    return "assertion";
  }
  return "other";
}

export interface TestResult {
  title: string;
  status: string;
  failureMessages: string[];
}

/**
 * Checks that every new requirement's test fails, and for an acceptable
 * reason (an assertion, or the NotImplemented stub). Returns the problems.
 */
export function redProblems(
  newIds: ReadonlySet<string>,
  results: readonly TestResult[],
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    const id = idFromTitle(result.title);
    if (id === undefined || !newIds.has(id)) {
      continue;
    }
    seen.add(id);
    if (result.status === "passed") {
      problems.push(`${result.title}: passes before any implementation exists`);
    } else if (classifyFailure(result.failureMessages) === "other") {
      const reason = result.failureMessages[0]?.split("\n")[0] ?? "no message";
      problems.push(`${result.title}: fails for the wrong reason: ${reason}`);
    }
  }

  for (const id of newIds) {
    if (!seen.has(id)) {
      problems.push(`${id}: no test with this ID ran`);
    }
  }
  return problems;
}
