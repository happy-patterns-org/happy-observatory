#!/bin/bash

# Script to test the GitHub Actions workflow for shared-config compatibility

echo "🧪 Testing GitHub Actions Workflow: check-shared-config.yml"
echo "==========================================================="

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed!"
    echo "Please install it with: brew install gh"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository!"
    exit 1
fi

# Check if the workflow file exists
WORKFLOW_FILE=".github/workflows/check-shared-config.yml"
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ Workflow file not found: $WORKFLOW_FILE"
    echo "Please ensure the workflow file exists."
    exit 1
fi

echo "✅ Prerequisites checked"
echo ""

# Get the repository name
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
if [ -z "$REPO" ]; then
    echo "⚠️  Could not determine repository name. Using local git info..."
    REPO=$(git config --get remote.origin.url | sed 's/.*github.com[:\/]\(.*\)\.git/\1/')
fi

echo "📍 Repository: $REPO"
echo ""

# Options for testing
echo "Select test option:"
echo "1. Trigger workflow manually (workflow_dispatch)"
echo "2. View workflow runs"
echo "3. Check workflow syntax"
echo "4. Simulate scheduled run locally"
echo ""

read -p "Enter option (1-4): " option

case $option in
    1)
        echo "🚀 Triggering workflow manually..."
        gh workflow run check-shared-config.yml
        
        if [ $? -eq 0 ]; then
            echo "✅ Workflow triggered successfully!"
            echo ""
            echo "View the run at: https://github.com/$REPO/actions"
            echo ""
            echo "Or check status with: gh run list --workflow=check-shared-config.yml"
        else
            echo "❌ Failed to trigger workflow"
            echo "Make sure you're authenticated with: gh auth login"
        fi
        ;;
        
    2)
        echo "📋 Recent workflow runs:"
        gh run list --workflow=check-shared-config.yml --limit 10
        ;;
        
    3)
        echo "🔍 Checking workflow syntax..."
        # Basic YAML syntax check
        if command -v yamllint &> /dev/null; then
            yamllint "$WORKFLOW_FILE"
        else
            echo "Installing yamllint for syntax checking..."
            pip install --user yamllint
            yamllint "$WORKFLOW_FILE"
        fi
        
        # Check with actionlint if available
        if command -v actionlint &> /dev/null; then
            actionlint "$WORKFLOW_FILE"
        else
            echo ""
            echo "💡 Tip: Install actionlint for better workflow validation:"
            echo "   brew install actionlint"
        fi
        ;;
        
    4)
        echo "🔄 Simulating scheduled run locally..."
        echo ""
        echo "This will run the same checks that the scheduled workflow would run:"
        echo ""
        
        # Check for shared-config
        SHARED_CONFIG_PATH="../../../shared-config"
        if [ -d "$SHARED_CONFIG_PATH" ]; then
            echo "✅ Found shared-config at: $SHARED_CONFIG_PATH"
            
            # Check for breaking change script
            if [ -f "$SHARED_CONFIG_PATH/scripts/breaking-change-detect.py" ]; then
                echo "✅ Breaking change detection script found"
                echo ""
                echo "Running breaking change detection..."
                cd "$SHARED_CONFIG_PATH"
                python scripts/breaking-change-detect.py
                cd - > /dev/null
            else
                echo "⚠️  Breaking change detection script not found"
            fi
        else
            echo "❌ Shared-config not found at expected location"
        fi
        
        echo ""
        echo "Running local tests..."
        npm test -- src/__tests__/shared-config-integration.test.ts
        
        echo ""
        echo "Running TypeScript check..."
        npx tsc --noEmit
        ;;
        
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "✨ Done!"