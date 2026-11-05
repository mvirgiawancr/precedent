import api, { route } from '@forge/api';
import * as store from './store.js';
import { DEMO_ISSUES, demoDecisions } from './lib/demo.js';

// Demo data exists so a judge sees the product working within a minute of installing.
// The seed creates its own issues, because a contradiction that depends on whatever
// happened to be in the site already is a coin flip, not a demo.
// ponytail: issues land in a project that already exists. Creating a project needs a
// different scope and a template key, and buys nothing here.

async function siteBase() {
  const res = await api.asApp().requestJira(route`/rest/api/3/serverInfo`);
  if (res.status !== 200) return null;
  return (await res.json()).baseUrl ?? null;
}

async function projectKeyFor(issueKey) {
  if (issueKey) {
    const res = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}?fields=project`);
    if (res.status === 200) {
      const key = (await res.json()).fields?.project?.key;
      if (key) return key;
    }
  }
  const jql = 'order by created DESC';
  const res = await api
    .asApp()
    .requestJira(route`/rest/api/3/search/jql?jql=${jql}&maxResults=5&fields=project`);
  if (res.status !== 200) return null;
  return (await res.json()).issues?.[0]?.fields?.project?.key ?? null;
}

/** The first usable issue type in a project, preferring Task then Story. */
async function issueTypeId(projectKey) {
  const res = await api
    .asApp()
    .requestJira(route`/rest/api/3/issue/creatable?projectKeys=${projectKey}&maxResults=50`);
  if (res.status !== 200) return null;
  const data = await res.json();
  const types = (data.issueTypes ?? data.projects?.[0]?.issuetypes ?? []).filter((t) => !t.subtask);
  const pick =
    types.find((t) => t.name === 'Task') ?? types.find((t) => t.name === 'Story') ?? types[0];
  return pick?.id ?? null;
}

async function createIssue(projectKey, summary, typeId) {
  const res = await api.asApp().requestJira(route`/rest/api/3/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: { project: { key: projectKey }, summary, issuetype: { id: typeId } }
    })
  });
  if (res.status !== 201) return null;
  return (await res.json()).key ?? null;
}

// Written so the outcome is fixed: the first three run against a binding decision, the
// fourth merely relates, the fifth is noise. Precision is the product.

export async function seedDecisions(issueKey) {
  const base = await siteBase();
  const projectKey = await projectKeyFor(issueKey);
  if (!projectKey) {
    return { created: 0, projectKey: null, issues: [], reason: 'no Jira project is visible to the app' };
  }

  const typeId = await issueTypeId(projectKey);
  const demo = [];
  for (const summary of typeId ? DEMO_ISSUES : []) {
    const key = await createIssue(projectKey, summary, typeId);
    if (key) demo.push({ key, summary, url: base ? `${base}/browse/${key}` : null });
  }

  const year = new Date().getFullYear();
  let created = 0;
  for (const decision of demoDecisions(projectKey, year)) {
    // Evidence has to open, so it points at an issue this seed actually created.
    const evidence = demo[created % Math.max(demo.length, 1)];
    await store.save({
      ...decision,
      evidence: {
        kind: evidence ? 'jira-issue' : 'manual',
        url: evidence?.url ?? null,
        quote: `Decision: ${decision.statement}`,
        issueKey: evidence?.key ?? null
      }
    });
    created += 1;
  }

  return { created, projectKey, base, issues: demo };
}
