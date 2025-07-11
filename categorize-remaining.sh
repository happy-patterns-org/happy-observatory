#!/bin/bash

echo "=== REMAINING FILES CATEGORIZATION ==="
echo ""

# Source code modifications
echo "1. SOURCE CODE MODIFICATIONS (Modified API routes, components, hooks):"
echo "   Modified files that tests were written for"
git status --porcelain | grep "^ M" | grep -E "\.(ts|tsx|js|jsx)$" | grep -v test | awk '{print "   - " $2}'
echo ""

# New source files
echo "2. NEW SOURCE FILES:"
git status --porcelain | grep "^??" | grep -E "\.(ts|tsx|js|jsx)$" | grep -v test | awk '{print "   - " $2}'
echo ""

# Documentation
echo "3. DOCUMENTATION FILES:"
git status --porcelain | grep -E "\.(md|txt)$" | awk '{print "   - " $2}'
echo ""

# Configuration files
echo "4. CONFIGURATION FILES:"
git status --porcelain | grep -E "\.(json|yaml|yml|toml|rc|config\.js|config\.ts)$|^\..*rc|^\..*ignore" | awk '{print "   - " $2}'
echo ""

# GitHub/CI files
echo "5. GITHUB/CI FILES:"
git status --porcelain | grep -E "\.github/|\.husky/" | awk '{print "   - " $2}'
echo ""

# ESLint/Prettier files
echo "6. LINTING/FORMATTING:"
git status --porcelain | grep -E "eslint|prettier" | awk '{print "   - " $2}'
echo ""

# Other files
echo "7. OTHER FILES:"
git status --porcelain | grep -v -E "\.(ts|tsx|js|jsx|md|txt|json|yaml|yml|toml|rc)$|\.github/|\.husky/|eslint|prettier" | awk '{print "   - " $2}'
echo ""

echo "=== SUMMARY ==="
echo "Total remaining files: $(git status --porcelain | wc -l)"
echo ""

echo "=== RECOMMENDED STAGING GROUPS ==="
echo ""
echo "A. Source code changes (modified files that tests were written for)"
echo "B. New helper/utility files (config-adapter, setupTests, etc)"
echo "C. Documentation (all .md files)"
echo "D. Linting/formatting setup (ESLint, Prettier configs)"
echo "E. GitHub/CI setup (.github workflows, husky)"
echo "F. Other config files"