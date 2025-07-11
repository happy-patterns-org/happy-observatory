#!/bin/bash

# Script to help stage test changes in logical groups

echo "Test Implementation Staging Helper"
echo "================================="
echo ""

# Function to stage files with a specific pattern
stage_group() {
    local group_name=$1
    local pattern=$2
    echo "Staging $group_name..."
    git add $pattern 2>/dev/null || echo "  No files found for pattern: $pattern"
}

# Show current status
echo "Current Git Status Summary:"
echo "- Total changed files: $(git status --porcelain | wc -l)"
echo "- New files: $(git status --porcelain | grep "^??" | wc -l)"
echo "- Modified files: $(git status --porcelain | grep "^ M" | wc -l)"
echo ""

echo "Suggested staging groups:"
echo ""

echo "1. Test Infrastructure (Run: ./stage-tests.sh infra)"
echo "   - MSW setup, test utilities, configuration"
echo ""

echo "2. Security Tests (Run: ./stage-tests.sh security)"
echo "   - All security module tests"
echo ""

echo "3. Core Tests (Run: ./stage-tests.sh core)"
echo "   - Agent control, WebSocket, store tests"
echo ""

echo "4. Component Tests (Run: ./stage-tests.sh components)"
echo "   - All React component tests"
echo ""

echo "5. API Tests (Run: ./stage-tests.sh api)"
echo "   - All API route tests"
echo ""

echo "6. Documentation (Run: ./stage-tests.sh docs)"
echo "   - Strategy and summary documents"
echo ""

echo "7. All Tests (Run: ./stage-tests.sh all)"
echo "   - Stage all test-related changes"
echo ""

# Handle command line argument
case "$1" in
    "infra")
        echo "Staging test infrastructure..."
        git add apps/web/src/mocks/
        git add apps/web/src/test-utils/
        git add apps/web/src/setupTests.ts
        git add apps/web/vitest.config.ts
        git add apps/web/jest.config.js
        git add apps/web/jest.setup.js
        git add apps/web/package.json
        git add apps/web/tsconfig.json
        git add package.json
        git add package-lock.json
        ;;
    
    "security")
        echo "Staging security tests..."
        git add apps/web/src/lib/security/*.test.ts
        ;;
    
    "core")
        echo "Staging core infrastructure tests..."
        git add apps/web/src/lib/agent-control*.test.ts*
        git add apps/web/src/hooks/*.test.ts
        git add apps/web/src/store/__tests__/
        git add apps/web/src/lib/__tests__/
        ;;
    
    "components")
        echo "Staging component tests..."
        git add apps/web/src/components/**/*.test.tsx
        git add apps/web/src/components/__tests__/
        ;;
    
    "api")
        echo "Staging API route tests..."
        git add apps/web/src/app/api/**/*.test.ts
        ;;
    
    "docs")
        echo "Staging documentation..."
        git add apps/web/TEST_STRATEGY.md
        git add apps/web/TEST_IMPLEMENTATION_SUMMARY.md
        git add apps/web/CLAUDE.md
        ;;
    
    "all")
        echo "Staging all test-related changes..."
        ./stage-tests.sh infra
        ./stage-tests.sh security
        ./stage-tests.sh core
        ./stage-tests.sh components
        ./stage-tests.sh api
        ./stage-tests.sh docs
        ;;
    
    *)
        echo "Usage: ./stage-tests.sh [infra|security|core|components|api|docs|all]"
        ;;
esac

echo ""
echo "Done! Run 'git status' to see staged files."