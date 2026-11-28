/** A requirement ID such as `HEALTH-1`. */
const ID = String.raw`[A-Z][A-Z0-9]*-\d+`;

export interface SpecIds {
  status: string | undefined;
  /** Live requirement IDs. Struck-through (retired) ones are left out. */
  ids: string[];
  /** Live IDs whose heading ends in `[draft]`: not approved yet. */
  drafts: string[];
}

/** Reads the status and requirement IDs from one spec's Markdown. */
export function idsFromSpec(markdown: string): SpecIds {
  const status = /^status:\s*(\S+)/m.exec(markdown)?.[1];
  const headings = [
    ...markdown.matchAll(new RegExp(String.raw`^###\s+(${ID}):(.*)$`, "gm")),
  ];
  const ids = headings.map((match) => match[1] ?? "");
  const drafts = headings
    .filter((match) => /\[draft\]\s*$/.test(match[2] ?? ""))
    .map((match) => match[1] ?? "");
  return { status, ids, drafts };
}

/**
 * The requirement IDs of one spec that tests may be written for: every live
 * ID of an approved spec, except those still marked `[draft]`.
 */
export function approvedIds(markdown: string): string[] {
  const { status, ids, drafts } = idsFromSpec(markdown);
  return status === "approved" ? ids.filter((id) => !drafts.includes(id)) : [];
}

/**
 * Reads the requirement IDs that test names start with, e.g.
 * it("API-2: ..."), test("HEALTH-1: ..."), it.each(cases)("CHK-4: ...").
 * IDs in other strings are ignored.
 */
export function idsFromTestSource(source: string): string[] {
  const testName = new RegExp(
    String.raw`(?:\b(?:it|test|describe)(?:\.\w+)*|\))\(\s*["'\`](${ID}):`,
    "g",
  );
  return [...source.matchAll(testName)].map((match) => match[1] ?? "");
}

/** The requirement ID a test title starts with, if any. */
export function idFromTitle(title: string): string | undefined {
  return new RegExp(String.raw`^(${ID}):`).exec(title)?.[1];
}

export interface IdProblems {
  /** In an approved spec, but no test names it. */
  untested: string[];
  /** Named by a test, but not a live requirement in an approved spec. */
  unknown: string[];
}

/** Compares approved requirement IDs with the IDs tests name. */
export function compareIds(
  approved: Iterable<string>,
  tested: Iterable<string>,
): IdProblems {
  const approvedSet = new Set(approved);
  const testedSet = new Set(tested);
  return {
    untested: [...approvedSet].filter((id) => !testedSet.has(id)).sort(),
    unknown: [...testedSet].filter((id) => !approvedSet.has(id)).sort(),
  };
}
