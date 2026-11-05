import assert from 'node:assert/strict';
import { isDecisionText, parseDecision, compare, rank, nextId } from '../src/lib/decisions.js';

const auth = {
  id: 'AUTH-2026-03',
  statement: 'All new services authenticate with OIDC through the internal IdP.',
  rationale: 'Shared API keys leaked twice in 2025 and have no rotation story.',
  state: 'binding',
  scope: { projectKeys: ['AUTH'], components: ['auth-gateway'], keywords: ['auth', 'token', 'sso'] }
};

// --- capture: only explicit decisions are captured
assert.equal(isDecisionText('Decision: we go OIDC via the internal IdP.'), true);
assert.equal(isDecisionText('The decision was recorded in the wiki.'), true);
assert.equal(isDecisionText('Deployed the fix to staging, looks fine.'), false);
assert.equal(isDecisionText(''), false);
assert.equal(isDecisionText(null), false);

// --- parse: statement is the first sentence, the rest is rationale
const parsed = parseDecision('Decision: we go OIDC. Shared keys leaked twice.');
assert.equal(parsed.statement, 'we go OIDC.');
assert.equal(parsed.rationale, 'Shared keys leaked twice.');

const bare = parseDecision('Decision: 8 hour sessions');
assert.equal(bare.statement, '8 hour sessions');
assert.equal(bare.rationale, null);

// --- contradiction needs scope overlap AND a change verb
assert.equal(
  compare(auth, {
    projectKey: 'AUTH',
    summary: 'Replace OIDC with shared API keys for the gateway',
    description: 'Faster onboarding.',
    components: ['auth-gateway']
  }).verdict,
  'contradicts',
  'reverting a binding decision is a contradiction'
);

// same project, no change verb -> related, never a contradiction
assert.equal(
  compare(auth, {
    projectKey: 'AUTH',
    summary: 'Add SSO login page to the gateway',
    description: 'Auth UI polish.',
    components: []
  }).verdict,
  'related'
);

// same project, no shared term -> unrelated: a project is too coarse a scope to be evidence
assert.equal(
  compare(auth, {
    projectKey: 'AUTH',
    summary: 'Replace the invoice PDF renderer',
    description: 'Slow.',
    components: []
  }).verdict,
  'unrelated',
  'a shared project alone must not put a decision on the panel'
);

// different project -> unrelated, even with loud wording
assert.equal(
  compare(auth, {
    projectKey: 'BILLING',
    summary: 'Replace the invoice PDF renderer',
    description: 'Slow.',
    components: []
  }).verdict,
  'unrelated'
);

// a superseded decision can never be cited as binding
assert.equal(
  compare({ ...auth, state: 'superseded' }, {
    projectKey: 'AUTH',
    summary: 'Replace OIDC with shared API keys',
    description: '',
    components: []
  }).verdict,
  'unrelated'
);

// --- rank puts contradictions first and drops noise
const ranked = rank(
  [
    { ...auth, id: 'AUTH-2026-09', statement: 'Session lifetime is 8 hours.', scope: { projectKeys: ['AUTH'], components: [], keywords: ['session'] } },
    auth
  ],
  { projectKey: 'AUTH', summary: 'Replace OIDC with shared API keys', description: '', components: [] }
);
assert.equal(ranked[0].verdict, 'contradicts');
assert.ok(ranked.length <= 2);

// --- ids are sequential per project prefix and year
const ids = ['AUTH-2026-01', 'AUTH-2026-02'];
assert.equal(nextId(ids, 'AUTH'), 'AUTH-2026-03');
assert.equal(nextId([], 'BILLING'), 'BILLING-2026-01');
assert.equal(nextId([], undefined), 'DEC-2026-01', 'falls back to DEC when no project key');

// --- the seeded demo must show exactly what the landing page promises
import { DEMO_ISSUES, demoDecisions } from '../src/lib/demo.js';

const demo = demoDecisions('DEMO', 2026);
const verdictOf = (summary) =>
  rank(demo, { projectKey: 'DEMO', summary, description: '', components: [] })[0]?.verdict ??
  'unrelated';

assert.deepEqual(
  DEMO_ISSUES.map(verdictOf),
  ['contradicts', 'contradicts', 'contradicts', 'related', 'unrelated'],
  'three caught, one related, one quiet — in that order'
);

const superseded = demo.find((d) => d.state === 'superseded');
assert.ok(superseded?.supersededBy, 'a superseded decision must name its replacement');
assert.deepEqual(
  demo.find((d) => d.id === superseded.supersededBy)?.supersedes,
  [superseded.id],
  'the chain must be walkable in both directions'
);

console.log('ok — decisions.js');
