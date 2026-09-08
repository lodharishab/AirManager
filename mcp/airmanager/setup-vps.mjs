// Run as root on the VPS after npm ci. Secrets never leave the VPS.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import dotenv from '/opt/AirManager/node_modules/dotenv/lib/main.js';
const secretFile='/etc/airmanager-mcp.env';
if(existsSync(secretFile)) throw new Error('Existing MCP credentials found; refusing to overwrite');
const upstream=dotenv.parse(readFileSync('/opt/AirManager/.env')).AIRMANAGER_API_KEY;
if(!upstream || /[\r\n]/.test(upstream)) throw new Error('Missing or invalid Air Manager API key');
const tokens={n8n:randomBytes(32).toString('hex'),openclaw:randomBytes(32).toString('hex')};
const hostname='zoella-vps.tailae8d17.ts.net';
const env={AIRMANAGER_BASE_URL:'http://127.0.0.1:5000',AIRMANAGER_API_KEY:upstream,MCP_CLIENT_TOKENS:JSON.stringify(tokens),MCP_ALLOWED_HOSTS:`127.0.0.1,localhost,${hostname}`,HOST:'127.0.0.1',PORT:'5010'};
// systemd EnvironmentFile quoted values; escape backslash and double quote.
writeFileSync(secretFile,Object.entries(env).map(([k,v])=>`${k}="${v.replaceAll('\\','\\\\').replaceAll('"','\\"')}"`).join('\n')+'\n',{mode:0o600,flag:'wx'});
mkdirSync('/etc/airmanager-mcp-clients',{mode:0o700});
for(const [name,token] of Object.entries(tokens)) writeFileSync(`/etc/airmanager-mcp-clients/${name}.json`,JSON.stringify({url:`https://${hostname}:8444/mcp`,transport:'streamable-http',headers:{Authorization:`Bearer ${token}`}},null,2)+'\n',{mode:0o600,flag:'wx'});
console.log('Created separate n8n and OpenClaw credentials in root-only files.');
