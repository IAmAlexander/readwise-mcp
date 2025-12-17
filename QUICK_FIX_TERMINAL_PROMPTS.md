# Quick Fix for Frequent Terminal 1Password Prompts

## Current Status

Your diagnostic shows:
- ✅ `op` commands work without prompts in current terminal
- ✅ Desktop app integration is working
- ⚠️ Session manager not loading properly

## The Real Issue

If you're still getting frequent prompts, it's likely because:

1. **Each new terminal tab** needs separate authorization
2. **Background processes** might be making `op` calls
3. **Specific commands** might trigger prompts (like `op item get` with `--reveal`)

## Immediate Solutions

### Solution 1: Sign In Explicitly in Each Terminal

When you open a new terminal, run:

```bash
eval $(op signin)
```

This will:
- Prompt once for authorization
- Set `OP_SESSION` variable
- Make all subsequent `op` commands work without prompts

### Solution 2: Add to Your Shell Profile

Add this to your `~/.zshrc` (after the session manager section):

```bash
# Auto-signin to 1Password when opening terminal
if [[ -o interactive ]] && command -v op >/dev/null 2>&1; then
  # Check if we need to sign in
  if ! op account get >/dev/null 2>&1 2>/dev/null; then
    # Sign in (will prompt once)
    eval $(op signin) 2>/dev/null
  fi
fi
```

### Solution 3: Use an Alias

Add this to your `~/.zshrc`:

```bash
# Quick 1Password sign-in
alias op-signin='eval $(op signin) && echo "✅ 1Password session established"'
```

Then just run `op-signin` when you need to.

## Why Prompts Still Happen

Even with desktop app integration:

1. **Per Terminal Session**: Each terminal tab/window needs authorization once
2. **Session Expires**: After 10 minutes of inactivity or 12 hours max
3. **1Password Locks**: When 1Password locks, all sessions are revoked
4. **Background Processes**: Processes that don't inherit the session need authorization

## Best Practice

**For each new terminal session**:

1. Open terminal
2. Run: `eval $(op signin)` (prompts once)
3. All `op` commands work without prompts

**Or** use the auto-signin in `.zshrc` (Solution 2 above) to do this automatically.

## Check What's Causing Prompts

1. **Open 1Password** → Settings → Developer → Activity
2. **Look for patterns**:
   - Which commands are prompting?
   - How frequently?
   - From which applications?

3. **Common culprits**:
   - `op item get` with `--reveal` flag
   - Background scripts/processes
   - Different terminal sessions

## Summary

The frequent prompts are likely because:
- ✅ Each terminal needs authorization once (this is normal)
- ⚠️ Sessions aren't persisting between terminals (use `eval $(op signin)`)
- ⚠️ Background processes need separate authorization

**Quick fix**: Run `eval $(op signin)` in each terminal session, or add auto-signin to your `.zshrc`.
