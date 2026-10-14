# Agentic mentions

Collect, deduplicate, and triage inbound mentions and comments for accounts you own.

## Install and run

```sh
npm install
npm run build
node dist/cli.js --help
node dist/cli.js mentions ingest --file mentions.json
node dist/cli.js mentions queue
node dist/cli.js mentions triage --text "Could I get pricing?"
node dist/cli.js mentions handle --id <id>        # preview (default)
node dist/cli.js mentions handle --id <id> --live # mark handled
```

## Library

```js
import { createMentionStore, ingestMentions, queueMentions, triageMention } from "agentic-mentions";
const store = createMentionStore();
ingestMentions([{ text: "I need help with billing", source: "fixture" }], store);
console.log(queueMentions(store));
console.log(triageMention({ id: "preview", text: "Great work!" }));
```

`GenericWebhookAdapter` parses generic webhook payloads (`{items: [...]}` or an array) and accepts an injected `fetchFn` for testability. `FixtureMentionAdapter` provides deterministic fixtures. Adapter failures throw `VendorError`.

## MCP tools

- `ingest_mentions`
- `triage_mention`
- `mention_queue`
- `mark_mention_handled` (dry-run by default; `live: true` and approval required)

This pack only drafts routes (`reply`, `ignore`, or `escalate`); it never sends replies. Any publishable content created by a downstream AI workflow must include an appropriate AI disclosure.
