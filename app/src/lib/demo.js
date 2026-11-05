// The demo dataset, kept pure so the promised verdicts can be asserted without Jira.
// ponytail: fixed rows, no generator. A demo that varies is a demo that can fail on stage.

export const DEMO_ISSUES = [
  'Replace OIDC with shared API keys for the gateway',
  'Drop the 8 hour session limit and keep tokens forever',
  'Switch customer PII storage to the US region',
  'Add a schema for cross-service reporting joins',
  'Bump the Node version in the billing worker'
];

// word, statement, rationale, keywords, decidedBy, state
export const DEMO_DECISIONS = [
  ['OIDC', 'All new services authenticate with OIDC through the internal IdP.', 'Shared API keys leaked twice and have no rotation story.', ['auth', 'token', 'sso', 'login'], 'A. Rahman', 'binding'],
  ['SESSION', 'Session lifetime is 8 hours and refreshes on activity only.', 'Longer sessions kept support tickets down without measurable risk.', ['session', 'expiry', 'refresh'], 'J. Okafor', 'binding'],
  ['PII', 'Customer PII never leaves the primary region.', 'Contractual commitment to two enterprise clients.', ['pii', 'region', 'data', 'storage'], 'M. Lindqvist', 'binding'],
  ['SCHEMA', 'Each service owns its schema; no cross-service joins in production.', 'One schema caused two outages during peak migration.', ['database', 'schema', 'migration', 'query'], 'S. Prasetyo', 'binding'],
  ['ROLLBACK', 'Every production change ships with a tested rollback path.', 'An unrevertable deploy cost eleven hours of downtime.', ['deploy', 'rollback', 'release', 'hotfix'], 'A. Rahman', 'binding'],
  ['NAMING', 'Public request fields are snake_case; internal code is camelCase.', 'Client SDKs depend on the published shape, and changing it breaks integrations.', ['field', 'sdk', 'contract', 'naming'], 'J. Okafor', 'binding'],
  ['IDEMPOTENCY', 'Payment endpoints are idempotent on a client-supplied key.', 'A retried charge double-billed three customers.', ['payment', 'idempotent', 'retry', 'webhook'], 'M. Lindqvist', 'binding'],
  ['TZ', 'Timestamps are stored in UTC and rendered in the viewer zone.', 'Two invoices were dated a day off during the daylight saving change.', ['timestamp', 'utc', 'timezone', 'date'], 'S. Prasetyo', 'binding'],
  ['RETENTION', 'Audit logs are retained for 400 days, then deleted.', 'Legal asked for 400 days; longer retention triples the bill.', ['audit', 'logs', 'retention', 'compliance'], 'A. Rahman', 'binding'],
  ['RATE', 'Rate limiting uses a fixed window of 60 seconds.', 'Simplest thing that survived the first launch.', ['rate', 'limit', 'window', 'throttle'], 'J. Okafor', 'superseded'],
  ['RATE', 'Rate limiting uses a token bucket per client key.', 'The fixed window let bursts through at the boundary.', ['rate', 'bucket', 'throttle', 'quota'], 'M. Lindqvist', 'binding'],
  ['VENDOR', 'Third-party assets are vendored, never loaded from a CDN at runtime.', 'A CDN outage took the editor offline for a day.', ['vendor', 'cdn', 'asset', 'bundle'], 'S. Prasetyo', 'binding']
];

/** Shape the rows into ledger records. Evidence is attached by the caller, which knows Jira. */
export function demoDecisions(projectKey, year = new Date().getFullYear()) {
  return DEMO_DECISIONS.map(([word, statement, rationale, keywords, decidedBy, state], i) => ({
    id: `${word}-${year}-${String(i + 1).padStart(2, '0')}`,
    statement,
    rationale,
    state,
    supersedes: word === 'RATE' && state === 'binding' ? [`RATE-${year}-10`] : [],
    supersededBy: state === 'superseded' ? `RATE-${year}-11` : null,
    scope: { projectKeys: [projectKey], components: [], keywords },
    decidedBy,
    decidedAt: `${year}-${String((i % 10) + 1).padStart(2, '0')}-1${i % 9}`,
    capturedBy: 'demo'
  }));
}
