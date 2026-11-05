import { makeResolver } from '@forge/resolver';
import api, { route } from '@forge/api';
import { compare, rank, nextId, isDecisionText, parseDecision } from './lib/decisions.js';
import * as store from './store.js';
import { seedDecisions } from './seed.js';

const json = (body) => ({
  body: JSON.stringify(body),
  headers: { 'Content-Type': ['application/json'] }
});

/** Atlassian documents bodies are ADF trees; this flattens them to plain text. */
const adfText = (node) =>
  typeof node === 'string'
    ? node
    : (node?.content ?? [])
        .map((c) => (c.type === 'text' ? c.text : adfText(c)))
        .join(' ');

/** Read the parts of an issue the matching logic needs. */
async function issueFacts(issueKey) {
  const res = await api
    .asApp()
    .requestJira(route`/rest/api/3/issue/${issueKey}?fields=summary,description,components,project`);
  if (res.status !== 200) throw new Error(`issue ${issueKey} not readable (${res.status})`);
  const data = await res.json();
  return {
    issueKey,
    projectKey: data.fields.project?.key,
    summary: data.fields.summary ?? '',
    description: adfText(data.fields.description),
    components: (data.fields.components ?? []).map((c) => c.name)
  };
}

function cite(hit) {
  const d = hit.decision;
  return [
    `- ${d.id} [${d.state}] ${d.statement}`,
    d.rationale ? `  because ${d.rationale}` : null,
    `  decided ${d.decidedAt} by ${d.decidedBy}`,
    d.evidence ? `  evidence: "${d.evidence.quote}"` : null,
    d.evidence ? `  source: ${d.evidence.url}` : null
  ]
    .filter(Boolean)
    .join('\n');
}

/** File one decision. Shared by the manual, agent and comment paths so ids stay sequential. */
async function fileDecision({ statement, rationale, projectKey, evidence, decidedBy, capturedBy }) {
  const existing = await store.all();
  const decision = {
    id: nextId(existing.map((d) => d.id), projectKey),
    statement,
    rationale: rationale ?? null,
    state: 'binding',
    supersedes: [],
    supersededBy: null,
    scope: { projectKeys: [projectKey], components: [], keywords: [] },
    decidedBy,
    decidedAt: new Date().toISOString().slice(0, 10),
    evidence,
    capturedBy
  };
  await store.save(decision);
  return decision;
}

// ---------------------------------------------------------------- agent tools

export async function checkPrecedent(payload) {
  const issueKey = String(payload?.issueKey ?? '').trim();
  if (!issueKey) return 'No issue key supplied. Ask which Jira issue to check.';

  const facts = await issueFacts(issueKey);
  const hits = rank(await store.all(), facts);
  if (hits.length === 0) {
    return `No precedent recorded for ${issueKey}. Proceed, then record the decision so the next person inherits it.`;
  }
  const lead = hits[0].verdict === 'contradicts'
    ? `CONTRADICTS PRECEDENT — ${hits[0].reason}`
    : `Related precedent for ${issueKey} — ${hits[0].reason}`;
  return [lead, ...hits.map(cite), 'Cite the source URL when you use this.'].join('\n');
}

export async function findDecision(payload) {
  const q = String(payload?.query ?? '').toLowerCase().trim();
  if (!q) return 'No query supplied.';
  const hits = (await store.all()).filter((d) =>
    [d.id, d.statement, d.rationale, ...(d.scope?.keywords ?? []), ...(d.scope?.projectKeys ?? [])]
      .join(' ')
      .toLowerCase()
      .includes(q)
  );
  if (hits.length === 0) return `No decision matches "${q}".`;
  return [`${hits.length} decision(s) match "${q}":`, ...hits.map((d) => cite({ decision: d }))].join('\n');
}

export async function recordDecision(payload) {
  const statement = String(payload?.statement ?? '').trim();
  const projectKey = String(payload?.projectKey ?? '').trim().toUpperCase();
  const evidenceUrl = String(payload?.evidenceUrl ?? '').trim();
  if (!statement || !projectKey || !evidenceUrl) {
    return 'statement, projectKey and evidenceUrl are all required. A decision without evidence is not a decision.';
  }
  const decision = await fileDecision({
    statement,
    rationale: payload.rationale ? String(payload.rationale) : null,
    projectKey,
    evidence: { kind: 'manual', url: evidenceUrl, quote: payload.quote ?? statement },
    decidedBy: payload.decidedBy ?? 'agent',
    capturedBy: 'agent'
  });
  return `Recorded ${decision.id}: ${decision.statement}`;
}

// ---------------------------------------------------------------- comment capture

async function siteBase() {
  const res = await api.asApp().requestJira(route`/rest/api/3/serverInfo`);
  if (res.status !== 200) return null;
  return (await res.json()).baseUrl ?? null;
}

/**
 * A comment becomes a decision only if it opens with "Decision:", and only once.
 * The evidence URL carries the comment id, so a second scan finds it already filed.
 */
async function captureFromComments(issueKey) {
  const facts = await issueFacts(issueKey);
  const [res, existing, base] = await Promise.all([
    api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}/comment?maxResults=100`),
    store.all(),
    siteBase()
  ]);
  if (res.status !== 200) throw new Error(`comments on ${issueKey} not readable (${res.status})`);

  const filed = new Set(existing.map((d) => d.evidence?.url).filter(Boolean));
  const comments = (await res.json()).comments ?? [];
  const captured = [];

  for (const comment of comments) {
    const body = adfText(comment.body).trim();
    if (!isDecisionText(body)) continue;
    const url = base ? `${base}/browse/${issueKey}?focusedCommentId=${comment.id}` : null;
    if (url && filed.has(url)) continue;
    const { statement, rationale } = parseDecision(body);
    if (!statement) continue;
    const decision = await fileDecision({
      statement,
      rationale,
      projectKey: facts.projectKey,
      evidence: { kind: 'jira-comment', url, quote: body.slice(0, 400), issueKey },
      decidedBy: comment.author?.displayName ?? 'unknown',
      capturedBy: 'pattern'
    });
    filed.add(url);
    captured.push(decision.id);
  }
  return { issueKey, captured, scanned: comments.length };
}

export async function listDecisionChain(payload) {
  const id = String(payload?.decisionId ?? '').trim();
  if (!id) return 'No decision id supplied.';
  const decisions = await store.all();
  const byId = new Map(decisions.map((d) => [d.id, d]));
  const chain = [];
  let cursor = byId.get(id);
  while (cursor && chain.length < 20) {
    chain.unshift(cursor);
    cursor = (cursor.supersedes ?? []).map((s) => byId.get(s))[0];
  }
  if (chain.length === 0) return `No decision with id ${id}.`;
  return [`Chain for ${id} (oldest first):`, ...chain.map((d) => cite({ decision: d }))].join('\n');
}

// ---------------------------------------------------------------- UI resolvers

// makeResolver, not `new Resolver()`: the default export of this CJS package is not a
// constructor once Forge's bundler has interop-wrapped it ("out_namespaceObject is not a
// constructor" in the global page). The named factory is immune to that.
export const resolver = makeResolver({
  panel: async ({ context }) => {
    const issueKey = context?.extension?.issue?.key;
    if (!issueKey) return { issueKey: null, hits: [], seeded: await store.isSeeded() };
    const facts = await issueFacts(issueKey);
    return { issueKey, hits: rank(await store.all(), facts), seeded: await store.isSeeded() };
  },

  ledger: async () => {
    const decisions = await store.all();
    return {
      decisions: decisions.sort((a, b) => (a.id < b.id ? 1 : -1)),
      seeded: await store.isSeeded()
    };
  },

  capture: async ({ context }) => {
    const issueKey = context?.extension?.issue?.key;
    if (!issueKey) return { issueKey: null, captured: [], scanned: 0 };
    return captureFromComments(issueKey);
  },

  seed: async ({ context }) => {
    // Seeding twice would file the same decisions again and create a second batch of issues.
    if (await store.isSeeded()) {
      return { created: (await store.all()).length, already: true, issues: [] };
    }
    const created = await seedDecisions(context?.extension?.issue?.key);
    // Marking a failed seed would hide the button and leave the judge with an empty ledger.
    if (created.created > 0) await store.markSeeded();
    return created;
  }
});

export { compare };
