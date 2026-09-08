import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createApp } from './server.mjs';

test('MCP protocol, two clients, authentication, validation and upstream failures',async()=>{
  const calls=[]; const audits=[];
  const tokens={n8n:'a'.repeat(40),openclaw:'b'.repeat(40)};
  const app=createApp({baseUrl:'http://127.0.0.1:5000',apiKey:'upstream-secret',tokens,audit:v=>audits.push(v),fetchImpl:async(url,options)=>{
    calls.push({url:String(url),options});
    if(url.pathname.endsWith('/999')) return new Response('sensitive error',{status:500});
    return Response.json({items:[],total:0});
  }});
  const listener=app.listen(0,'127.0.0.1'); await new Promise(r=>listener.once('listening',r));
  const url=new URL(`http://127.0.0.1:${listener.address().port}/mcp`);
  const clients=[];
  try {
    assert.equal((await fetch(url,{method:'POST'})).status,401);
    assert.equal((await fetch(url,{method:'POST',headers:{authorization:'Bearer wrong'}})).status,401);
    assert.equal((await fetch(url,{method:'POST',headers:{authorization:`Bearer ${tokens.n8n}`,origin:'https://evil.example'}})).status,403);
    for(const token of Object.values(tokens)) {
      const client=new Client({name:'test',version:'1'}); clients.push(client);
      await client.connect(new StreamableHTTPClientTransport(url,{requestInit:{headers:{authorization:`Bearer ${token}`}}}));
      const {tools}=await client.listTools(); assert.equal(tools.length,12); assert(tools.every(t=>t.annotations.readOnlyHint));
      assert.equal((await client.callTool({name:'list_properties',arguments:{search:'A & B',limit:2}})).isError,undefined);
    }
    assert(calls[0].url.includes('search=A+%26+B')); assert.equal(calls[0].options.headers['x-api-key'],'upstream-secret');
    const before=calls.length;
    assert.equal((await clients[0].callTool({name:'get_booking',arguments:{id:-1}})).isError,true);
    assert.equal((await clients[0].callTool({name:'get_check_ins',arguments:{startDate:'2026-02-30'}})).isError,true);
    assert.equal((await clients[0].callTool({name:'list_bookings',arguments:{startDate:'2026-09-10',endDate:'2026-09-01'}})).isError,true);
    assert.equal(calls.length,before);
    const failure=await clients[0].callTool({name:'get_booking',arguments:{id:999}});
    assert.equal(failure.isError,true); assert(!JSON.stringify(failure).includes('sensitive'));
    assert(audits.some(v=>v.includes('openclaw'))); assert(!audits.join('').includes('upstream-secret'));
  } finally {await Promise.all(clients.map(c=>c.close())); await new Promise(r=>listener.close(r));}
});
