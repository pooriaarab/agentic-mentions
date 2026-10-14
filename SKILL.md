---
name: agentic-mentions
description: Collect and triage brand mentions and inbound comments. Keywords: mentions,listening,triage,agentic-suite,cli,mcp.
---

# agentic-mentions

Collect and triage brand mentions and inbound comments.

## Use the SDK

```js
import { summarizeText, dispatchText } from "agentic-mentions";

summarizeText("some text");
await dispatchText("some text", { dryRun: true });
```

## Use the CLI

```sh
agentic-mentions summary --text "some text"
agentic-mentions dispatch --text "some text" --dry-run
```

## Use the MCP server

Start the server with `agentic-mentions mcp`. Call `summarize_text`
for stats, `dispatch_text` for routes, `get_cost_report` for costs.

## Rules

- Preview each route with dry run first.
- Report guard denials and adapter errors as failures.
- Read the cost report at the end.
