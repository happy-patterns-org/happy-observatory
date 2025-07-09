# ScopeCam Integration Guide for Happy Observatory

## Overview

Happy Observatory now provides first-class integration with ScopeCam projects, enabling comprehensive test orchestration, monitoring, and agentic test management through the MCP (Model Context Protocol) interface.

## Architecture

### Integration Points

1. **MCP Tools Integration** - All 7 ScopeCam tools available through MCP
2. **Telemetry Pipeline** - SQLite, Prometheus, and WebSocket streaming
3. **Test Guardian Agent** - Autonomous test health monitoring
4. **Shell Command Interface** - `sct` commands via integrated terminal
5. **Real-time Dashboards** - Test metrics, coverage, and performance

### Data Flow

```
ScopeCam Project → MCP Server → Happy Observatory
                      ↓              ↓
                  Telemetry DB    WebSocket
                      ↓              ↓
                  Prometheus    Real-time UI
```

## MCP Module Configuration

### Available Tools

1. **test_selector** - Intelligently selects tests based on changes
   - Parameters: `paths[]`, `context`, `risk_level`
   - Capabilities: change-analysis, risk-assessment, test-prioritization

2. **failure_analyzer** - Diagnoses test failures and suggests fixes
   - Parameters: `test_id`, `error_log`, `history`
   - Capabilities: root-cause-analysis, fix-suggestions, pattern-detection

3. **test_orchestrator** - Orchestrates test execution
   - Parameters: `suite`, `parallel`, `environment`
   - Capabilities: parallel-execution, resource-optimization, scheduling

4. **coverage_optimizer** - Optimizes test coverage
   - Parameters: `target_coverage`, `focus_areas[]`
   - Capabilities: gap-analysis, coverage-prediction, test-generation

5. **performance_monitor** - Monitors test performance
   - Parameters: `threshold_ms`, `track_memory`
   - Capabilities: performance-tracking, bottleneck-detection, trend-analysis

6. **flakiness_detector** - Detects and manages flaky tests
   - Parameters: `sensitivity`, `quarantine`
   - Capabilities: flakiness-detection, stability-scoring, auto-retry

7. **test_guardian** - AI agent for test health monitoring
   - Parameters: `mode`, `scope[]`
   - Capabilities: health-monitoring, predictive-maintenance, auto-remediation

### Available Resources

1. **test_results** - `scopecam://test-results`
2. **coverage_reports** - `scopecam://coverage`
3. **performance_metrics** - `scopecam://performance`
4. **flakiness_data** - `scopecam://flakiness`
5. **test_inventory** - `scopecam://inventory`

## Shell Integration

### Available Commands

```bash
# Run test suite
sct run --parallel

# Select tests based on changes
sct select --changed

# Analyze failures
sct analyze --last-run

# Coverage report
sct coverage --detailed

# Test Guardian control
sct guardian status
sct guardian mode auto-fix

# Flaky test management
sct flaky list
sct flaky quarantine <test-id>

# Performance analysis
sct perf --slow-tests
```

### Environment Variables

```bash
export SCOPECAM_PROJECT_ROOT=/path/to/project
export SCOPECAM_MCP_PORT=5173
export SCOPECAM_TELEMETRY_ENABLED=true
export SCOPECAM_GUARDIAN_MODE=suggest
```

## Telemetry Integration

### Metrics Collection

- **Location**: `~/.local/state/agentic/telemetry/metrics.db`
- **Format**: SQLite database with metrics, events, and traces tables
- **Retention**: 30 days default, configurable

### Prometheus Export

```bash
# Export endpoint
GET /telemetry/export?format=prometheus

# Example metrics
scopecam_tests_total{project="myproject",status="passed"} 245
scopecam_tests_duration_seconds{project="myproject",quantile="0.95"} 2.5
scopecam_coverage_percentage{project="myproject",type="overall"} 87.3
```

### WebSocket Streaming

```javascript
// Connect to telemetry stream
ws://localhost:8080/telemetry/ws

// Message format
{
  "type": "metric|event|trace",
  "payload": {
    "name": "scopecam.tests.completed",
    "value": 150,
    "timestamp": "2024-01-15T10:30:00Z",
    "labels": { "project": "myproject", "suite": "unit" }
  }
}
```

## Test Guardian Integration

### Configuration

```json
{
  "testGuardian": {
    "enabled": true,
    "mode": "suggest",
    "scope": ["unit", "integration", "e2e"],
    "autoFix": {
      "enabled": false,
      "approval": "required"
    },
    "monitoring": {
      "interval": 300,
      "healthThreshold": 80
    }
  }
}
```

### Modes

1. **Monitor** - Passive observation and reporting
2. **Suggest** - Active suggestions for improvements
3. **Auto-Fix** - Autonomous remediation (with safeguards)

## Dashboard Access

### 1. Integrated Dashboard
- Automatically available when ScopeCam project detected
- Toggle with "Show Test Dashboard" button
- Real-time metrics and tool execution

### 2. Standalone Web UI
```bash
# Access at http://localhost:3000
npm run dev
```

### 3. Grafana Integration
```yaml
# docker-compose.yml
services:
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_INSTALL_PLUGINS=prometheus
```

## Operational Workflows

### Daily Usage Pattern

1. **Morning Check**
   - Open Happy Observatory
   - Select ScopeCam project
   - Review Test Guardian health score
   - Check overnight test runs

2. **Development Flow**
   - Write code
   - Use `sct select --changed` to run relevant tests
   - Monitor real-time test results
   - Address failures with `sct analyze`

3. **CI/CD Integration**
   - Automatic test selection on PR
   - Failure analysis in comments
   - Coverage trends in dashboard

### Test Failure Workflow

```bash
# 1. Identify failure
sct run --failed-only

# 2. Analyze root cause
sct analyze --test-id failing_test_123

# 3. Apply suggested fix
sct guardian suggest --test-id failing_test_123

# 4. Verify fix
sct run --test-id failing_test_123 --repeat 10
```

## Monitoring & Observability

### Health Checks

```bash
# Check MCP server health
curl http://localhost:5173/mcp/health

# Check telemetry pipeline
curl http://localhost:8080/telemetry/health

# Test Guardian status
sct guardian health
```

### Debugging

1. **Enable debug logging**
   ```bash
   export SCOPECAM_LOG_LEVEL=debug
   export HAPPY_OBSERVATORY_DEBUG=true
   ```

2. **Check logs**
   - MCP Server: `~/.scopecam/logs/mcp-server.log`
   - Telemetry: `~/.local/state/agentic/telemetry/events.log`
   - Observatory: Browser DevTools Console

3. **Common issues**
   - Port conflicts: Check ports 5173, 8080
   - Permission errors: Ensure write access to telemetry DB
   - Connection timeouts: Verify MCP server is running

## Integration Points

### For Other Systems

1. **REST API**
   ```bash
   GET /api/scopecam/metrics?project={id}
   POST /api/scopecam/tools/execute
   GET /api/scopecam/resources/{resource}
   ```

2. **WebSocket Subscriptions**
   ```javascript
   const ws = new WebSocket('ws://localhost:8080/scopecam/subscribe')
   ws.send(JSON.stringify({
     subscribe: ['test-results', 'coverage-updates'],
     project: 'myproject'
   }))
   ```

3. **Direct SQLite Access**
   ```sql
   SELECT * FROM metrics 
   WHERE project_id = 'myproject' 
   AND timestamp > datetime('now', '-1 hour')
   ```

## Configuration Reference

### ScopeCam Project Files

1. **scopecam.config.json**
   ```json
   {
     "version": "1.0",
     "mcp": {
       "enabled": true,
       "port": 5173,
       "tools": ["all"]
     },
     "telemetry": {
       "enabled": true,
       "export": ["prometheus", "json"]
     }
   }
   ```

2. **test-guardian.config.json**
   ```json
   {
     "mode": "suggest",
     "rules": {
       "flakyThreshold": 0.1,
       "slowTestMs": 5000,
       "coverageTarget": 80
     }
   }
   ```

### Happy Observatory Settings

```json
{
  "scopecam": {
    "autoDetect": true,
    "telemetrySync": true,
    "dashboardDefault": "integrated",
    "shellTerminal": true
  }
}
```

## Quick Start Checklist

- [ ] Install ScopeCam in your project
- [ ] Configure MCP server (port 5173)
- [ ] Enable telemetry collection
- [ ] Add project to Happy Observatory
- [ ] Verify ScopeCam indicator appears
- [ ] Open Test Dashboard
- [ ] Run initial test suite
- [ ] Configure Test Guardian mode
- [ ] Set up monitoring alerts
- [ ] Integrate with CI/CD

## Troubleshooting

### MCP Connection Issues
```bash
# Check if MCP server is running
ps aux | grep mcp-server

# Restart MCP server
sct server restart

# Check logs
tail -f ~/.scopecam/logs/mcp-server.log
```

### Telemetry Not Updating
```bash
# Verify telemetry service
systemctl status scopecam-telemetry

# Check database permissions
ls -la ~/.local/state/agentic/telemetry/

# Reset telemetry
sct telemetry reset
```

### Test Guardian Not Working
```bash
# Check guardian status
sct guardian status

# View guardian logs
sct guardian logs --tail 50

# Reset guardian state
sct guardian reset
```

## Best Practices

1. **Project Setup**
   - Keep ScopeCam config in version control
   - Use consistent naming for test suites
   - Configure appropriate telemetry retention

2. **Daily Operations**
   - Review Test Guardian suggestions daily
   - Address flaky tests promptly
   - Monitor coverage trends

3. **Performance**
   - Use parallel execution for large suites
   - Set appropriate test timeouts
   - Monitor resource usage

4. **Security**
   - Restrict MCP server to localhost
   - Use authentication for remote access
   - Sanitize telemetry data

## Support

- GitHub Issues: https://github.com/scopecam/scopecam/issues
- Documentation: https://docs.scopecam.dev
- Community: https://discord.gg/scopecam