// Spike: prove rovo:mcp works and see how structured output reads inside an agent.
// Fake ledger on purpose. No storage, no auth, no Jira calls.

const LEDGER = [
  {
    id: 'AUTH-2026-03',
    statement: 'All new services authenticate with OIDC through the internal IdP, not with shared API keys.',
    state: 'binding',
    decidedAt: '2026-03-11',
    decidedBy: 'Rina',
    alternatives: [
      { text: 'Keep per-service API keys', rejectedBecause: 'No rotation story; keys leaked twice in 2025.' }
    ],
    scope: { projectKeys: ['AUTH'], components: ['auth-gateway'], keywords: ['auth', 'token', 'login', 'sso'] },
    evidence: {
      url: 'https://example.atlassian.net/browse/AUTH-88?focusedCommentId=10021',
      quote: 'Decision: we go OIDC via the internal IdP for every new service. Shared keys are done.'
    }
  },
  {
    id: 'AUTH-2026-07',
    statement: 'Session lifetime is 8 hours, refresh on activity only.',
    state: 'superseded',
    supersededBy: 'AUTH-2026-09',
    decidedAt: '2026-07-02',
    decidedBy: 'Rina',
    alternatives: [],
    scope: { projectKeys: ['AUTH'], components: ['auth-gateway'], keywords: ['session', 'token', 'expiry'] },
    evidence: {
      url: 'https://example.atlassian.net/browse/AUTH-121?focusedCommentId=10188',
      quote: 'Decision: 8 hour sessions, refresh only on activity.'
    }
  }
];

const ours = (record, issueKey) =>
  record.scope.projectKeys.some((p) => issueKey.toUpperCase().startsWith(p)) ||
  record.scope.keywords.some((k) => issueKey.toLowerCase().includes(k));

export function checkPrecedent(payload) {
  const issueKey = String(payload?.issueKey ?? '').trim();
  console.log('checkPrecedent', JSON.stringify(payload));

  if (!issueKey) {
    return 'No issue key supplied. Ask the user which Jira issue to check.';
  }

  const hits = LEDGER.filter((r) => ours(r, issueKey)).filter((r) => r.state !== 'superseded');

  if (hits.length === 0) {
    return `No binding precedent recorded for ${issueKey}. Proceed, then record the decision so the next person inherits it.`;
  }

  return [
    `Precedent for ${issueKey} (citing, not asserting):`,
    ...hits.map((d) =>
      [
        `- ${d.id} [${d.state}] ${d.statement}`,
        `  decided ${d.decidedAt} by ${d.decidedBy}`,
        `  evidence: "${d.evidence.quote}"`,
        `  source: ${d.evidence.url}`
      ].join('\n')
    ),
    'Cite the source URL when you use this.'
  ].join('\n');
}