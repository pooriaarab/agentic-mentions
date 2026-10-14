import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, test } from "vitest";
import { createMcpServer } from "./mcp.js";
const text=(r:unknown)=>(r as {content:{text:string}[]}).content[0].text;
describe("mcp",()=>test("serves mention tools",async()=>{const [a,b]=InMemoryTransport.createLinkedPair();const s=createMcpServer();await s.connect(b);const c=new Client({name:"x",version:"1"});await c.connect(a);try{expect((await c.listTools()).tools.map(x=>x.name).sort()).toEqual(["ingest_mentions","mark_mention_handled","mention_queue","triage_mention"]);const r=await c.callTool({name:"triage_mention",arguments:{text:"This is broken"}});expect(JSON.parse(text(r))).toMatchObject({intent:"complaint"});}finally{await c.close();await s.close();}}));
