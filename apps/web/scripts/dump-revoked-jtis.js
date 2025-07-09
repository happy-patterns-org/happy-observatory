#!/usr/bin/env node
/**
 * Script to dump revoked JWT IDs for debugging
 */

const fetch = require('node-fetch')

async function dumpRevokedJtis() {
  try {
    const response = await fetch('http://localhost:3000/api/debug/revoked-tokens', {
      headers: {
        'X-Debug-Token': process.env.DEBUG_TOKEN || 'development-only',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    console.log('Revoked Tokens:')
    console.log(`- Total count: ${data.count}`)
    console.log(`- Memory usage: ${(data.memoryUsage / 1024).toFixed(2)} KB`)
    console.log('')

    if (data.tokens && data.tokens.length > 0) {
      console.log('Token Details:')
      console.log('JTI                                  | Expires At           | Time Until Expiry')
      console.log('-------------------------------------|---------------------|------------------')

      data.tokens.forEach(({ jti, expiresAt, timeUntilExpiry }) => {
        const expiryDate = new Date(expiresAt * 1000).toISOString()
        const timeLeft =
          timeUntilExpiry > 0
            ? `${Math.floor(timeUntilExpiry / 60)}m ${timeUntilExpiry % 60}s`
            : 'Expired'

        console.log(`${jti} | ${expiryDate.substring(0, 19)} | ${timeLeft}`)
      })
    } else {
      console.log('No revoked tokens in store')
    }
  } catch (error) {
    console.error('Failed to dump revoked tokens:', error.message)
    console.error('Make sure the debug endpoint is enabled in development mode')
  }
}

// Run periodically if --watch flag is provided
if (process.argv.includes('--watch')) {
  console.log('Watching revoked tokens (refresh every 5 seconds)...\n')
  setInterval(() => {
    console.clear()
    dumpRevokedJtis()
  }, 5000)
} else {
  dumpRevokedJtis()
}
