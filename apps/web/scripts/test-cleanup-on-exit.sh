#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PORT="${PORT:-5000}"

echo "=== Cleanup on Exit Test ==="
echo ""

# Create a test server that logs cleanup
cat > /tmp/test-server.js << 'EOF'
const express = require('express')
const app = express()

// Import rate limiter to test cleanup
const { createRateLimiter } = require('./src/lib/security/rate-limit')

const limiter = createRateLimiter({
  windowMs: 60000,
  max: 10
})

app.use(limiter)

app.get('/test', (req, res) => {
  res.json({ status: 'ok' })
})

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Server started on port', process.env.PORT || 5000)
})

// Track cleanup
let cleanupCalled = false

process.on('SIGTERM', () => {
  console.log('SIGTERM received, cleaning up...')
  cleanupCalled = true
  server.close(() => {
    console.log('Server closed gracefully')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, cleaning up...')
  cleanupCalled = true
  server.close(() => {
    console.log('Server closed gracefully')
    process.exit(0)
  })
})

process.on('beforeExit', (code) => {
  console.log('beforeExit event, code:', code)
  if (!cleanupCalled) {
    console.log('WARNING: Cleanup was not called!')
  }
})
EOF

echo -e "${YELLOW}Test 1: SIGTERM signal${NC}"

# Start server
TRAP_TEST=1 PORT=$PORT node /tmp/test-server.js > /tmp/sigterm.log 2>&1 &
PID=$!

# Wait for server to start
sleep 2

# Send SIGTERM
echo "Sending SIGTERM to PID $PID..."
kill -TERM $PID

# Wait and check exit code
wait $PID
EXIT_CODE=$?

echo "Server output:"
cat /tmp/sigterm.log

if [ $EXIT_CODE -eq 0 ] && grep -q "Server closed gracefully" /tmp/sigterm.log; then
  echo -e "${GREEN}✓ SIGTERM handled correctly (exit code: $EXIT_CODE)${NC}"
else
  echo -e "${RED}✗ SIGTERM not handled properly (exit code: $EXIT_CODE)${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Test 2: SIGINT signal (Ctrl+C)${NC}"

# Start server again
TRAP_TEST=1 PORT=$PORT node /tmp/test-server.js > /tmp/sigint.log 2>&1 &
PID=$!

# Wait for server to start
sleep 2

# Send SIGINT
echo "Sending SIGINT to PID $PID..."
kill -INT $PID

# Wait and check exit code
wait $PID
EXIT_CODE=$?

echo "Server output:"
cat /tmp/sigint.log

if [ $EXIT_CODE -eq 0 ] && grep -q "Server closed gracefully" /tmp/sigint.log; then
  echo -e "${GREEN}✓ SIGINT handled correctly (exit code: $EXIT_CODE)${NC}"
else
  echo -e "${RED}✗ SIGINT not handled properly (exit code: $EXIT_CODE)${NC}"
  exit 1
fi

# Cleanup
rm -f /tmp/test-server.js /tmp/sigterm.log /tmp/sigint.log

echo ""
echo -e "${GREEN}=== All cleanup tests passed! ===${NC}"