import { describe, expect, test } from "vitest";
import { parseArgs, runCli, type CliIo } from "./cli.js";
import { createMentionStore } from "./mentions.js";
function io(): CliIo & { lines:string[] } { const lines:string[]=[]; return {lines,out:(s)=>lines.push(s),err:(s)=>lines.push(s),readFile:()=>JSON.stringify([{id:"a",text:"Need pricing?"}]),store:createMentionStore()}; }
describe("mentions CLI",()=>{test("parses nested command",()=>expect(parseArgs(["mentions","triage","--text","hello?"]).command).toBe("triage"));test("ingests and queues",async()=>{const x=io();expect(await runCli(["mentions","ingest","--file","x"],x)).toBe(0);expect(await runCli(["mentions","queue"],x)).toBe(0);expect(JSON.parse(x.lines[1])[0].id).toBe("a");});test("handle defaults to preview",async()=>{const x=io();await runCli(["mentions","ingest","--file","x"],x);await runCli(["mentions","handle","--id","a"],x);expect(JSON.parse(x.lines[1]).dryRun).toBe(true);});});
