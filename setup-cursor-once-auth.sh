#!/bin/zsh
# Setup script to authorize Cursor once per session for 1Password CLI

echo "=== Cursor Once-Per-Session 1Password Authorization Setup ==="
echo ""

# Step 1: Check current session
echo "Step 1: Checking current 1Password session..."
if op account get >/dev/null 2>&1; then
    echo "   ✅ You have an active session"
    op whoami | head -3
else
    echo "   ⚠️  No active session - we'll create one"
fi
echo ""

# Step 2: Establish session with proper account
echo "Step 2: Establishing 1Password session..."
ACCOUNT=$(op account list 2>/dev/null | tail -n +2 | head -1 | awk '{print $1}' | sed 's|https://||' | sed 's|\.1password\.com||' | cut -d'.' -f1)

if [[ -z "$ACCOUNT" ]]; then
    # Try to get from whoami
    URL=$(op whoami 2>/dev/null | grep "URL:" | awk '{print $2}')
    if [[ -n "$URL" ]]; then
        ACCOUNT=$(echo "$URL" | sed 's|https://||' | sed 's|\.1password\.com||' | cut -d'.' -f1)
    fi
fi

if [[ -n "$ACCOUNT" ]]; then
    echo "   Detected account: $ACCOUNT"
    echo "   Signing in (you'll be prompted once)..."
    eval $(op signin $ACCOUNT 2>&1)
else
    echo "   Signing in (you'll be prompted once)..."
    eval $(op signin 2>&1)
fi

# Step 3: Verify session
echo ""
echo "Step 3: Verifying session..."
if op account get >/dev/null 2>&1; then
    echo "   ✅ Session established successfully"
    
    # Check if OP_SESSION is set
    if env | grep -q "^OP_SESSION"; then
        echo "   ✅ OP_SESSION variable is set"
        env | grep "^OP_SESSION" | head -1
    else
        echo "   ℹ️  Using desktop app integration (no OP_SESSION needed)"
    fi
else
    echo "   ❌ Failed to establish session"
    echo "   Please try manually: eval \$(op signin)"
    exit 1
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "✅ Your 1Password session is now active"
echo ""
echo "Next steps:"
echo "1. When you see authorization prompts in Cursor, look for:"
echo "   - 'Approve for all applications' checkbox"
echo "   - 'Remember this choice' checkbox"
echo "   - 'Don't ask again' checkbox"
echo ""
echo "2. CHECK THE BOX before authorizing"
echo ""
echo "3. This should apply to all Cursor processes"
echo ""
echo "4. If prompts continue, use .env files instead of op commands"
echo "   (We've already set these up for your projects)"
echo ""
echo "Session will last:"
echo "  - 10 minutes of inactivity, OR"
echo "  - 12 hours maximum, OR"
echo "  - Until 1Password locks"
echo ""
