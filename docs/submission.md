# Devpost submission — Precedent

Copy-paste source for the Codegeist 2026 submission form. Fields match Devpost's
"Enter a Submission" page.

---

## Project name

Precedent

## Tagline (max 200 chars)

The decision ledger for Jira. It quotes the comment that decided something, then flags the
next issue that runs against it — before anyone builds the thing you already rejected.

## Video demo link

`YOUR_YOUTUBE_URL` — the video is `video/precedent-codegeist.mp4` in this repo (52s).

## "Try it out" links

- Install: https://github.com/mvirgiawancr/precedent/blob/master/docs/install-link.txt
- Source: https://github.com/mvirgiawancr/precedent

---

## Inspiration

Every firm makes thousands of decisions and keeps none of them. The reason a ticket was
closed lives in a comment nobody reopens, or in the head of whoever was in the room, and
that person leaves. Then someone opens a ticket to switch authentication to shared API
keys, and the only thing standing between the team and three months of rework is a decision
that was made, written down, and forgotten.

Agents make it worse. An LLM with no memory of your decision history will cheerfully
propose the thing you already rejected, in confident prose, in a format that looks like
work.

We wanted the smallest honest fix: a memory that is citable. Not a wiki, not a knowledge
graph, not another place to write things down — a ledger that quotes the exact comment that
decided something, and answers one question when you open an issue: does this run against
something we already decided?

## What it does

**It records decisions, not discussions.** A comment counts only when it says so: it opens
with `Decision:`, `Decided:` or `ADR:`. Everything else stays out of the ledger. The rule is
deliberately narrow — a ledger full of "we should probably" is noise that trains people to
ignore the panel.

**It catches the contradiction, in the issue.** Precedent appears as a glance in the Jira
work item, above the activity, and as a side panel. Open an issue and it says one of four
things:

- **Contradicts** — *"All new services authenticate with OIDC through the internal IdP."
  shares 3 term(s) [auth, token, shared] with OIDC-2026-01 and proposes a change.*
- **On file** — a decision covers this area, nothing here argues with it.
- **Related** — a neighbouring decision, worth knowing, not a conflict.
- **Nothing recorded** — and it says so, rather than inventing a relationship.

That fourth state matters as much as the first. A panel that cries wolf is switched off in a
week.

**Every claim opens its source.** The quote shown is the words that decided it, and the link
goes straight to the comment:
`…/browse/KAN-15?focusedCommentId=10024`. Precedent refuses to file a decision without
evidence — a decision with no comment behind it cannot exist in the ledger.

**It handles supersession.** A new decision that replaces an old one supersedes it rather
than contradicting itself. The demo ledger ends with `RATE-2026-10 superseded` →
`RATE-2026-11 binding`: the rate decision was replaced, and the panel knows which one is
live.

**Agents can ask too.** Four tools over `rovo:mcp`:

| Tool | Question it answers |
| --- | --- |
| `check-precedent` | Does this proposal contradict anything on file? |
| `find-decision` | What did we decide about this area, and who decided it? |
| `record-decision` | File a decision with its evidence. |
| `list-decision-chain` | What superseded what, in order? |

Precedent also ships a `rovo:agent`, so a judge can ask Rovo "does this ticket contradict
anything we decided?" without assembling an agent first.

## How we built it

**Forge, end to end.** No external server, no hosted backend, no database outside Atlassian.
Five functions behind four UI modules and a `rovo:mcp` endpoint:

- `jira:issueGlance` and `jira:issuePanel` — the same resolver and resource, two surfaces.
  The glance is the primary one: it renders inside the work item without requiring an admin
  to edit the issue layout, and 2026 Jira leaves `workItemPanels:[]` until the panel is
  added to the layout manually. Relying on the panel alone would have meant an app that
  looks broken on a fresh install.
- `jira:globalPage` — the full ledger: every decision, its rationale, its evidence, its
  chain.
- `rovo:mcp` — the four tools above, over the Forge remote MCP transport.
- `rovo:agent` — the shipped agent.
- Four actions, five functions, `storage:app` for the ledger, `read:jira-work` and
  `write:jira-work` for Jira.

**Storage** is Forge's hosted key-value store, keyed by site. Filing a decision writes to
both the store and a real Jira comment on the source issue, so the evidence is a Jira
object, not a copy of one.

**Navigation** goes through the Forge bridge — `router.navigate(pathname + search)`.
Forge iframes block `target="_blank"`, so evidence links would silently do nothing in a
plain anchor.

**The matching is deterministic.** Tokenise the issue summary and description, drop
stopwords, intersect with each decision's term set, then require a change verb
(`replace`, `drop`, `switch`, `migrate`, `remove`, `deprecate`…) before calling it a
contradiction. Scope it by project and component. Same input, same verdict, every time,
covered by assertions in `app/test/decisions.test.mjs`.

**No LLM in the app.** This is a design decision, not a limitation. A verifier that changes
its answer between runs is not a verifier. The model belongs in the agent that asks
Precedent a question — that is where judgement should live, and it is where Rovo already is.

**The demo seeds itself.** "Load demo decisions" creates five issues in the project and
files twelve decisions against them, posting the deciding comment for real and linking
evidence to `?focusedCommentId=`. A judge can go from install to contradiction in about
ninety seconds, on their own site, with no data entry.

## Challenges

**The panel that does not exist yet.** Jira 2026 renders `workItemPanels:[]` on a fresh
install until an admin adds the panel to the work-item layout. Declaring `jira:issuePanel`
alone produces an app that looks broken. We ship both the panel and the glance with one
shared resolver, so the app is visible the moment it installs.

**Linking out of a Forge iframe.** Anchors with `target="_blank"` are inert. Evidence links
are only worth anything if they land on the comment, so they had to go through
`router.navigate`.

**Precision over recall.** The first version flagged far too much: any two tickets touching
authentication looked like a conflict. Adding the change-verb requirement and component
scoping cut the false positives to zero on the demo set — five issues, one contradiction,
one quiet miss, which is the behaviour we actually wanted to show.

**Recording the demo.** Forge iframes would not composite reliably in a headless browser
capture, and a paused video element would not repaint its seeked frame, producing blank
frames. We ended up extracting the real UI to stills and compositing them in an HTML+GSAP
timeline so the video is frame-accurate and reproducible.

## Accomplishments

- The whole loop works on a real site: contradiction, evidence link, ledger, supersession,
  and a quiet "nothing recorded" for the ticket that should stay silent.
- No LLM call, no third-party service, no data leaving Atlassian. The privacy policy is
  short because the app does not have much to say.
- Four MCP tools and a shipped agent, verified end to end against a live Rovo surface
  rather than assumed from the docs.
- The demo is installable in one click and self-seeding, so a judge does not have to
  believe the screenshots.

## What we learned

The hard part of a decision ledger is not storing decisions. It is deciding what is *not* a
decision. Narrow, boring, and slightly conservative beats clever — a panel that is right
four times out of five gets opened, and one that is right two times out of three gets
collapsed and never reopened.

## What's next

- Confluence pages as evidence, alongside comments — the same rule, a second source.
- Search across sites of record, so a decision made in one project binds another.
- A weekly digest to the work item owner when a live decision has no recent activity, which
  is usually the sign it is about to be re-litigated.

## Built with

forge, jira-rest-api, jira, rovo, mcp, javascript, node.js, css, gsap, playwright

---

## How it meets the main technical requirement

**Built on Forge, integrating with Jira.** Precedent is a Forge app: `forge deploy` and
`forge install` on a free Atlassian Cloud site, `manifest.yml` in the repo with five
modules and a `rovo:mcp` endpoint, all backend logic in Forge functions, all state in
`storage:app`. It uses the Jira REST API for the issues and comments it reads and quotes,
and the Forge bridge for in-product navigation. There is no server of ours anywhere: the
production build runs on Atlassian's infrastructure.

Category: **Apps for Specialized Industries**.

## Bonus: Best app with Atlassian MCP

Precedent exposes its ledger through `rovo:mcp` with four tools —
`check-precedent`, `find-decision`, `record-decision`, `list-decision-chain` — and ships a
`rovo:agent` so the tools are usable without any setup.

The MCP surface is the point of the app, not a wrapper around it. Precedent exists because
an agent with no memory of your decisions will propose the thing you already rejected; the
tools are how the agent stops guessing. `check-precedent` returns the verdict, the decision
id, the quote, and the evidence link, so an agent can cite the source the same way the panel
does. `record-decision` refuses a decision with no evidence, which keeps an agent from
fabricating history.

Both modules are declared in `app/manifest.full.yml` in the repo, and the tools were
exercised against a live Rovo surface — `spike/rovo-mcp/` holds the minimal reproduction
that proved the transport works without any entitlement gate.

---

## Submission checklist

- [ ] Video uploaded to **YouTube, public** — link pasted above
- [ ] Category: Apps for Specialized Industries
- [ ] Bonus: Best app with Atlassian MCP
- [ ] Bonus: Best Agents
- [ ] Repo URL: https://github.com/mvirgiawancr/precedent
- [ ] Install link: https://github.com/mvirgiawancr/precedent/blob/master/docs/install-link.txt
- [ ] Submit before **2026-12-23 03:00 WIB** (2026-12-22 12:00 PST)
