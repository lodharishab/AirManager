// VPS-only provisioning. Does not send messages or activate workflows.
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const envFile='/etc/airmanager-mcp.env';
let env=readFileSync(envFile,'utf8');
if(!env.includes('MCP_DOCKER_HOST=')) {
  env=env.replace('MCP_ALLOWED_HOSTS="127.0.0.1,localhost,','MCP_ALLOWED_HOSTS="172.18.0.1,127.0.0.1,localhost,');
  writeFileSync(envFile,env+'MCP_DOCKER_HOST="172.18.0.1"\n',{mode:0o600});
}
const n8n=JSON.parse(readFileSync('/etc/airmanager-mcp-clients/n8n.json'));
n8n.url='http://172.18.0.1:5010/mcp';
writeFileSync('/etc/airmanager-mcp-clients/n8n.json',JSON.stringify(n8n,null,2)+'\n',{mode:0o600});
const credId='airmanagerMcpRead';
writeFileSync('/etc/airmanager-mcp-clients/n8n-import.json',JSON.stringify([{id:credId,name:'Air Manager MCP (read only)',type:'httpHeaderAuth',data:{name:'Authorization',value:n8n.headers.Authorization}}]),{mode:0o600});
const workflow={id:'airmanagerMcpHealth',name:'Air Manager MCP — Connection Check',active:false,nodes:[
  {id:'manual',name:'Run manually',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[0,0],parameters:{}},
  {id:'mcp',name:'Air Manager MCP',type:'@n8n/n8n-nodes-langchain.mcpClient',typeVersion:1.1,position:[260,0],parameters:{serverTransport:'httpStreamable',endpointUrl:n8n.url,authentication:'headerAuth',tool:{__rl:true,mode:'id',value:'get_health'},inputMode:'json',jsonInput:'{}',options:{}},credentials:{httpHeaderAuth:{id:credId,name:'Air Manager MCP (read only)'}}}
],connections:{'Run manually':{main:[[{node:'Air Manager MCP',type:'main',index:0}]]}},settings:{executionOrder:'v1'}};
writeFileSync('/opt/airmanager-mcp/n8n-workflow.json',JSON.stringify(workflow,null,2)+'\n');
const openclaw=JSON.parse(readFileSync('/etc/airmanager-mcp-clients/openclaw.json'));
copyFileSync('/root/.openclaw/openclaw.json','/root/.openclaw/openclaw.json.before-airmanager-mcp');
// Capture CLI output so a client cannot accidentally echo credentials into deployment logs.
execFileSync('openclaw',['mcp','add','airmanager','--url',openclaw.url,'--transport','streamable-http','--header',`Authorization=${openclaw.headers.Authorization}`],{stdio:'pipe'});
console.log('OpenClaw MCP added and probed; n8n credential and manual workflow prepared.');
