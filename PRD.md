# Codegeist 2026 — PRD: Precedent

*A decision ledger that gives agents and teams the context of what was already decided, and why.*

## Event facts (verified 2026-11-02)

| | |
|---|---|
| Devpost | https://codegeist2026.devpost.com |
| Deadline | 2026-12-22 12:00 PST = **2026-12-23 03:00 WIB** |
| Judging period | 2027-01-05 → 2027-02-03, winners ~2027-02-15 |
| Registered | 1,231 participants, project gallery not yet published |
| Sponsor | Atlassian Pty Ltd (Sydney). Administered by Devpost |
| Card needed | **no.** Free Atlassian Cloud developer site + free Forge |
| Indonesia | **eligible.** Excluded list: Brazil, Quebec, Russia, Belarus, Crimea, Cuba, Iran, North Korea, Syria, Sudan, Myanmar, OFAC-designated |
| Team | 1 to many, no team requirement |

### Prize structure and the rule that shapes strategy

| Prize | Value | Qty | Scope |
|---|---|---|---|
| First Place | $15,000 | 3 | 1 per category |
| Second Place | $8,000 | 3 | 1 per category |
| Third Place | $5,000 | 3 | 1 per category |
| Best Agents (Rovo) | $1,500 | 6 | bonus |
| **Best app with Atlassian MCP** | **$1,500** | **6** | **bonus — our target** |
| Best Teamwork Graph | $1,500 | 6 | bonus |
| Best Marketplace published | $1,500 | 6 | bonus — **dropped, see below** |
| Participation swag | pack | 300 | first-come eligible submissions |

> **Rules §8:** "The same Submission can win up to one Grand Prize and one Bonus Prize."

So: one app, engineered to be eligible for exactly one grand category **and** one bonus. Do not spread effort.

**Marketplace bonus dropped (verified 2026-11-02):** listing requires enrolling as a Marketplace Partner, accepting the Partner Agreement, then *partner due diligence with business and identity verification* before any listing can be created. Admin overhead with an unknown foreign-entity timeline, for a single $1,500 slot. Not worth the weeks.

### Judging criteria (Stage Two, equally weighted)
1. **Technological Implementation** — thorough, skillful use of Forge + an Atlassian capability; non-trivial
2. **Design** — a complete coherent product, not a proof of concept
3. **Potential Impact** — credible specific case for a real audience, actually addressed by what is demonstrated
4. **Innovation / Idea** — novel, differs from what already exists
5. **Presentation** — video shows it working end to end; problem, audience, stake are clear

Stage One is a pass/fail viability screen: fits the theme, uses Forge + the required capability.

---

## 1. Problem

Organisations decide constantly and remember nothing. A decision lands in a Jira comment thread, a Confluence page nobody reopens, or a Slack call. Six months later the same team re-debates it, reverses it by accident, or a new hire asks "why is auth built this way?" and the honest answer is a link to a comment from someone who has left.

Two things make this worse right now:

- **Agents are joining the team.** They are asked to change work they have no memory of. Without a machine-readable record of past decisions, an agent will confidently undo a deliberate choice. Context is the bottleneck, which is literally this hackathon's theme.
- **Decisions have a lifecycle nobody tracks.** A decision gets superseded and the old text survives, unfixed, in twenty tickets.

Existing tools don't cover this: ADR repositories (adr-tools, Log4Brains) are markdown files that live outside the tracker and rot; Confluence is a search box, not a ledger; Jira shows status, never rationale.

## 2. Product: Precedent

**One line:** Precedent turns the decisions already buried in Jira and Confluence into a citable ledger, and tells you — or your agent — when a piece of work contradicts one.

**Category entered:** Apps for Specialized Industries — professional firms (legal, consulting, agencies, architecture) whose work *is* precedent-following. Rationale: least crowded of the three categories, and the domain language ("binding", "superseded", "cites") is native to it rather than bolted on.

**Bonus entered:** Best app with Atlassian MCP, via a `rovo:mcp` module. `rovo:mcp` shipped 2026-10-29 and is in Preview, so the field is thin.

### Who it is for

| User | Job to be done |
|---|---|
| Associate at a 40-person firm | "Before I draft this, has the firm already decided this question?" |
| Engagement lead | "Record this ruling so the next matter inherits it instead of re-arguing it." |
| AI agent (Claude, Cursor, Rovo) acting on the tracker | "Check for precedent before changing this; cite what you found." |

### The demo promise (what the video shows in the first 40 seconds)

A Jira issue is opened. The panel says, in one line, with a red stamp: **CONTRADICTS PRECEDENT — Auth/2026-03, binding, decided 8 months ago by [name].** One click shows the exact comment that decided it and the two alternatives that were rejected. Then Claude is asked the same question through MCP and answers with the same citation.

The value is the interception, not another dashboard.

## 3. Scope

### In
1. **Capture** — turn a decision into a record from three sources, all explainable:
   - a Jira comment or description marked with a `decision` label, or prefixed `Decision:` (deterministic pattern)
   - a Confluence page using the provided ADR-style template (title prefix `ADR:`)
   - an explicit "Record as decision" action on any comment/page (human confirmation)
2. **Ledger** — a Jira global page listing decisions with state, scope, owner, date, and evidence links. Filter by state and scope.
3. **Issue context panel** — on any Jira issue, show decisions whose scope matches (project + component + keywords) and flag contradictions.
4. **Decision detail** — statement, rationale, rejected alternatives, decisions it supersedes / is superseded by, evidence quotes with deep links to source.
5. **MCP tools** — ledger exposed as agent tools (see §6).
6. **Seeded demo project** — a Jira project + Confluence space with ~12 realistic decisions and 3 live contradictions, so judges see value in under a minute without importing anything.
7. **Onboarding/empty states** — first-run screen that explains the model and offers "load demo data".

### Out (deliberate, say so in the video)
- No LLM extraction inside the app. Determinism is a feature: it runs on the judge's site with no API key, no model bill, no hallucinated decision. Reasoning is the agent's job, reached through MCP.
- No Slack/Teams/email ingest.
- No cross-site or cross-tenant graph.
- No Marketplace listing (see above).
- No editing of the original comment or page — Precedent never writes to source content.

### Definition of done
- Fresh Atlassian site → install via link → load demo data → see a contradiction in < 2 minutes, no console errors.
- Claude (or Cursor) connects to `https://mcp.atlassian.com/forge/<appId>`, calls `check_precedent`, and returns a decision with a working source link.
- Light and dark theme both clean. Panel usable at 320px wide.
- `forge lint` clean, `npm run check` (assertions on the matching logic) green.

## 4. Decision record model

```
Decision {
  id            string          // stable, short: AUTH-2026-03
  statement     string          // one sentence, imperative
  rationale     string          // why, in the decider's words
  alternatives  { text, rejectedBecause }[]
  state         'proposed' | 'binding' | 'superseded'
  supersedes    string[]        // decision ids
  scope         { projectKeys[], components[], labels[], keywords[] }
  decidedBy     { accountId, displayName }
  decidedAt     timestamp
  evidence      { kind: 'jira-comment'|'jira-issue'|'confluence-page', url, quote, authorId, createdAt }[]
  capturedBy    'pattern' | 'confirmed'   // how it entered the ledger
}
```

**Conflict rule (deterministic, testable):** an issue contradicts a decision when the decision is `binding`, the issue shares a project or component, and their keyword sets intersect above a threshold while the issue's intent verbs differ (e.g. decision "use X for auth", issue "replace X with Y"). Where confidence is low, word it as *related precedent*, never as a contradiction. Never assert a contradiction without an evidence quote.

`capturedBy` is shown in the UI. A pattern-captured record says "captured from a comment, confirm?" — one click to promote to binding. This keeps the ledger honest and gives the demo a satisfying human-in-the-loop beat.

## 5. Technical design

**Platform:** Forge, Custom UI (React + TypeScript + Vite) so the interface is fully art-directed rather than bent to UI Kit components.

**Manifest modules:**
- `jira:globalPage` — the ledger
- `jira:issuePanel` — the context panel (the money screen)
- `rovo:mcp` — one module, ≤30-char name, exposing `action` keys as tools
- `action` ×4 — one per MCP tool
- `function` ×4 — handlers for the actions
- `confluence:globalPage` — optional, only if time allows (capture from Confluence via the app already works through `asApp`/`asUser` REST calls)

**Manifest sketch (from the official reference, verified 2026-11-02):**
```yaml
modules:
  jira:issuePanel:
    - key: precedent-panel
      resource: main
      resolver: { function: resolver }
      title: Precedent
  jira:globalPage:
    - key: precedent-ledger
      resource: main
      resolver: { function: resolver }
      title: Precedent
  rovo:mcp:
    - key: precedent-mcp
      name: Precedent Ledger            # ≤30 chars
      tools: [find-decision, check-precedent, record-decision, list-decision-chain]
  action:
    - key: find-decision
      function: findDecision
      actionVerb: GET
      description: Search the decision ledger by scope or free text
      inputs: { query: { title: Query, type: string, required: true } }
  function:
    - key: findDecision
      handler: index.findDecision
resources:
  - key: main
    path: src/ui/dist
app:
  id: ari:cloud:ecosystem::app/<uuid>   # MCP endpoint: https://mcp.atlassian.com/forge/<uuid>
```

**Data:** Forge Storage (key-value), with a denormalised index object per project for list reads. `ponytail:` plain KV is enough at demo/ledger scale; move to Custom Entity Store if a site exceeds ~2k decisions.

**Permissions / scopes:** `read:jira-work`, `write:jira-work` (for the label used by "Record as decision"), `read:confluence-content.all`, `storage:app`. No admin scope.

**Data access caveat (from the reference):** app-based tools reach only the workspace where the app is installed; if the MCP tools must read both Jira and Confluence, the app must declare multi-product compatibility. Verify during the spike.

**Repo:** public GitHub, MIT, README with install steps and a "how we used Forge" section. `D:\Contra\16-codegeist-precedent`.

## 6. MCP tools

| Tool | Verb | Purpose | Returns |
|---|---|---|---|
| `check_precedent` | GET | Does this issue contradict or repeat a binding decision? | decision ids, states, evidence quote, source URL, confidence, why it matched |
| `find_decision` | GET | Search the ledger by text or scope | ranked records, each with citation |
| `record_decision` | CREATE | Write a decision from an agent's summary, with evidence | new decision id |
| `list_decision_chain` | GET | Supersede chain for one decision | full history, oldest → newest |

The description strings are the contract with an agent — they must say "call this before changing behaviour covered by an existing decision", and every response must carry a source URL so the agent can cite rather than assert.

## 7. Design direction

**The world: a firm's case archive.** Warm off-white stock, ink black type, one stamp red used only for a contradiction or a binding mark. Rules and hairlines instead of cards. Dates and decision ids in mono. Citations as superscripts pointing to a source line, the way a legal brief cites.

- **Type:** a disciplined serif for statements and rationale, a tight sans for UI chrome, mono for ids/dates. No rounded corners except the host's own chrome; no pills, no gradient, no violet, no bento.
- **The stamp is the brand.** One rotated rubber-stamp mark: `BINDING`, `SUPERSEDED`, `CONTRADICTS`. Applied sparingly, never decorative.
- **Evidence is always one click away.** Every claim in the UI resolves to the exact comment or page line, with the author and date — the product's credibility lives there.
- **Density:** the ledger reads like an index of filings, not a kanban. Rows, not tiles.
- **Both themes.** Respect the Atlassian theme for host chrome; the app's own surfaces get explicit light/dark values so it never looks like a foreign object.

Reference: `D:\Contra\15-youcam-hackathon\DESIGN.md` (casting sheet) is the closest prior direction; this one goes colder and more archival — paper and rubber stamps, not warm retail.

## 8. Milestones

| Dates | Deliverable |
|---|---|
| Nov 3–4 | **Spike (blocking).** Forge app on the new site, `rovo:mcp` registered, a hello-world action invoked from Claude. If `rovo:mcp` needs an entitlement we can't get, pivot the bonus to Rovo Agent — same single slot, cheap switch |
| Nov 5–9 | Capture: Jira comments/description patterns, Confluence ADR template, record as decision. Storage model + `npm run check` assertions on the matching rules |
| Nov 10–16 | Issue panel with conflict detection, ledger global page, decision detail, seeded demo project |
| Nov 17–23 | Full design pass, empty/loading/error states, 320px pass, dark theme |
| Nov 24–30 | Video (≤3 min of substance, ≤5 min file), README + judge setup instructions, installation link tested on a clean site |
| Dec 1–7 | **Submit v1 early** (participation swag is first-come, 300 slots), then iterate |
| Dec 8–20 | Polish, re-test install on a fresh site, final submission Dec 20 |

## 9. Risks

| Risk | Mitigation |
|---|---|
| `rovo:mcp` is Preview and may need entitlements | Spike on day 1. Fallback: Rovo Agent module for the same bonus slot |
| Judges can't reach MCP tools — external exposure is **off by default** and must be enabled per install by a site/org admin (Apps › Sites › Connected apps) | Primary path for judges is Rovo Studio custom agent (no admin toggle). Ship step-by-step screenshots for the external client path. Video shows the MCP call working so it is evident regardless |
| Sharing/installation links expire | Verify expiry in the spike; generate the link last, re-verify the day before the deadline |
| A judge never installs anything | The video carries the whole story by itself: problem → interception → citation → agent |
| "Specialized Industries" fit is judged on credible impact | Keep the vocabulary native (matters, rulings) and show one named persona, not a market-size slide |
| Scope creep into an LLM product | Non-goal is explicit in the app's own copy, and in the submission text |

## 10. Submission checklist

- [ ] Devpost: joined, category = Specialized Industries, bonus = Best app with Atlassian MCP
- [ ] Public GitHub repo, MIT licence visible in the About section
- [ ] Installation link + every config step written for a judge who has never seen Forge
- [ ] Text description: features, and an explicit paragraph on how Forge + `rovo:mcp` are used
- [ ] YouTube video public, English or subtitled in English, ≤5 min
- [ ] Live check: fresh site → install → demo data → contradiction visible
- [ ] No third-party trademarks or copyrighted music in the video

## 11. Prerequisites (owner: Moch)

- [x] Atlassian developer account created
- [ ] Join the hackathon on Devpost
- [ ] `npm i -g @forge/cli` then `forge login` (browser sign-in by you; no credentials shared)
- [ ] Confirm we may use the firm/legal framing for the impact story
