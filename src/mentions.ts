import { createHash, randomUUID } from "node:crypto";
import { VendorError } from "./core.js";

export type MentionSource = "file" | "webhook" | "fixture" | string;
export type MentionSentiment = "positive" | "negative" | "neutral";
export type MentionIntent = "question" | "complaint" | "praise" | "lead" | "spam";
export type MentionUrgency = "low" | "medium" | "high" | "critical";
export type MentionRoute = "reply" | "ignore" | "escalate";

export interface MentionInput {
  id?: string;
  text: string;
  author?: string;
  account?: string;
  source?: MentionSource;
  url?: string;
  createdAt?: string;
}

export interface Mention extends Required<Pick<MentionInput, "id" | "text" | "source" | "createdAt">> {
  author?: string;
  account?: string;
  url?: string;
  fingerprint: string;
  handled: boolean;
}

export interface MentionTriage {
  mentionId: string;
  sentiment: MentionSentiment;
  intent: MentionIntent;
  urgency: MentionUrgency;
  suggestedRoute: MentionRoute;
  reason: string;
}

export interface MentionStore {
  mentions: Mention[];
  triage: Map<string, MentionTriage>;
}

export function createMentionStore(): MentionStore {
  return { mentions: [], triage: new Map() };
}

function fingerprint(input: MentionInput): string {
  return createHash("sha256")
    .update(`${input.account ?? ""}\n${input.author ?? ""}\n${input.text.trim().toLowerCase()}`)
    .digest("hex");
}

export function ingestMentions(items: MentionInput[], store: MentionStore = createMentionStore()): {
  ingested: Mention[];
  duplicates: Mention[];
  total: number;
} {
  const ingested: Mention[] = [];
  const duplicates: Mention[] = [];
  const known = new Set(store.mentions.map((mention) => mention.fingerprint));
  for (const input of items) {
    if (typeof input.text !== "string" || input.text.trim().length === 0) {
      throw new VendorError("mention needs non-empty text");
    }
    const value = fingerprint(input);
    const existing = store.mentions.find((mention) => mention.fingerprint === value);
    if (known.has(value)) {
      if (existing) duplicates.push(existing);
      continue;
    }
    const mention: Mention = {
      id: input.id?.trim() || randomUUID(),
      text: input.text,
      source: input.source ?? "fixture",
      createdAt: input.createdAt ?? new Date().toISOString(),
      author: input.author,
      account: input.account,
      url: input.url,
      fingerprint: value,
      handled: false,
    };
    known.add(value);
    store.mentions.push(mention);
    ingested.push(mention);
  }
  return { ingested, duplicates, total: store.mentions.length };
}

const SPAM = /\b(buy now|crypto|giveaway|free followers|click here|viagra|casino)\b/i;
const COMPLAINT = /\b(hate|awful|terrible|broken|refund|angry|worst|disappointed|issue|problem)\b/i;
const PRAISE = /\b(love|great|amazing|thanks|thank you|excellent|awesome)\b/i;
const LEAD = /\b(pricing|demo|quote|purchase|buy|interested|sales|enterprise)\b/i;
const URGENT = /\b(urgent|asap|security|outage|data loss|legal|fraud)\b/i;

export function triageMention(mention: Pick<Mention, "id" | "text">): MentionTriage {
  const text = mention.text;
  let intent: MentionIntent = "question";
  if (SPAM.test(text)) intent = "spam";
  else if (COMPLAINT.test(text)) intent = "complaint";
  else if (PRAISE.test(text)) intent = "praise";
  else if (LEAD.test(text)) intent = "lead";
  else if (!text.includes("?")) intent = "praise";

  const sentiment: MentionSentiment = intent === "complaint" ? "negative" : intent === "praise" || intent === "lead" ? "positive" : "neutral";
  const urgency: MentionUrgency = URGENT.test(text) ? "critical" : intent === "complaint" ? "high" : intent === "lead" || intent === "question" ? "medium" : "low";
  const suggestedRoute: MentionRoute = intent === "spam" || intent === "praise" ? "ignore" : urgency === "critical" || intent === "complaint" ? "escalate" : "reply";
  return { mentionId: mention.id, sentiment, intent, urgency, suggestedRoute, reason: `Detected ${intent}; route ${suggestedRoute}.` };
}

const urgencyWeight: Record<MentionUrgency, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function queueMentions(store: MentionStore): Array<Mention & { triage: MentionTriage }> {
  return store.mentions
    .filter((mention) => !mention.handled)
    .map((mention) => {
      const triage = store.triage.get(mention.id) ?? triageMention(mention);
      store.triage.set(mention.id, triage);
      return { ...mention, triage };
    })
    .sort((a, b) => urgencyWeight[b.triage.urgency] - urgencyWeight[a.triage.urgency] || a.createdAt.localeCompare(b.createdAt));
}

export function markHandled(store: MentionStore, id: string): Mention {
  const mention = store.mentions.find((value) => value.id === id);
  if (!mention) throw new VendorError(`mention "${id}" was not found`);
  mention.handled = true;
  return mention;
}

export interface WebhookAdapterOptions { fetchFn?: typeof fetch }
export class GenericWebhookAdapter {
  readonly fetchFn: typeof fetch;
  constructor(options: WebhookAdapterOptions = {}) { this.fetchFn = options.fetchFn ?? fetch; }
  parse(payload: unknown): MentionInput[] {
    const items = Array.isArray(payload) ? payload : typeof payload === "object" && payload !== null && "items" in payload ? (payload as { items: unknown }).items : [payload];
    if (!Array.isArray(items)) throw new VendorError("webhook payload needs an items array or mention object");
    return items.map((item) => {
      if (typeof item !== "object" || item === null) throw new VendorError("webhook mention must be an object");
      const value = item as Record<string, unknown>;
      const text = value.text ?? value.body ?? value.message;
      if (typeof text !== "string") throw new VendorError("webhook mention needs text");
      return { id: typeof value.id === "string" ? value.id : undefined, text, author: typeof value.author === "string" ? value.author : undefined, account: typeof value.account === "string" ? value.account : undefined, url: typeof value.url === "string" ? value.url : undefined, createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined, source: "webhook" };
    });
  }
  async fetchPayload(url: string): Promise<MentionInput[]> {
    try {
      const response = await this.fetchFn(url);
      if (!response.ok) throw new VendorError(`webhook fetch got status ${response.status}`, { status: response.status });
      return this.parse(await response.json());
    } catch (error) {
      if (error instanceof VendorError) throw error;
      throw new VendorError(`webhook fetch failed: ${String(error)}`, { cause: error });
    }
  }
}

export class FixtureMentionAdapter {
  constructor(private readonly fixtures: MentionInput[]) {}
  async load(): Promise<MentionInput[]> { return this.fixtures.map((item) => ({ ...item, source: item.source ?? "fixture" })); }
}
