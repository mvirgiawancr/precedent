# Video: 3 minutes

**File:** `precedent-codegeist.mp4`, 1920×1080, 30fps, ≤5 min (target 3:00).
**Subtitles burned in**, English. **Music + SFX from Pixabay** — never synthesized.
**No bang-motion.** Story-driven HTML + GSAP, real UI clips recorded from the live app.

The video has to carry the whole story alone, because a judge may never install anything.

---

## The world

One recurring visual: **a case file being opened.** Manila folder edge, a ruled index, a
red stamp. It appears at 0:00 as an abstract folder, returns at 0:40 as the actual panel,
and closes at 2:52. Everything between happens inside that frame.

Palette and type are the product's own: paper `#f4f5f6`, ink near-black, one asphalt red
`#b4342a`, Antonio / Archivo / Azeret Mono. No new visual language — the video should look
like the app, not like a launch video about the app.

---

## Beats

### 0:00–0:18 — The thing you already decided

Cold open, no logo. A dark screen, one line of mono text typing in:

> `AUTH-142 · Replace OIDC with shared API keys for the gateway`

Then, under it, three ghosted lines fade in — the same ticket, opened three times:

> `Mar 2024 — closed. Won't do.` `Nov 2024 — closed. Won't do.` `Aug 2025 — opened again.`

**Subtitle:** *This ticket has been opened three times. The decision that killed it was never written down.*

### 0:18–0:40 — So write it down

The folder opens. The ledger index draws itself, row by row, in the app's own type.

**Subtitle:** *Precedent keeps the decisions. Not the discussion — the decision, and the words that decided it.*

Screen: the real ledger page, slow scroll, one row selected.

### 0:40–1:22 — The interception (the money shot)

Cut to the live issue panel. Nothing staged: a real issue, real load, real verdict.

The red rule draws left to right. The verdict lands:

> **Contradicts** — All new services authenticate with OIDC through the internal IdP.

**Subtitle:** *Before you build it, you find out you already rejected it.*

Slow push-in on the reason line: `shares 3 term(s) [auth, token, shared] … and proposes a change`.

### 1:22–1:52 — The receipt

Click **open the record**. The browser jumps to the real comment, anchor and all, and the
comment highlights.

**Subtitle:** *Every claim opens its source. A decision without evidence is not a decision.*

Then the ledger detail: statement, why, evidence quote, and `SESSION-2026-02` struck
through as superseded.

**Subtitle:** *A replaced decision is never cited as current.*

### 1:52–2:24 — The agent asks

Split screen: Rovo, left; the panel, right. Type into the agent:

> *Check precedent for AUTH-201 before I plan this.*

The tool call fires — `check-precedent` — and the answer comes back with the decision id,
the quote, and the URL.

**Subtitle:** *The same ledger, exposed as MCP tools. An agent can ask before it proposes.*

Hold on the tool name long enough to read. This is the bonus prize.

### 2:24–2:46 — It stays quiet

Cut to the fifth demo issue, `Bump the Node version in the billing worker`.

**Subtitle:** *And when nothing is at stake, it says nothing.*

The panel is calm — no red, no verdict. Then the fourth issue, `Add a schema for
cross-service reporting joins`, gets **related** instead of **contradicts**.

**Subtitle:** *Precision is the product. A panel that cries wolf gets switched off in a week.*

### 2:46–3:00 — Close

Back to the folder. It closes.

> **Precedent** — the decision ledger for Jira.
> `forge` · `rovo:mcp` · MIT · github.com/…

**Subtitle:** *Built for Codegeist 2026.*

---

## Clips to record (before rendering)

| # | Clip | Length | Where |
|---|---|---|---|
| 1 | Ledger page, slow scroll, one row selected | 12s | `/jira/apps/…` global page |
| 2 | Panel on AUTH-201, load → verdict appears | 8s | issue panel |
| 3 | Click *open the record* → comment highlighted | 8s | Jira comment anchor |
| 4 | Ledger detail, superseded row struck through | 6s | global page |
| 5 | Rovo: type the question, tool call, answer | 14s | Rovo Studio |
| 6 | Panel on the quiet issue (no verdict) | 5s | issue panel |
| 7 | Panel on the related issue | 5s | issue panel |

Record at `deviceScaleFactor: 2` so the push-ins stay sharp. Human timing: 80–150 ms per
key, eased mouse. Production URL only, never a dev server.

## Audio

- **Music:** one bed, ~3 min, restrained — a low sustained tone with a slow pulse. Pixabay
  search: *minimal documentary*, *tension bed*. I will list candidates with links for you to
  pick before downloading anything.
- **SFX:** paper/folder open at 0:18, a single low hit at 0:40 when the verdict lands, a
  click at 1:22, nothing else. Three sounds total.
- No VO unless you want it; burned subtitles carry it. If VO, your ElevenLabs "Savvy" voice.

## Rules

- No third-party trademarks on screen (Atlassian chrome is unavoidable and fine; no logos
  of other products).
- No copyrighted music. Pixabay only.
- Everything on screen must be real: real app, real data, real click. No mockups.

## Render

Low priority, sequential, background — one heavy process at a time:

```powershell
$p = Start-Process node -ArgumentList "render.mjs" -PassThru -NoNewWindow
$p.PriorityClass     = 'Idle'
$p.ProcessorAffinity = 0x00F
```

Frames to `D:\video\work\frames\`, encode per 300-frame chunk with `h264_nvenc`, concat at
the end. If it crashes at frame 1800, only the last chunk re-renders.
