// Pure rendering. No bridge import, so this file also runs in a plain browser preview.

export const el = (tag, props = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid) node.append(kid);
  return node;
};

export const masthead = (tally) =>
  el(
    'header',
    { class: 'masthead' },
    el('h1', { class: 'wordmark', text: 'Precedent' }),
    tally ? el('span', { class: 'tally', text: tally }) : null
  );

const citation = (d) =>
  el(
    'div',
    {},
    d.evidence?.quote ? el('blockquote', { class: 'quote', text: d.evidence.quote }) : null,
    d.evidence?.url
      ? el('a', {
          class: 'source',
          href: d.evidence.url,
          target: '_blank',
          rel: 'noreferrer',
          text: 'open the record'
        })
      : el('span', { class: 'state', text: 'no evidence attached' })
  );

const filing = (hit) => {
  const d = hit.decision;
  return el(
    'li',
    { class: 'filing' },
    el(
      'div',
      { class: 'filing-head' },
      el('span', { class: 'case-no', text: d.id }),
      el('span', { class: 'state', 'data-state': d.state, text: d.state })
    ),
    el('p', { class: 'statement', text: d.statement }),
    d.rationale ? el('p', { class: 'rationale', text: d.rationale }) : null,
    citation(d)
  );
};

export function fault(message) {
  return el('p', { class: 'fault', text: message });
}

export function seedButton(onSeed) {
  const button = el('button', { class: 'action', type: 'button', text: 'Load demo decisions' });
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Filing…';
    try {
      await onSeed();
    } catch (error) {
      button.replaceWith(fault(String(error.message ?? error)));
    }
  });
  return button;
}

/** The seed creates issues, so it has to say where they are or nobody finds them. */
const demoList = (demo) =>
  demo?.length
    ? el(
        'div',
        { class: 'demo' },
        el('p', {
          class: 'also',
          text: 'Open these: the panel catches the first three, relates the fourth, and stays quiet on the fifth.'
        }),
        el(
          'ul',
          { class: 'demo-list' },
          demo.map((issue) =>
            el(
              'li',
              {},
              el('a', {
                class: 'source',
                href: issue.url,
                target: '_blank',
                rel: 'noreferrer',
                text: `${issue.key} · ${issue.summary}`
              })
            )
          )
        )
      )
    : null;

// ---------------------------------------------------------------- issue panel

/** Capture is the other way in: an existing comment that already states the decision. */
function captureButton(onCapture) {
  const note = el('p', { class: 'capture-note' });
  const button = el('button', {
    class: 'action action--quiet',
    type: 'button',
    text: 'Scan comments for decisions'
  });
  button.addEventListener('click', async () => {
    button.disabled = true;
    note.textContent = 'Reading comments…';
    try {
      const { captured, scanned } = await onCapture();
      note.textContent = captured.length
        ? `Filed ${captured.join(', ')} from ${scanned} comment(s).`
        : `Read ${scanned} comment(s); no new decision. A comment counts when it starts with "Decision:".`;
    } catch (error) {
      note.textContent = String(error.message ?? error);
    }
  });
  return el('div', { class: 'capture' }, button, note);
}

export function renderPanel(root, { issueKey, hits, seeded, demo }, onSeed, onCapture) {
  const top = hits[0];
  const contradicting = top?.verdict === 'contradicts';
  const verdict = contradicting
    ? el(
        'div',
        { class: 'verdict' },
        el('span', { class: 'stamp', text: 'Contradicts' }),
        el(
          'div',
          { class: 'verdict-body' },
          el('p', { class: 'verdict-line', text: top.decision.statement }),
          el('p', { class: 'verdict-why', text: top.reason })
        )
      )
    : null;

  // the verdict already states the top decision; listing it again would say it twice
  const rest = contradicting ? hits.slice(1) : hits;

  const body =
    hits.length === 0
      ? el(
          'div',
          { class: 'quiet' },
          el('p', {
            text: seeded
              ? `Nothing recorded for ${issueKey}. The first decision on this work becomes the precedent.`
              : 'The ledger is empty. Load the demo decisions to see how a contradiction reads.'
          }),
          seeded ? null : seedButton(onSeed)
        )
      : el(
          'div',
          {},
          rest.length ? el('p', { class: 'also', text: contradicting ? 'Also on file' : 'On file' }) : null,
          rest.length ? el('ul', { class: 'filings' }, rest.map(filing)) : null,
          contradicting && rest.length === 0
            ? el(
                'div',
                { class: 'verdict-tail' },
                el('p', { class: 'quote', text: top.decision.evidence?.quote ?? '' }),
                top.decision.evidence?.url
                  ? el('a', {
                      class: 'source',
                      href: top.decision.evidence.url,
                      target: '_blank',
                      rel: 'noreferrer',
                      text: 'open the record'
                    })
                  : null
              )
            : null
        );

  root.replaceChildren(
    el(
      'div',
      { class: 'sheet' },
      masthead(issueKey ? `${hits.length} on file` : null),
      verdict,
      body,
      demoList(demo),
      issueKey && onCapture ? captureButton(onCapture) : null
    )
  );
}

// ---------------------------------------------------------------- ledger page

export function renderLedger(root, { decisions, seeded }, options = {}) {
  const { selected, onSelect, onSeed } = options;
  const active = decisions.find((d) => d.id === selected) ?? decisions[0] ?? null;

  const list = decisions.length
    ? el(
        'ul',
        { class: 'index' },
        decisions.map((d) =>
          el(
            'li',
            {},
            el(
              'button',
              {
                class: 'index-row',
                type: 'button',
                'aria-current': String(active?.id === d.id),
                onclick: () => onSelect?.(d.id)
              },
              el(
                'span',
                { class: 'filing-head' },
                el('span', { class: 'case-no', text: d.id }),
                el('span', { class: 'state', 'data-state': d.state, text: d.state })
              ),
              el('span', { class: 'index-statement', text: d.statement })
            )
          )
        )
      )
    : el(
        'div',
        { class: 'quiet' },
        el('p', { text: 'No decisions filed yet.' }),
        seeded ? null : seedButton(onSeed)
      );

  root.replaceChildren(
    el(
      'div',
      { class: 'sheet' },
      masthead(`${decisions.length} on file`),
      el('p', { class: 'lede', text: 'Decisions already made, with the words that decided them.' }),
      el('div', { class: 'ledger' }, el('div', {}, list), detail(active, decisions))
    )
  );
}

function detail(decision, all) {
  if (!decision) {
    return el(
      'div',
      { class: 'quiet' },
      el('p', { text: 'Pick a case number to read the record and the words that decided it.' })
    );
  }
  const replaces = all.filter((d) => d.supersededBy === decision.id);
  return el(
    'article',
    { class: 'detail' },
    el('span', { class: 'case-no', text: decision.id }),
    el('h2', { text: decision.statement }),
    el('p', {
      class: 'meta',
      text: `${decision.state} · decided ${decision.decidedAt} by ${decision.decidedBy}`
    }),
    decision.rationale
      ? el('section', {}, el('h3', { text: 'Why' }), el('p', { text: decision.rationale }))
      : null,
    el(
      'section',
      {},
      el('h3', { text: 'Evidence' }),
      el('p', { class: 'quote', text: decision.evidence?.quote ?? 'None attached.' }),
      decision.evidence?.url
        ? el(
            'p',
            {},
            el('a', {
              class: 'source',
              href: decision.evidence.url,
              target: '_blank',
              rel: 'noreferrer',
              text: 'open the record'
            })
          )
        : null
    ),
    decision.supersededBy
      ? el('section', {}, el('h3', { text: 'Replaced by' }), el('p', { text: decision.supersededBy }))
      : null,
    replaces.length
      ? el('section', {}, el('h3', { text: 'Replaces' }), el('p', { text: replaces.map((d) => d.id).join(', ') }))
      : null
  );
}
