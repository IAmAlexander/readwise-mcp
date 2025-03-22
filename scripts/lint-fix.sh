#!/bin/bash

# Script to check and fix linter errors in the codebase
# Usage: ./scripts/lint-fix.sh [--fix] [directory/file...]

set -e

# Default mode is to check only
FIX_MODE=false
TARGETS=()

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --fix)
    FIX_MODE=true
    shift
    ;;
    *)
    TARGETS+=("$arg")
    shift
    ;;
  esac
done

# Default target is src and test-scripts directories
if [ ${#TARGETS[@]} -eq 0 ]; then
  TARGETS=("src" "test-scripts")
fi

echo "Linting targets: ${TARGETS[@]}"

# Install dependencies if needed
if ! command -v eslint &> /dev/null; then
  echo "ESLint not found, installing dependencies..."
  npm install
fi

# Run ESLint
if [ "$FIX_MODE" = true ]; then
  echo "Running ESLint in fix mode..."
  npx eslint --ext .ts,.js "${TARGETS[@]}" --fix
else
  echo "Running ESLint in check mode..."
  npx eslint --ext .ts,.js "${TARGETS[@]}"
fi

# Check if there are still errors after fixing
if [ "$FIX_MODE" = true ]; then
  echo -e "\nChecking if there are any remaining errors after fixing..."
  npx eslint --ext .ts,.js "${TARGETS[@]}" --max-warnings=0 || {
    echo -e "\nSome linter issues could not be automatically fixed. Please address them manually."
    exit 1
  }
  echo -e "\nAll linter issues have been fixed! ✅"
fi