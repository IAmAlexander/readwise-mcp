#!/bin/zsh
# Diagnostic script to identify why 1Password CLI prompts are so frequent

echo "=== 1Password CLI Prompt Diagnosis ==="
echo ""

# Check 1Password app status
echo "1. Checking 1Password app status..."
if pgrep -f "1Password" > /dev/null; then
    echo "   ✅ 1Password app is running"
else
    echo "   ❌ 1Password app is NOT running"
fi

# Check for multiple op processes
echo ""
echo "2. Checking for active 'op' processes..."
OP_PROCESSES=$(ps aux | grep -E "[o]p " | grep -v grep | wc -l | tr -d ' ')
echo "   Found $OP_PROCESSES 'op' processes running"
if [ "$OP_PROCESSES" -gt 5 ]; then
    echo "   ⚠️  WARNING: Many op processes detected - this might cause frequent prompts"
    ps aux | grep -E "[o]p " | grep -v grep | head -10
fi

# Check session environment variables
echo ""
echo "3. Checking OP_SESSION environment variables..."
SESSION_VARS=$(env | grep "^OP_SESSION" | wc -l | tr -d ' ')
if [ "$SESSION_VARS" -gt 0 ]; then
    echo "   ✅ Found $SESSION_VARS OP_SESSION variable(s):"
    env | grep "^OP_SESSION" | head -5
else
    echo "   ❌ No OP_SESSION variables found (no active session)"
fi

# Test current session
echo ""
echo "4. Testing current CLI session..."
if op whoami >/dev/null 2>&1; then
    echo "   ✅ Session is active"
    op whoami
else
    echo "   ❌ Session is NOT active (will prompt on next command)"
    echo "   Error: $(op whoami 2>&1 | head -1)"
fi

# Check 1Password lock status (if possible)
echo ""
echo "5. Checking terminal sessions..."
echo "   Current terminal PID: $$"
echo "   Parent process: $(ps -p $PPID -o comm= 2>/dev/null || echo 'unknown')"

# Check if there are multiple Cursor processes
echo ""
echo "6. Checking Cursor processes..."
CURSOR_PROCS=$(ps aux | grep -i "[c]ursor" | grep -v grep | wc -l | tr -d ' ')
echo "   Found $CURSOR_PROCS Cursor-related processes"
if [ "$CURSOR_PROCS" -gt 10 ]; then
    echo "   ⚠️  Many Cursor processes - each might need separate authorization"
fi

# Check recent op command history (if available)
echo ""
echo "7. Recommendations:"
echo "   - If 1Password is locking frequently, check Settings → Security → Auto-lock"
echo "   - If many op processes, something might be spawning them repeatedly"
echo "   - Each terminal tab in Cursor needs separate authorization"
echo "   - Check if Cursor has extensions/plugins using 1Password CLI"

echo ""
echo "=== Diagnosis Complete ==="
