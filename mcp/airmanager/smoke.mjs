import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const client=new Client({name:'airmanager-deployment-test',version:'1'});
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(process.argv[3] || config.url),{requestInit:{headers:config.headers}}));
  const {tools}=await client.listTools();
  if(tools.length!==12) throw new Error('Unexpected tool count');
  const ids={};
  const sources={get_property:'list_properties',list_rooms:'list_properties',get_booking:'list_bookings',get_guest:'list_guests',get_expense:'list_expenses'};
  for(const tool of tools) {
    if(sources[tool.name] && !ids[sources[tool.name]]) {console.log(`${tool.name}: skipped (no records)`);continue;}
    const args=sources[tool.name]?{id:ids[sources[tool.name]]}:{};
    const result=await client.callTool({name:tool.name,arguments:args});
    if(result.isError) throw new Error(`${tool.name}: ${JSON.stringify(result)}`);
    const data=JSON.parse(result.content[0].text);
    const rows=Array.isArray(data)?data:Array.isArray(data.data)?data.data:Array.isArray(data.items)?data.items:[];
    if(rows[0]?.id) ids[tool.name]=rows[0].id;
    console.log(`${tool.name}: OK`);
  }
} finally { await client.close(); }
