import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createLogger, GuardError, VendorError, type Logger } from "./core.js";
import { createMentionStore, ingestMentions, markHandled, queueMentions, triageMention, type MentionStore } from "./mentions.js";
import { DEFAULT_BRAND } from "./index.js";
export interface McpDeps { store?: MentionStore; logger?: Logger; approval?: (action:string)=>boolean; guards?: unknown; router?: unknown; }
const ok=(value:unknown)=>({content:[{type:"text" as const,text:JSON.stringify(value)}]});
const fail=(e:unknown)=>({content:[{type:"text" as const,text:JSON.stringify({error:e instanceof Error?e.message:String(e)})}],isError:true as const});
export function createMcpServer(deps:McpDeps={}):McpServer { const store=deps.store??createMentionStore(); const approval=deps.approval??(()=>true); const server=new McpServer({name:DEFAULT_BRAND.command,version:DEFAULT_BRAND.version});
 server.registerTool("ingest_mentions",{description:"Ingest inbound mention records.",inputSchema:{items:z.array(z.object({id:z.string().optional(),text:z.string(),author:z.string().optional(),account:z.string().optional(),url:z.string().optional(),createdAt:z.string().optional(),source:z.string().optional()}))},annotations:{readOnlyHint:false}},async({items})=>{try{return ok(ingestMentions(items,store));}catch(e){return fail(e);}});
 server.registerTool("triage_mention",{description:"Classify sentiment, intent, urgency, and suggested route. Drafts only.",inputSchema:{text:z.string(),id:z.string().optional()},annotations:{readOnlyHint:true}},async({text,id})=>ok(triageMention({id:id??"preview",text})));
 server.registerTool("mention_queue",{description:"List unhandled mentions sorted by urgency.",inputSchema:{},annotations:{readOnlyHint:true}},async()=>ok(queueMentions(store)));
 server.registerTool("mark_mention_handled",{description:"Mark a mention handled. Requires live=true and approval.",inputSchema:{id:z.string(),live:z.boolean().optional()},annotations:{readOnlyHint:false,destructiveHint:false}},async({id,live})=>{try{if(!live)return ok({dryRun:true,id,action:"markHandled"});if(!approval("markHandled"))throw new GuardError("approval denied for markHandled");return ok(markHandled(store,id));}catch(e){return fail(e);}});
 return server; }
export async function startMcp(deps:McpDeps={}):Promise<void>{const server=createMcpServer(deps);await server.connect(new StdioServerTransport());}
