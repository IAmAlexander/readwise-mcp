#!/bin/zsh
# Diagnostic script for frequent 1Password terminal prompts

echo "=== 1Password Terminal Session Diagnosis ==="
echo ""

# Check if op works
echo "1. Testing op command..."
if op account get >/dev/null 2>&1; then
    echo "   ✅ op command works without prompt"
    op whoami | head -3
else
    echo "   ❌ op command requires authorization"
fi
echo ""

# Check OP_SESSION
echo "2. Checking OP_SESSION variables..."
if env | grep -q "^OP_SESSION"; then
    echo "   ✅ OP_SESSION variables found:"
    env | grep "^OP_SESSION"
else
    echo "   ℹ️  No OP_SESSION variables (using desktop app integration)"
fi
echo ""

# Check 1Password app status
echo "3. Checking 1Password desktop app..."
if pgrep -f "1Password" > /dev/null; then
    echo "   ✅ 1Password app is running"
else
    echo "   ❌ 1Password app is NOT running"
fi
echo ""

# Test multiple commands
echo "4. Testing multiple op commands..."
for i in {1..3}; do
    echo "   Command $i:"
    if op account get >/dev/null 2>&1; then
        echo "      ✅ Worked without prompt"
    else
        echo "      ❌ Required prompt"
    fi
done
echo ""

# Check session manager
echo "5. Checking session manager..."
if type ensure_op_session >/dev/null 2>&1; then
    echo "   ✅ Session manager is loaded"
    # Try to source it if not loaded
elif [[ -f "$HOME/.1password-session.sh" ]]; then
    source "$HOME/.1password-session.sh" 2>/dev/null
    if type ensure_op_session >/dev/null 2>&1; then
        echo "   ✅ Session manager loaded from file"
    else
        echo "   ⚠️  Session manager file exists but functions not loading"
    fi
else
    echo "   ❌ Session manager file not found at ~/.1password-session.sh"
fi
echo ""

# Check account shorthand
echo "6. Checking account detection..."
if type _get_primary_account >/dev/null 2>&1; then
    account=$(_get_primary_account 2>/dev/null)
    if [[ -n "$account" ]]; then
        echo "   ✅ Detected account: $account"
    else
        echo "   ⚠️  Account detection function available but returned empty"
    fi
elif [[ -f "$HOME/.1password-session.sh" ]]; then
    source "$HOME/.1password-session.sh" 2>/dev/null
    if type _get_primary_account >/dev/null 2>&1; then
        account=$(_get_primary_account 2>/dev/null)
        echo "   ✅ Detected account: $account"
    else
        echo "   ⚠️  Account detection function not available"
    fi
else
    echo "   ⚠️  Account detection function not available"
fi
echo ""

# Check .zshrc configuration
echo "7. Checking .zshrc configuration..."
if grep -q "1password-session.sh" "$HOME/.zshrc" 2>/dev/null; then
    echo "   ✅ Session manager referenced in .zshrc"
else
    echo "   ⚠️  Session manager not found in .zshrc"
fi
echo ""

echo "=== Recommendations ==="
echo ""
if op account get >/dev/null 2>&1; then
    echo "✅ Your session is working. If you're still getting frequent prompts:"
    echo "   1. Check 1Password Activity log (Settings → Developer → Activity)"
    echo "   2. See which commands are triggering prompts"
    echo "   3. Each terminal tab needs separate authorization"
else
    echo "⚠️  Session not working. Try:"
    echo "   1. Run: opsignin"
    echo "   2. Or: eval \$(op signin)"
    echo "   3. Check 1Password is unlocked"
fi
echo ""
