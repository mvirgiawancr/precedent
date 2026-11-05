import { invoke, router, view } from '@forge/bridge';
import { renderPanel, renderLedger, fault } from './render.js';

const root = document.getElementById('app');
let selected = null;
let paint = null;
let demo = [];

// Inside Forge the app runs in a sandboxed iframe, so target=_blank is swallowed and the
// evidence link does nothing. Hand the navigation to the host product instead.
document.addEventListener('click', (event) => {
  const link = event.target.closest?.('a.source');
  if (!link) return;
  event.preventDefault();
  const { pathname, search } = new URL(link.href, window.location.origin);
  router.navigate(`${pathname}${search}`);
});

// Seeding files twelve decisions and creates the issues to test them with, so whatever is
// on screen is stale the moment it returns.
async function seed() {
  const result = await invoke('seed');
  if (!result?.created) throw new Error(result?.reason ?? 'Nothing was filed.');
  demo = result.issues ?? [];
  await paint?.();
  return result;
}

// Reading the comments can file decisions, so the panel has to be redrawn — but only when
// something was filed: otherwise the note explaining the result is the answer.
async function capture() {
  const result = await invoke('capture');
  if (result?.captured?.length) await paint?.();
  return result;
}

(async () => {
  try {
    const context = await view.getContext();

    // The host theme decides, not the OS: inside Jira the iframe inherits the site's colour mode.
    const mode = context?.theme?.colorMode;
    if (mode) document.documentElement.dataset.theme = mode;

    // An issue key is the one signal the panel always has and the global page never has,
    // so it decides the view without guessing from moduleKey (which is not guaranteed).
    if (context?.extension?.issue?.key) {
      paint = async () => renderPanel(root, { ...(await invoke('panel')), demo }, seed, capture);
    } else {
      paint = async () =>
        renderLedger(root, { ...(await invoke('ledger')), demo }, {
          selected,
          onSelect: (id) => {
            selected = id;
            paint();
          },
          onSeed: seed
        });
    }
    await paint();
  } catch (error) {
    root.replaceChildren(fault(String(error.message ?? error)));
  }
})();
