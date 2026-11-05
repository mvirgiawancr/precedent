// Pure decision logic. No Forge imports on purpose: this file is testable with plain node.
// ponytail: keyword+verb matching, no embeddings. Upgrade to scored retrieval if precision drops.

const DECISION_PREFIX = /^\s*(?:decision|decided|adr)\s*[:\-—]\s*/i;
const REJECTION = /\b(?:rejected|instead of|we chose|we decided|we agreed|rather than)\b/i;

/** A comment or page becomes a candidate decision only if it says so explicitly. */
export function isDecisionText(text) {
  if (!text) return false;
  const firstLine = String(text).trim().split('\n')[0];
  return DECISION_PREFIX.test(firstLine) || /\bdecision\b/i.test(firstLine);
}

/** "Decision: we go OIDC via the internal IdP." -> { statement, rationale } */
export function parseDecision(text) {
  const clean = String(text ?? '').trim();
  const body = clean.replace(DECISION_PREFIX, '');
  const sentences = body.split(/(?<=[.!?])\s+/).filter(Boolean);
  const statement = (sentences[0] ?? body).trim();
  const rationale = sentences.slice(1).join(' ').trim() || null;
  return { statement, rationale };
}

const STOP = new Set(
  'the a an and or of to for in on with via not we our is are be this that it as at from by do does'.split(' ')
);

export function keywords(text) {
  return new Set(
    String(text ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  );
}

const CHANGE_VERBS = /\b(?:replace|swap|remove|drop|migrate|switch|retire|deprecate|abandon|roll back|revert|disable)\b/i;

/**
 * Does this issue run against a binding decision?
 * Returns { verdict: 'contradicts' | 'related' | 'unrelated', reason }.
 * Never claims a contradiction without both scope overlap and a change verb.
 */
export function compare(decision, issue) {
  const decisionWords = keywords(
    [decision.statement, decision.rationale, ...(decision.scope?.keywords ?? [])].join(' ')
  );
  const issueWords = keywords([issue.summary, issue.description].join(' '));

  const shared = [...issueWords].filter((w) => decisionWords.has(w));
  const sameProject = (decision.scope?.projectKeys ?? []).includes(issue.projectKey);
  const sameComponent = (decision.scope?.components ?? []).some((c) =>
    (issue.components ?? []).includes(c)
  );

  if (!sameProject && !sameComponent) {
    return { verdict: 'unrelated', reason: 'different project and component' };
  }

  if (decision.state !== 'binding') {
    return { verdict: 'unrelated', reason: `decision is ${decision.state}` };
  }

  const overlap = shared.length;
  const changing = CHANGE_VERBS.test(issue.summary ?? '');
  const reason =
    `shares ${overlap} term(s) [${shared.slice(0, 4).join(', ')}] with ${decision.id}` +
    (changing ? ' and proposes a change' : '');

  // A project is too coarse a scope: every issue in it would match every decision in it,
  // and the panel would never be quiet. Related needs a shared term, not just a shared project.
  if (overlap === 0) {
    return { verdict: 'unrelated', reason: 'same project, no shared terms' };
  }

  if (changing) return { verdict: 'contradicts', reason };

  return { verdict: 'related', reason };
}

/** Rank decisions for an issue; contradictions first. */
export function rank(decisions, issue) {
  const order = { contradicts: 0, related: 1, unrelated: 2 };
  return decisions
    .map((d) => ({ decision: d, ...compare(d, issue) }))
    .filter((r) => r.verdict !== 'unrelated')
    .sort((a, b) => order[a.verdict] - order[b.verdict]);
}

export function nextId(existing, prefix) {
  const word = String(prefix ?? 'DEC').toUpperCase().slice(0, 8);
  const year = new Date().getFullYear();
  const used = existing.filter((id) => id.startsWith(`${word}-${year}-`)).length;
  return `${word}-${year}-${String(used + 1).padStart(2, '0')}`;
}
