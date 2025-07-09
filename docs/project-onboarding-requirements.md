# Project On-Boarding Requirements

These guidelines describe **everything a new project must supply** to appear in the Happy-Observatory dashboard and be managed through the happy-devkit bridge.

The document is intentionally prescriptive; when every project follows the same contract, the dashboard can auto-discover and manage them without bespoke code.

---

## 1. High-level Flow

1. A JSON configuration file for the project is placed in the bridge repository at `config/projects/<id>.json`.
2. The bridge server reads all JSON files on boot and exposes them via `GET /api/projects` (and nested project endpoints).
3. The dashboard queries `/api/projects` through its proxy; the returned metadata seeds the UI and WebSocket routing.
4. All subsequent REST & WS calls are **project-scoped** using the `id` defined in the JSON file:
   * HTTP  `/api/projects/<id>/agents/...`
   * WS    `/ws/projects/<id>`

---

## 2. Project ID Rules

• **Uniqueness**: must be unique across all JSON files.  
• **Format**: either a UUIDv4 string *or* a slug matching `/^[a-z0-9-]{3,64}$/i`.

Choose a human-friendly slug when possible (e.g. `"devkit"`, `"scopecam"`).

---

## 3. JSON Configuration Schema

Location: `config/projects/<id>.json`

> 📝  *State path convention* – for projects that write local data, we recommend the
> `~/.local/state/<project-name>/` directory, as documented in
> **PROJECT-INTEGRATION-REQUIREMENTS.md** inside Happy-DevKit. The optional `path`
> field below should point to that directory (or to the project checkout path if
> different).

```jsonc
{
  "id": "devkit",                  // required – slug or UUID
  "name": "Happy DevKit",          // required – display name
  "path": "~/Development/devkit",  // optional – local checkout path
  "description": "Core toolkit",   // optional – blurb shown in UI

  "icon": "🛠️",                    // optional – emoji or URL
  "color": "#3B82F6",             // optional – accent colour (hex or tailwind token)

  "dashboards": {                   // optional – named dashboards & widgets
    "main": {
      "id": "devkit-main",
      "name": "DevKit Overview",
      "widgets": ["agent-status", "build-metrics"]
    }
  },

  "telemetryMap": {                 // optional – map UI metric keys → OTEL metric names
    "cpu": "system.cpu.usage",
    "memory": "system.memory.usage"
  },

  "hasSubmoduleMCP": true,          // true if this project ships its own MCP server
  "mcpServerUrl": "http://localhost:8001",  // where that server listens (if any)

  "bridgeUrl": "http://localhost:8080",     // override bridge URL (rare)
  "wsUrl": "ws://localhost:8080/ws/projects/devkit"  // override ws URL (rare)
}
```

### MCP transport

Projects that set `hasSubmoduleMCP: true` must embed an **MCP server that speaks
the standard *stdio* transport** (stdin/stdout). The happy-devkit *bridge* acts
as an adaptor, converting stdio messages to the HTTP / WebSocket facade the
dashboard consumes. You **do not** need to expose stdio ports directly to the
dashboard – just ensure your MCP process follows the transport contract defined
in Happy-DevKit’s `PROJECT-INTEGRATION-REQUIREMENTS.md`.

### Validation

The bridge runs JSON-schema validation and will refuse to start if:

1. Required keys are missing (`id`, `name`).
2. Unknown additional top-level keys are present (helps catch typos).
3. `id` duplicates another file.

---

## 4. MCP / Agent Server Requirements

If `hasSubmoduleMCP` is `true`, the project must expose the following endpoints **under its own base URL** (e.g. `http://localhost:8001`).

### REST Endpoints

| Method | Path                                                         | Purpose |
|--------|--------------------------------------------------------------|---------|
| GET    | `/api/projects/<id>/agents/status`                           | List or single agent status (query `agentId` optional) |
| POST   | `/api/projects/<id>/agents/command`                          | Send command body `{"agentId":"…","command":"start|stop|pause"}` |
| GET    | `/api/projects/<id>/telemetry/metrics`                       | Return latest metric snapshot |
| POST   | `/api/projects/<id>/console/execute`                         | Execute shell/REPL command within project context |


### WebSocket Channel

`/ws/projects/<id>` must accept a JSON **subscribe** message:

```json
{ "type": "subscribe", "projectId": "<id>" }
```

and emit messages of the form:

```json
{
  "type": "telemetry" | "agent_status" | "log" | "error",
  "projectId": "<id>",
  "data": { ... },
  "timestamp": "2025-07-08T12:34:56Z"
}
```

Unsubscribe message:

```json
{ "type": "unsubscribe", "projectId": "<id>" }
```

### CORS & TLS

• Allow `Origin: *` in dev or whitelist the dashboard’s origin in prod.  
• HTTPS strongly recommended for remote deployments.

---

## 5. Metric Naming Conventions

Telemetry map keys should use **camelCase** and map to full OTEL metric names.  
Example: `"cpu": "system.cpu.usage"`.

Metrics must also match the columns in the standard **SQLite telemetry schema**
maintained by Happy-DevKit (see
`PROJECT-INTEGRATION-REQUIREMENTS.md#sqlite-telemetry-schema`). When you add a
new metric, be sure to extend both the SQLite schema and the OTEL mapping.

OTEL meters must include the `projectId` as attribute:

```ts
meter.createObservableGauge('system.cpu.usage', { attributes: { projectId: '<id>' } })
```

---

## 6. Testing Checklist (curl examples)

```bash
# List all projects
curl -s http://localhost:8080/api/projects | jq

# Agent status
curl -s http://localhost:8080/api/projects/devkit/agents/status | jq

# Send start command
curl -X POST http://localhost:8080/api/projects/devkit/agents/command \
     -H 'Content-Type: application/json' \
     -d '{"agentId":"orchestrator-001","command":"start"}'

# Open WebSocket (npx wscat)
wscat -c ws://localhost:8080/ws/projects/devkit
```

Add these commands to your project’s README so new contributors can smoke-test quickly.

---

## 7. On-boarding Checklist (for project maintainers)

1. [ ] Create `config/projects/<id>.json` with all required fields.
2. [ ] Ensure MCP/agent server exposes the REST & WS endpoints above.
3. [ ] Confirm endpoints respond when bridge is running (`curl` tests pass).
4. [ ] Add metric names to `telemetryMap` (or leave empty if not used).
5. [ ] Submit PR to happy-devkit repository → after merge the bridge will auto-discover your project.

Once merged, the project will appear in the dashboard after the next refresh — no code changes in Happy-Observatory required.

---

### Need help?

*Ping the #observatory channel or open a GitHub Discussion with the tag `project-onboarding`.*

---

## Further reading

The Happy-DevKit repository includes a complementary set of documents that go
deeper into the server-side contracts:

* `PROJECT-INTEGRATION-REQUIREMENTS.md` – full schema & MCP specification
* `PROJECT-INTEGRATION-QUICKSTART.md` – minimal examples and common pitfalls
* `PROJECT-INTEGRATION-ARCHITECTURE.md` – visual data-flow diagrams
* `OBSERVATORY-PROJECT-SUPPORT.md` – notes aimed at dashboard maintainers

Reading these alongside this file will give you a 360-degree view of the
integration pipeline.
