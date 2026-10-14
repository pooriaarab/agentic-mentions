export { VERSION } from "./version.js";
export * from "./core.js";
export * from "./mentions.js";
import { defineBrand, type BrandConfig } from "./core.js";
import { VERSION } from "./version.js";
export const DEFAULT_BRAND: BrandConfig = defineBrand({
  name: "Agentic mentions", command: "agentic-mentions",
  description: "Collect and triage inbound mentions and comments.",
  keywords: ["mentions", "listening", "triage", "agentic-suite", "cli", "mcp"], version: VERSION,
});
