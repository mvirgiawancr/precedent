# Privacy

Precedent is a Forge app. It runs inside Atlassian's platform and stores nothing outside it.

## What it reads

- Jira work items (key, summary, description) and their comments, through the Jira REST API
  with the scopes `read:jira-work` and `write:jira-work`.
- The site it is installed on, to key its own storage.

## What it stores

Decisions it has filed — the decision text, the source issue key, the author, and the comment
the decision was quoted from. These live in Forge's hosted key-value storage for your site, and
in a comment on the source work item when a decision is recorded.

## What it sends elsewhere

Nothing. There is no analytics, no third-party service, no LLM call. Matching between a work
item and a recorded decision is deterministic string comparison that runs inside the app.

## Removal

Uninstalling the app removes it from your site. Decisions filed as Jira comments remain in
those comments; the ledger storage is deleted with the installation.

Questions: https://github.com/mvirgiawancr/precedent/issues
