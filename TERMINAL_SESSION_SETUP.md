# 1Password Terminal Session Setup - Complete Guide

## What We've Set Up

1. ✅ **Session Manager Script** (`~/.1password-session.sh`)
2. ✅ **Auto-signin in `.zshrc`** - Attempts to sign in automatically
3. ✅ **Manual sign-in function** - `opsignin` command available

## How It Works Now

### Automatic Sign-In

When you open a new terminal:
1. Shell checks if `op` command works
2. If not, tries to sign in automatically
3. You'll get **one prompt** to authorize
4. After that, all `op` commands work without prompts

### Manual Sign-In

If automatic sign-in doesn't work, use:

```bash
opsignin
```

Or the standard method:

```bash
eval $(op signin)
```

## Expected Behavior

### ✅ Normal (Good)

- **First `op` command in new terminal**: Prompts once
- **Subsequent commands**: Work without prompts
- **Session lasts**: 10 minutes of inactivity OR 12 hours max

### ❌ Problem (Needs Fix)

- **Every `op` command prompts**: Session not persisting
- **Prompts every few seconds**: Something is clearing sessions

## Troubleshooting Frequent Prompts

### 1. Check Current Session

```bash
# Test if session works
op account get

# Check OP_SESSION (might not be set with desktop app integration)
env | grep OP_SESSION

# Check who you're signed in as
op whoami
```

### 2. Manually Establish Session

```bash
# Method 1: Use the helper function
opsignin

# Method 2: Standard method
eval $(op signin)
```

### 3. Check What's Triggering Prompts

```bash
# Run diagnostic script
./diagnose-terminal-op-prompts.sh
```

### 4. Check 1Password Activity Log

1. Open **1Password** → Settings → Developer → Activity
2. Look for patterns:
   - Which commands are prompting?
   - How frequently?
   - From which processes?

### 5. Common Issues

**Issue**: Prompts for every command
- **Cause**: Session not persisting
- **Fix**: Run `eval $(op signin)` in terminal

**Issue**: Prompts in new terminal tabs
- **Cause**: Each terminal needs separate authorization
- **Fix**: This is normal - authorize once per terminal

**Issue**: Prompts after a few minutes
- **Cause**: Session expired (10 min inactivity)
- **Fix**: Use `op` commands more frequently, or run `opsignin` again

**Issue**: Prompts from background processes
- **Cause**: Background processes don't inherit session
- **Fix**: Use Service Accounts for automation (not CLI)

## Quick Reference

### Commands

```bash
# Sign in manually
opsignin
# or
eval $(op signin)

# Check session status
op account get
op whoami

# Check if session manager is loaded
type ensure_op_session
```

### Files

- `~/.1password-session.sh` - Session manager script
- `~/.zshrc` - Shell configuration (loads session manager)
- `1PASSWORD_TERMINAL_SESSION_FIX.md` - Detailed troubleshooting

## Still Having Issues?

If you're still getting prompts for every command:

1. **Open a fresh terminal**
2. **Run**: `eval $(op signin)`
3. **Test**: Run `op account get` multiple times
4. **If it still prompts**: Check 1Password Activity log to see what's happening

The key is that **each terminal session needs authorization once**. After that, commands should work without prompts until the session expires.
