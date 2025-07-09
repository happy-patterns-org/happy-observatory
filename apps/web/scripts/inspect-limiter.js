#!/usr/bin/env node
/**
 * Script to inspect the rate limiter's internal state
 * This requires adding a debug endpoint to the application
 */

const fetch = require('node-fetch')

async function inspectRateLimiter() {
  try {
    const response = await fetch('http://localhost:3000/api/debug/rate-limiter', {
      headers: {
        'X-Debug-Token': process.env.DEBUG_TOKEN || 'development-only',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    console.log('Rate Limiter State:')
    console.log(`- Store size: ${data.storeSize}`)
    console.log(`- Max size: ${data.maxSize}`)
    console.log(`- Memory usage: ${(data.memoryUsage / 1024 / 1024).toFixed(2)} MB`)
    console.log(`- Oldest entry expires: ${new Date(data.oldestExpiry).toISOString()}`)
    console.log(`- Newest entry expires: ${new Date(data.newestExpiry).toISOString()}`)

    if (data.topIps && data.topIps.length > 0) {
      console.log('\nTop IPs by request count:')
      data.topIps.forEach(({ ip, count, resetTime }) => {
        console.log(`  ${ip}: ${count} requests (resets ${new Date(resetTime).toISOString()})`)
      })
    }
  } catch (error) {
    console.error('Failed to inspect rate limiter:', error.message)
    console.error('Make sure the debug endpoint is enabled in development mode')
  }
}

inspectRateLimiter()
