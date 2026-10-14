# agentic-mentions

[![npm version](https://img.shields.io/npm/v/agentic-mentions)](https://www.npmjs.com/package/agentic-mentions)
[![Downloads/month](https://img.shields.io/npm/dm/agentic-mentions)](https://www.npmjs.com/package/agentic-mentions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://opensource.org/license/mit)

[Quickstart](#triage-your-first-mention) · [API and commands](#runtime-surfaces) · [Package](https://www.npmjs.com/package/agentic-mentions)

agentic-mentions is an open-source mention triage toolkit for developers who supply inbound comments.
It deduplicates records and applies text rules to sentiment, intent, urgency, and suggested routes.
A Node.js library, CLI, and Model Context Protocol (MCP) server expose the workflow.

## Install

```sh
npm install agentic-mentions
```

Requires Node.js 18 or later. Includes TypeScript declarations and two runtime dependencies.

## Triage your first mention

No credentials or environment variables are required for local triage.

```sh
npx agentic-mentions mentions triage --text 'Could I get pricing?'
```

The JSON result contains `intent: "lead"`, `urgency: "medium"`, and `suggestedRoute: "reply"`.
For a shared queue, keep the store in the same process:

```js
import { createMentionStore, ingestMentions, queueMentions } from 'agentic-mentions';
const store = createMentionStore();
ingestMentions([{ text: 'Urgent outage problem', source: 'fixture' }], store);
console.log(queueMentions(store)[0].triage);
```

The result has critical urgency and an escalation suggestion. Neither example sends a reply.

## How it works

```text
Supplied JSON / webhook payload / fixtures
                    |
              fingerprint deduplication
                    |
              in-memory mention store
                    |
              keyword-based triage
                    |
              urgency queue -> caller reviews -> mark handled
```

## Why it exists

A mention workflow needs record deduplication and handling state alongside text labels.
Natural and Sentiment offer text-analysis primitives. This package combines fixed rules with a local queue and agent tools.

## Compare

Checked 2026-10-14 against [Natural's source](https://github.com/NaturalNode/natural) and [Sentiment's source](https://github.com/thisandagain/sentiment).
These are local text-analysis alternatives, not managed social-listening services.

| Scope | agentic-mentions | Natural | Sentiment |
| --- | --- | --- | --- |
| Main task | Mention deduplication and triage | Natural language processing primitives | Wordlist-based sentiment scoring |
| Deployment | Your Node.js process | Your Node.js process | Your Node.js process |
| Configuration | Mention records and store | JavaScript APIs | JavaScript APIs and word labels |

## Coverage

| Input or adapter | Status | Behavior |
| --- | --- | --- |
| JSON file | ✓ | CLI ingestion accepts an array or `{items: [...]}` |
| Generic webhook | ✓ | SDK parses payloads or fetches JSON from a supplied URL |
| Fixture mentions | ✓ | SDK loads supplied records |
| Local router | ✓ | SDK generates a receipt without external delivery |
| HTTP router | ✓ | SDK posts `{text}` to a supplied endpoint |
| Social-network APIs | — | No brand-specific connector exists |

Source inventory contains two mention adapters and two routing adapters. Local tests exercise these paths; no external service credentials are verified.
The generic webhook adapter is a parser and fetch client, not a listening HTTP server.

## Common use cases

1. Support developers use Node.js to prioritize supplied complaint records by urgency.
2. Community teams use a JSON export and the CLI to preview triage labels.
3. Agent developers use an MCP client to ingest records and review a session queue.
4. Backend developers use Node.js and a generic JSON endpoint to normalize webhook records.

## Features

- **Deduplication:** fingerprints use account, author, and normalized text within one store.
- **Triage:** rules assign sentiment, five intents, four urgency levels, and three route suggestions.
- **Queue:** unhandled records sort by urgency, then creation timestamp.
- **Handling state:** the SDK marks records handled; CLI and MCP offer a preview first.
- **Text utilities:** SDK exports include statistics, logging, dispatch guards, and routing receipts.

## Runtime surfaces

The Node.js SDK exports the mention workflow and core utilities. The package includes TypeScript types.

CLI commands are `mentions ingest --file PATH`, `mentions queue`, `mentions triage --text TEXT`, and `mentions handle --id ID`.
It also supports `costs`, `mcp`, `--help` / `-h`, and `--version` / `-V`.
The `mentions` prefix is optional for the four mention commands. Handling requires `--live` to change state.

```sh
npx agentic-mentions mcp
# Equivalent dedicated executable:
npx agentic-mentions-mcp
```

The stdio server exposes exactly four tools: `ingest_mentions`, `triage_mention`, `mention_queue`, and `mark_mention_handled`.
Handling previews by default. Set `live: true` to mark handled; an injected approval callback can deny the action.
The default callback approves. It is not an interactive approval prompt.

The built Worker entry has `GET /health` and `POST /summarize` with a JSON `text` string.
It provides text statistics, not mention ingestion. Deploy it yourself; it is not a managed service or a package-root export.

## Delivery and behavior limits

Stores and cost reports live in memory. Separate CLI invocations start fresh; an ingest command does not persist a later queue.
Rules use fixed English keywords. They do not understand context, sarcasm, or every language.
The package suggests reply, ignore, or escalate; it never sends replies or collects social-network mentions automatically.
The HTTP router has a default ten-second timeout and no retries or authentication configuration.
Dispatch costs count characters as units, not money. Mention ingestion and triage do not record dispatch costs.
SDK dispatch is live unless `dryRun: true` is supplied. Preview before each real dispatch and stop when a guard denies it.

## Integration guides

- [Node.js mention queue example](#triage-your-first-mention)
- [CLI and MCP command reference](#runtime-surfaces)
- [Generic webhook input behavior](#coverage)

Any publishable content from a downstream AI workflow must include an appropriate AI disclosure.

## Status

Version 0.1.0 is early; interfaces can change. Public case studies are not yet published in this repository.
Use [GitHub issues](https://github.com/pooriaarab/agentic-mentions/issues) for support.

## FAQ

### Does agentic-mentions collect social-network comments?

agentic-mentions accepts records you supply. It has no social-network API connector.

### Which integrations are verified?

agentic-mentions has local tests for generic input and routing paths. This rewrite verifies no external service with credentials.

### Does agentic-mentions provide a managed listening service?

agentic-mentions runs in your own process. You supply collection, hosting, and persistence.

### How is agentic-mentions different from Natural?

agentic-mentions adds mention records, deduplication, and handling state. Natural supplies broader natural language processing primitives.

### How is agentic-mentions different from Sentiment?

agentic-mentions uses fixed rules for intent, urgency, and routes. Sentiment calculates wordlist-based sentiment scores.

### Does agentic-mentions send replies?

agentic-mentions only suggests routes. Your application decides what happens next.

### Does the queue survive a restart?

agentic-mentions keeps its default store in memory. Your application must persist records if it needs restart recovery.

### What does the cost report measure?

agentic-mentions counts successful core dispatches and character units. It does not measure currency or charge for triage.

## License

MIT.
