#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { getCostReport, GuardError, VendorError } from "./core.js";
import { createMentionStore, ingestMentions, markHandled, queueMentions, triageMention, type MentionStore } from "./mentions.js";
import { DEFAULT_BRAND } from "./index.js";
import { VERSION } from "./version.js";
export class UsageError extends Error { constructor(message: string) { super(message); this.name = "UsageError"; } }
export type CliCommand = "ingest" | "queue" | "triage" | "handle" | "costs" | "mcp" | "help" | "version";
export interface CliRequest { command: CliCommand; text?: string; file?: string; id?: string; dryRun: boolean; }
export function parseArgs(argv: string[]): CliRequest {
 const request: CliRequest={command:"help",dryRun:true}; const args=[...argv]; let first=args.shift();
 if (!first || first==="--help" || first==="-h") return request; if(first==="--version"||first==="-V") return {...request,command:"version"};
 if(first==="mentions") first=args.shift(); if(!first || !["ingest","queue","triage","handle","costs","mcp"].includes(first)) throw new UsageError(`unknown command "${first}"`);
 request.command=first as CliCommand;
 while(args.length){ const flag=args.shift()!; if(flag==="--live"){request.dryRun=false;continue;} if(["--text","--file","--id"].includes(flag)&&args.length){const v=args.shift()!; if(flag==="--text")request.text=v; if(flag==="--file")request.file=v; if(flag==="--id")request.id=v; continue;} throw new UsageError(`unknown flag "${flag}" for "${request.command}"`); }
 if(request.command==="ingest"&&!request.file) throw new UsageError("ingest needs --file"); if(request.command==="triage"&&!request.text) throw new UsageError("triage needs --text"); if(request.command==="handle"&&!request.id) throw new UsageError("handle needs --id"); return request;
}
export interface CliIo { out(line:string):void; err(line:string):void; readFile(path:string):string; store?: MentionStore; router?: unknown; }
function defaultIo():CliIo{return{out:console.log,err:console.error,readFile:(p)=>readFileSync(p,"utf8"),store:createMentionStore()};}
function helpText(){return `${DEFAULT_BRAND.name} ${VERSION}\n\nUsage: ${DEFAULT_BRAND.command} mentions <command> [flags]\n\nCommands:\n  mentions ingest --file <p>   Ingest JSON mentions.\n  mentions queue               Print unhandled mentions by urgency.\n  mentions triage --text <t>   Classify one mention.\n  mentions handle --id <id>    Mark a mention handled (requires --live).\n  costs                        Print cost report.\n  mcp                          Start MCP server.\n\nDry-run is the default. --live is required to mark handled.`;}
export async function runCli(argv:string[],io:CliIo=defaultIo()):Promise<number>{let r:CliRequest;try{r=parseArgs(argv);}catch(e){io.err(e instanceof Error?e.message:String(e));return 2;}try{switch(r.command){case"help":io.out(helpText());return 0;case"version":io.out(VERSION);return 0;case"ingest":{const raw=JSON.parse(io.readFile(r.file!));const items=Array.isArray(raw)?raw:raw.items;io.out(JSON.stringify(ingestMentions(items,io.store ?? (io.store = createMentionStore()))));return 0;}case"queue":io.out(JSON.stringify(queueMentions(io.store ?? (io.store = createMentionStore()))));return 0;case"triage":io.out(JSON.stringify(triageMention({id:"preview",text:r.text!})));return 0;case"handle":if(r.dryRun){io.out(JSON.stringify({dryRun:true,id:r.id,action:"markHandled"}));return 0;}io.out(JSON.stringify(markHandled(io.store ?? (io.store = createMentionStore()),r.id!)));return 0;case"costs":io.out(JSON.stringify(getCostReport()));return 0;case"mcp":{const {startMcp}=await import("./mcp.js");await startMcp();return 0;}}}catch(e){if(e instanceof GuardError||e instanceof VendorError||e instanceof SyntaxError){io.err(`${e.name}: ${e.message}`);return 1;}throw e;}}
function isMainModule(){try{return typeof process.argv[1]==="string"&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href;}catch{return false;}}
if(isMainModule())runCli(process.argv.slice(2)).then(c=>{if(c)process.exit(c);},e=>{console.error(String(e));process.exit(1);});
