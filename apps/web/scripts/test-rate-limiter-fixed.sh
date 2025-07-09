#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="${API_BASE:-http://localhost:3000}"

echo "=== Rate Limiter Test (Fixed) ==="
echo "API Base: $API_BASE"
echo ""

# First, test without trust proxy to see default behavior
echo -e "${YELLOW}Test 1: Default behavior (TRUST_PROXY_HEADERS=false)${NC}"
# Make requests without proxy headers
echo -n "Making 7 requests to /api/auth/login from same IP: "
success=0
blocked=0

for i in {1..7}; do
  response=$(curl -s -w "\n%{http_code}" "$API_BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{"username":"test","password":"test"}' 2>/dev/null || echo "\n000")
  
  status_code=$(echo "$response" | tail -n1)
  
  if [ "$status_code" = "429" ]; then
    ((blocked++))
  else
    ((success++))
  fi
done

echo -e "${GREEN}Success: $success, Blocked: $blocked${NC}"
if [ "$blocked" -gt 0 ]; then
  echo -e "${GREEN}✓ Rate limiting is working!${NC}"
else
  echo -e "${RED}✗ Rate limiting not enforced${NC}"
fi

echo ""

# Now test with different IPs when trusting proxy headers
echo -e "${YELLOW}Test 2: Testing IP isolation${NC}"
echo "Starting server with TRUST_PROXY_HEADERS=true..."

# Kill any existing server
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Start server with TRUST_PROXY_HEADERS=true
TRUST_PROXY_HEADERS=true npm run dev > /tmp/rate-test-server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to start
echo -n "Waiting for server to start..."
for i in {1..30}; do
  if curl -s "$API_BASE/api/health" > /dev/null 2>&1; then
    echo " ready!"
    break
  fi
  sleep 1
  echo -n "."
done
echo ""

# Test with different IPs
echo -e "\n${YELLOW}Testing different IPs are tracked separately:${NC}"
for ip in "192.168.1.100" "192.168.1.101" "192.168.1.102"; do
  echo -n "IP $ip: "
  response=$(curl -s -w "\n%{http_code}" "$API_BASE/api/auth/login" \
    -H "X-Forwarded-For: $ip" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{"username":"test","password":"test"}' 2>/dev/null || echo "\n000")
  
  status_code=$(echo "$response" | tail -n1)
  
  if [ "$status_code" = "429" ]; then
    echo -e "${RED}Blocked (should not happen for first request from each IP)${NC}"
  else
    echo -e "${GREEN}Allowed (correct)${NC}"
  fi
done

# Test rate limit per IP
echo -e "\n${YELLOW}Testing rate limit per IP (6 requests from same IP):${NC}"
success=0
blocked=0

for i in {1..6}; do
  response=$(curl -s -w "\n%{http_code}" "$API_BASE/api/auth/login" \
    -H "X-Forwarded-For: 192.168.1.200" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{"username":"test","password":"test"}' 2>/dev/null || echo "\n000")
  
  status_code=$(echo "$response" | tail -n1)
  
  if [ "$status_code" = "429" ]; then
    ((blocked++))
  else
    ((success++))
  fi
done

echo "Success: $success, Blocked: $blocked"
if [ "$success" -le 5 ] && [ "$blocked" -gt 0 ]; then
  echo -e "${GREEN}✓ Rate limit correctly enforced per IP${NC}"
else
  echo -e "${RED}✗ Rate limit not working correctly${NC}"
fi

# Cleanup
kill $SERVER_PID 2>/dev/null || true

echo -e "\n${GREEN}=== Rate limiter test complete! ===${NC}"