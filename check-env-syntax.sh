#!/bin/bash
# Script to check .env file syntax and identify parsing issues

if [ -z "$1" ]; then
    echo "Usage: $0 <path-to-.env-file>"
    echo "Example: $0 ~/Developer/my-project/.env"
    exit 1
fi

ENV_FILE="$1"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: File not found: $ENV_FILE"
    exit 1
fi

echo "=== Checking .env file: $ENV_FILE ==="
echo ""

# Check file size
FILE_SIZE=$(wc -l < "$ENV_FILE")
echo "📊 File has $FILE_SIZE lines"
echo ""

# Check for common syntax issues
echo "🔍 Checking for syntax issues..."
echo ""

# Check for lines without = sign (but allow comments)
echo "1. Lines without '=' (excluding comments):"
grep -n "^[^#]*[^=]" "$ENV_FILE" | grep -v "^[^#]*#" | head -10
if [ $? -eq 0 ]; then
    echo "   ⚠️  Found lines without '=' sign"
else
    echo "   ✅ All non-comment lines have '='"
fi
echo ""

# Check for duplicate keys
echo "2. Duplicate keys:"
awk -F'=' '{print $1}' "$ENV_FILE" | grep -v "^#" | grep -v "^$" | sort | uniq -d
if [ $? -eq 0 ]; then
    echo "   ⚠️  Found duplicate keys"
else
    echo "   ✅ No duplicate keys found"
fi
echo ""

# Check for lines with spaces around =
echo "3. Lines with spaces around '=':"
grep -n " = " "$ENV_FILE" | head -10
if [ $? -eq 0 ]; then
    echo "   ⚠️  Found lines with spaces around '=' (may cause issues)"
else
    echo "   ✅ No spaces around '='"
fi
echo ""

# Check for unquoted values with spaces
echo "4. Unquoted values that might have spaces:"
grep -n "^[^#]*=[^\"'].* .*[^\"']$" "$ENV_FILE" | head -10
if [ $? -eq 0 ]; then
    echo "   ⚠️  Found unquoted values with spaces (should be quoted)"
else
    echo "   ✅ Values with spaces appear to be quoted"
fi
echo ""

# Check for empty lines (usually fine, but listing for reference)
echo "5. Empty lines:"
grep -n "^$" "$ENV_FILE" | wc -l | xargs echo "   Found"
echo ""

# Check for special characters that might cause issues
echo "6. Lines with potential encoding issues:"
grep -P "[^\x00-\x7F]" "$ENV_FILE" 2>/dev/null | head -5
if [ $? -eq 0 ]; then
    echo "   ⚠️  Found non-ASCII characters"
else
    echo "   ✅ No non-ASCII characters detected"
fi
echo ""

# Show first 20 lines for manual review
echo "📄 First 20 lines of file:"
echo "---"
head -20 "$ENV_FILE"
echo "---"
echo ""

# Try to validate with a simple parser
echo "🧪 Testing basic parsing..."
ERRORS=0

while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    
    # Check if line has = sign
    if [[ ! "$line" =~ = ]]; then
        echo "   ❌ Line without '=': $line"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for key=value format
    if [[ "$line" =~ ^[[:space:]]*[^=]+= ]]; then
        # Looks okay
        :
    else
        echo "   ❌ Invalid format: $line"
        ERRORS=$((ERRORS + 1))
    fi
done < "$ENV_FILE"

if [ $ERRORS -eq 0 ]; then
    echo "   ✅ Basic syntax check passed"
else
    echo "   ⚠️  Found $ERRORS potential syntax errors"
fi

echo ""
echo "=== Summary ==="
echo "If you see warnings above, fix those issues before mounting in 1Password."
echo "Common fixes:"
echo "  - Remove spaces around '='"
echo "  - Quote values with spaces"
echo "  - Remove duplicate keys"
echo "  - Ensure all lines have 'KEY=value' format"
