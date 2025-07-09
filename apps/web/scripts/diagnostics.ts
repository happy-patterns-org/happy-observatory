#!/usr/bin/env ts-node

import { runDiagnostics, formatDiagnostics } from '../src/lib/diagnostics'

async function main() {
  console.log('🔍 Running Happy Observatory diagnostics...\n')

  const port = Number(process.env.PORT) || 3000
  const report = await runDiagnostics(port)

  console.log(formatDiagnostics(report))

  // Exit with non-zero code if unhealthy
  process.exit(report.isHealthy ? 0 : 1)
}

main().catch((error) => {
  console.error('❌ Diagnostics failed:', error)
  process.exit(1)
})
