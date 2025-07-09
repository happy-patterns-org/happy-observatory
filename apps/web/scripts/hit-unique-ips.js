#!/usr/bin/env node
const { program } = require('commander')
const fetch = require('node-fetch')

program
  .option('--count <number>', 'Number of unique IPs to simulate', '12000')
  .option('--concurrency <number>', 'Concurrent requests', '200')
  .option('--url <url>', 'Target URL', 'http://localhost:3000/api/health')
  .parse()

const options = program.opts()

async function simulateRequest(ip) {
  try {
    const response = await fetch(options.url, {
      headers: {
        'X-Forwarded-For': ip,
        'X-Real-IP': ip,
      },
    })
    return {
      ip,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    }
  } catch (error) {
    return {
      ip,
      error: error.message,
    }
  }
}

async function runStressTest() {
  const count = parseInt(options.count)
  const concurrency = parseInt(options.concurrency)

  console.log(`Starting rate limiter stress test:`)
  console.log(`- Target: ${options.url}`)
  console.log(`- Unique IPs: ${count}`)
  console.log(`- Concurrency: ${concurrency}`)
  console.log('')

  const startTime = Date.now()
  const results = {
    total: 0,
    success: 0,
    rateLimited: 0,
    errors: 0,
  }

  // Generate unique IPs
  const ips = Array.from(
    { length: count },
    (_, i) => `10.${Math.floor(i / 65536)}.${Math.floor((i % 65536) / 256)}.${i % 256}`
  )

  // Process in batches
  for (let i = 0; i < count; i += concurrency) {
    const batch = ips.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(simulateRequest))

    batchResults.forEach((result) => {
      results.total++
      if (result.error) {
        results.errors++
      } else if (result.status === 429) {
        results.rateLimited++
      } else if (result.status === 200) {
        results.success++
      }
    })

    // Progress update
    if (results.total % 1000 === 0) {
      const elapsed = (Date.now() - startTime) / 1000
      console.log(`Progress: ${results.total}/${count} (${elapsed.toFixed(1)}s)`)
    }
  }

  const totalTime = (Date.now() - startTime) / 1000

  console.log('\nResults:')
  console.log(`- Total requests: ${results.total}`)
  console.log(`- Successful (200): ${results.success}`)
  console.log(`- Rate limited (429): ${results.rateLimited}`)
  console.log(`- Errors: ${results.errors}`)
  console.log(`- Time: ${totalTime.toFixed(2)}s`)
  console.log(`- Requests/sec: ${(results.total / totalTime).toFixed(2)}`)
}

runStressTest().catch(console.error)
