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
  if (res.status !== 201) {
    // A project can demand fields the seed does not know about; say so instead of going quiet.
    return { error: `create issue failed (${res.status}): ${(await res.text()).slice(0, 300)}` };
  }
  return { key: (await res.json()).key ?? null };
}

/** Post the decision as a real comment, so the evidence link opens the words that decided it. */
async function addComment(issueKey, text) {
  const body = {
    type: 'doc',
    version: 1,
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
  };
  const res = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body })
  });
  if (res.status !== 201) return null;
  return (await res.json()).id ?? null;
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
  const failures = [];
  for (const summary of typeId ? DEMO_ISSUES : []) {
    const made = await createIssue(projectKey, summary, typeId);
    if (made.key) demo.push({ key: made.key, summary, url: base ? `${base}/browse/${made.key}` : null });
    else if (made.error) failures.push(made.error);
  }

  // Without its own issues there is no demo, and a half-seeded ledger is worse than none.
  if (demo.length === 0) {
    return {
      created: 0,
      projectKey,
      issues: [],
      reason: typeId
        ? failures[0] ?? 'the app could not create an issue in this project'
        : `project ${projectKey} offers the app no issue type it can create`
    };
  }

  const year = new Date().getFullYear();
  let created = 0;
  for (const decision of demoDecisions(projectKey, year)) {
    // Evidence has to open the words that decided it, so the seed posts the decision as a
    // real comment and links to that comment. A quote nobody can find is a rumour.
    const host = demo[created % Math.max(demo.length, 1)];
    const text = `Decision: ${decision.statement}${decision.rationale ? ` ${decision.rationale}` : ''}`;
    const commentId = host ? await addComment(host.key, text) : null;
    const url = host
      ? `${host.url}${commentId ? `?focusedCommentId=${commentId}` : ''}`
      : null;

    await store.save({
      ...decision,
      evidence: {
        kind: commentId ? 'jira-comment' : host ? 'jira-issue' : 'manual',
        url,
        quote: text,
        issueKey: host?.key ?? null
      }
    });
    created += 1;
  }

  return { created, projectKey, base, issues: demo };
}
