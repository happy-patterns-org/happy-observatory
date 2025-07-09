#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PORT="${PORT:-4000}"
API_BASE="http://localhost:$PORT"

echo "=== TRUST_PROXY_HEADERS Test ==="
echo ""

# Kill any existing process on the port
if lsof -ti:$PORT > /dev/null; then
  echo "Killing existing process on port $PORT..."
  kill $(lsof -ti:$PORT) 2>/dev/null || true
  sleep 2
fi

# Test 1: TRUST_PROXY_HEADERS=false
echo -e "${YELLOW}Test 1: TRUST_PROXY_HEADERS=false${NC}"
echo "Starting server..."

# Start server with proxy headers disabled
TRUST_PROXY_HEADERS=false PORT=$PORT npm run dev > /tmp/server1.log 2>&1 &
PID=$!

# Wait for server to start
echo "Waiting for server to start..."
for i in {1..30}; do
  if curl -s "$API_BASE/api/health" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Test with forged headers
RESPONSE=$(curl -s -H 'X-Real-IP: 9.9.9.9' -H 'X-Forwarded-For: 8.8.8.8, 7.7.7.7' "$API_BASE/api/ip")
DETECTED_IP=$(echo "$RESPONSE" | jq -r '.detectedIp')
TRUST_SETTING=$(echo "$RESPONSE" | jq -r '.trustProxy')

echo "Response:"
echo "$RESPONSE" | jq .

if [ "$TRUST_SETTING" = "false" ] && [ "$DETECTED_IP" != "9.9.9.9" ] && [ "$DETECTED_IP" != "8.8.8.8" ]; then
  echo -e "${GREEN}✓ Proxy headers correctly ignored (detected: $DETECTED_IP)${NC}"
else
  echo -e "${RED}✗ Proxy headers were trusted when they shouldn't be!${NC}"
  kill $PID 2>/dev/null || true
  exit 1
fi

# Kill server
kill $PID 2>/dev/null || true
sleep 2
echo ""

# Test 2: TRUST_PROXY_HEADERS=true
echo -e "${YELLOW}Test 2: TRUST_PROXY_HEADERS=true${NC}"
echo "Starting server..."

# Start server with proxy headers enabled
TRUST_PROXY_HEADERS=true PORT=$PORT npm run dev > /tmp/server2.log 2>&1 &
PID=$!

# Wait for server to start
echo "Waiting for server to start..."
for i in {1..30}; do
  if curl -s "$API_BASE/api/health" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Test with headers
RESPONSE=$(curl -s -H 'X-Real-IP: 9.9.9.9' -H 'X-Forwarded-For: 8.8.8.8, 7.7.7.7' "$API_BASE/api/ip")
DETECTED_IP=$(echo "$RESPONSE" | jq -r '.detectedIp')
TRUST_SETTING=$(echo "$RESPONSE" | jq -r '.trustProxy')

echo "Response:"
echo "$RESPONSE" | jq .

if [ "$TRUST_SETTING" = "true" ] && [ "$DETECTED_IP" = "8.8.8.8" ]; then
  echo -e "${GREEN}✓ X-Forwarded-For correctly trusted (detected: $DETECTED_IP)${NC}"
else
  echo -e "${RED}✗ Expected to detect 8.8.8.8 from X-Forwarded-For but got: $DETECTED_IP${NC}"
  kill $PID 2>/dev/null || true
  exit 1
fi

# Test X-Real-IP preference
RESPONSE2=$(curl -s -H 'X-Real-IP: 9.9.9.9' "$API_BASE/api/ip")
DETECTED_IP2=$(echo "$RESPONSE2" | jq -r '.detectedIp')

if [ "$DETECTED_IP2" = "9.9.9.9" ]; then
  echo -e "${GREEN}✓ X-Real-IP correctly trusted (detected: $DETECTED_IP2)${NC}"
else
  echo -e "${RED}✗ Expected to detect 9.9.9.9 from X-Real-IP but got: $DETECTED_IP2${NC}"
fi

# Kill server
kill $PID 2>/dev/null || true

echo ""
echo -e "${GREEN}=== All proxy header tests passed! ===${NC}"