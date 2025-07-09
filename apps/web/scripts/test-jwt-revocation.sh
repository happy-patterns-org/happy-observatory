#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="${API_BASE:-http://localhost:3000}"

echo "=== JWT Revocation Test ==="
echo "API Base: $API_BASE"
echo ""

# Step 1: Login
echo -e "${YELLOW}Step 1: Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"developer","password":"dev123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get token${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Got token: ${TOKEN:0:20}...${NC}"
echo ""

# Step 2: Test authenticated endpoint
echo -e "${YELLOW}Step 2: Test authenticated access${NC}"
ME_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/projects/devkit/agents/command" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"agentId":"test","command":"status"}')

HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
BODY=$(echo "$ME_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Authenticated request successful (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${RED}✗ Authenticated request failed (HTTP $HTTP_CODE)${NC}"
  echo "Response: $BODY"
  exit 1
fi
echo ""

# Step 3: Logout (revoke token)
echo -e "${YELLOW}Step 3: Logout (revoke token)${NC}"
LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/auth/logout" \
  -H "Authorization: Bearer $TOKEN")

LOGOUT_CODE=$(echo "$LOGOUT_RESPONSE" | tail -n1)
if [ "$LOGOUT_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Logout successful${NC}"
else
  echo -e "${RED}✗ Logout failed (HTTP $LOGOUT_CODE)${NC}"
  exit 1
fi
echo ""

# Step 4: Try to use revoked token
echo -e "${YELLOW}Step 4: Test revoked token${NC}"
REVOKED_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/projects/devkit/agents/command" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"agentId":"test","command":"status"}')

REVOKED_CODE=$(echo "$REVOKED_RESPONSE" | tail -n1)
REVOKED_BODY=$(echo "$REVOKED_RESPONSE" | sed '$d')

if [ "$REVOKED_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Revoked token correctly rejected (HTTP $REVOKED_CODE)${NC}"
else
  echo -e "${RED}✗ Revoked token was not rejected! (HTTP $REVOKED_CODE)${NC}"
  echo "Response: $REVOKED_BODY"
  exit 1
fi
echo ""

# Step 5: Test with new token
echo -e "${YELLOW}Step 5: Login again with new token${NC}"
NEW_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"developer","password":"dev123"}')

NEW_TOKEN=$(echo "$NEW_LOGIN_RESPONSE" | jq -r '.token')
if [ "$NEW_TOKEN" = "$TOKEN" ]; then
  echo -e "${RED}✗ Got same token as before!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Got new token: ${NEW_TOKEN:0:20}...${NC}"

# Test new token works
NEW_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/projects" \
  -H "Authorization: Bearer $NEW_TOKEN")

NEW_TOKEN_CODE=$(echo "$NEW_TOKEN_RESPONSE" | tail -n1)
if [ "$NEW_TOKEN_CODE" = "200" ]; then
  echo -e "${GREEN}✓ New token works correctly${NC}"
else
  echo -e "${RED}✗ New token failed (HTTP $NEW_TOKEN_CODE)${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}=== All JWT revocation tests passed! ===${NC}"