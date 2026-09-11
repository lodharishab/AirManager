# Air Manager MCP

Deployed on 8 September 2026 as a separate service on `root@147.93.154.8`.

## Connections

| Client | Endpoint | Configuration |
| --- | --- | --- |
| OpenClaw | `https://zoella-vps.tailae8d17.ts.net:8444/mcp` | Server name `airmanager`, Streamable HTTP |
| n8n on this VPS | `http://172.18.0.1:5010/mcp` | Credential `Air Manager MCP (read only)`, Header Auth |
| Other devices on your tailnet | `https://zoella-vps.tailae8d17.ts.net:8444/mcp` | Streamable HTTP, dedicated bearer credential required |
| Composio | `https://app.zoellastays.com/mcp` | Public HTTPS via Cloudflare, dedicated bearer credential |

The Tailscale address is private to your tailnet and the n8n address stays on the local Docker bridge, but the Composio endpoint is reachable from the public internet. Each client has a distinct credential; none receives the upstream Air Manager API key. Read **Security posture** below before adding another public client.

In n8n, open **Air Manager MCP — Connection Check** and click **Execute workflow**. The workflow calls `get_health`. Change the MCP Client node's Tool to choose another exposed tool, and supply its JSON parameters. Select the existing credential when adding more MCP Client or MCP Client Tool nodes. This workflow has only a manual trigger.

In OpenClaw, the configured server is `airmanager`. For example, ask “Use Air Manager to list my properties” or “Show upcoming check-ins.” A new agent turn discovers the server according to the agent's existing tool policy. The CLI connection has been probed; no messaging channel was started or message sent as part of setup.

## Available tools

All 12 tools are read-only:

- `list_properties`, `get_property`, `list_rooms`
- `list_bookings`, `get_booking`, `get_check_ins`
- `list_guests`, `get_guest`
- `list_expenses`, `get_expense`
- `get_dashboard_stats`, `get_health`

List tools support page/limit where the upstream API does; limits are capped at 100. Property, booking and guest lists support search. Booking lists support status and date filters. Check-in end dates are exclusive. ID tools accept positive integer IDs. No create, update, delete, messaging, payment, arbitrary URL, SQL or shell tools are exposed.

All three client credentials currently grant access to all these tools and all records exposed by the existing Air Manager API. There is no per-property or per-user filtering in this adapter. Add such authorization before sharing credentials with anyone who should see only part of the business.

## Deployment and credentials

- Application: `/opt/airmanager-mcp`
- Service: `airmanager-mcp.service`, enabled at boot with a dynamic non-root user
- Service secrets: `/etc/airmanager-mcp.env`, root-only
- Client connection files: `/etc/airmanager-mcp-clients/n8n.json`, `openclaw.json` and `composio.json`, root-only (mode 0600)
- OpenClaw header reference: `${AIRMANAGER_MCP_AUTHORIZATION}` in `/root/.openclaw/openclaw.json`; the value is in `/root/.openclaw/.env`, mode 0600
- n8n credential is imported into its encrypted credential store

No real credentials are included in this source package. Do not paste the connection-file contents into chats or commit them to source control.

The upstream API key is copied into the service environment during provisioning. If the Air Manager API key is rotated, update the MCP environment too and restart this service. To rotate one client, replace its token in `MCP_CLIENT_TOKENS`, update that client's credential and root-only connection file, then restart MCP. The other client can retain its token.

The Docker bind address and firewall rule target the existing `n8n_default` network (`172.18.0.1`, subnet `172.18.0.0/16`, interface `br-2898170893e7`). If Docker recreates that network with different addressing or an interface name, update `MCP_DOCKER_HOST`, `MCP_ALLOWED_HOSTS`, the n8n endpoint and the specific UFW rule.

## Operations

Run these on the VPS:

```sh
systemctl status airmanager-mcp
journalctl -u airmanager-mcp --since '30 minutes ago'
openclaw mcp doctor airmanager --probe
openclaw mcp probe airmanager
cd /opt/airmanager-mcp
npm test
node smoke.mjs /etc/airmanager-mcp-clients/openclaw.json
```

Audit logs record the client, tool, success and elapsed time, excluding arguments, returned records and credentials. API requests have a 15-second timeout and a 2 MB response cap. Host and Origin checks protect the endpoint; auth is required for all MCP requests. HTTPS uses Tailscale Serve on 8444. Air Manager's existing 8443 proxy remains separate.

For source changes, run `npm ci --ignore-scripts` and `npm test`, copy reviewed files to `/opt/airmanager-mcp`, and restart only `airmanager-mcp`. Do not run the provisioning scripts again as an update procedure: they are first-install records, use this VPS's paths, and may refuse existing credentials or overwrite setup backups.

To disable access, stop and disable `airmanager-mcp`, turn off only `tailscale serve --https=8444 off`, remove the MCP Docker UFW rule, disable the `app.zoellastays.com` nginx site and its DNS record, and remove or disable the `airmanager` OpenClaw server, the n8n MCP credential/workflow and the Composio connection. Do not reset all Tailscale Serve configuration, as Air Manager uses it too.

## Security posture

Public exposure was added on 8 September 2026. The nginx site `app.zoellastays.com` proxies the whole domain root to `127.0.0.1:5010`, so the full 12-tool surface — and every record the Air Manager API exposes, including guest contact details — is reachable from the public internet. Unauthenticated requests are rejected with 401, but the bearer token is the only control in front of that data.

Two gaps are open as of this writing:

- **The origin speaks plain HTTP.** nginx only declares `listen 80`, no TLS certificate is installed on the host, and UFW allows `80/tcp` from anywhere, so the origin also answers on its bare IP. Cloudflare is therefore terminating TLS and reaching the origin unencrypted (Flexible mode), which puts the bearer token in cleartext on the Cloudflare-to-origin hop. To close it: restrict `80/tcp` and `443/tcp` to Cloudflare's published ranges, install a Cloudflare Origin Certificate, add a `listen 443 ssl` server block, and set the zone to Full (Strict).
- **No per-client authorization.** Every credential still reaches every tool and every record, so a leaked token exposes the whole business.

## Verification performed

- SDK integration test passed locally and on the VPS: authenticated MCP initialization/discovery, two distinct clients, tool execution, unauthorized requests, hostile Origin, invalid IDs/dates, upstream errors and credential-free audit output.
- Live adapter checks passed for list, dashboard, check-in and health endpoints, plus property, room, booking and guest details using IDs discovered from real records. Expense detail was skipped because the expense list is empty; its missing-record 404 behavior was verified earlier.
- OpenClaw probe discovered 12 tools.
- Re-verified 8 September 2026: `npm test` passed on the VPS, `smoke.mjs` passed over both the Tailscale and public endpoints (11 tools OK; `get_expense` skipped because the expense table is empty), and `get_health` reported `status: ok` with `database: connected`.
- n8n executed the imported manual workflow successfully through its native MCP Client node; Air Manager reported `status: ok` and `database: connected`.
- Air Manager and MCP services remained active; at original deployment MCP listened on loopback and the Docker bridge only. This is no longer true — see **Security posture**.

OpenClaw's installed doctor may still warn about a literal sensitive header after resolving the environment reference. The saved config uses the environment reference; the credential remains in the private global `.env` file.

## References

- [Official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x)
- [OpenClaw MCP connections](https://docs.openclaw.ai/tools/mcp)
- [n8n MCP Client Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.mcpclienttool/)
