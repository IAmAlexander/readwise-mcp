# Fixing Frequent 1Password Terminal Authorization Prompts

## The Problem

You're still getting frequent authorization prompts when running `op` commands in the terminal, even after setting up session management.

## Root Cause

The issue is that:
1. **Desktop app integration** doesn't always use `OP_SESSION` variables
2. **Each terminal command** might be treated as a separate process
3. **Session isn't persisting** between commands

## Solution: Proper Session Management

I've updated the session manager to:

1. **Check for existing sessions** (both OP_SESSION and desktop app integration)
2. **Establish session properly** when needed
3. **Work with desktop app integration** (doesn't require OP_SESSION if desktop app is working)

## How to Use

### Automatic (Recommended)

The session manager now runs automatically when you open a terminal:

1. **Open a new terminal**
2. **First `op` command** will prompt for authorization
3. **Subsequent commands** should work without prompts (until session expires)

### Manual Sign-In

If you need to manually establish a session:

```bash
opsignin
```

This will:
- Check for existing session
- Prompt for authorization if needed
- Set up the session for your terminal

### Check Session Status

```bash
# Check if session is working
op account get

# Check if OP_SESSION is set
env | grep OP_SESSION

# Check who you're signed in as
op whoami
```

## Troubleshooting

### Still Getting Frequent Prompts

1. **Check 1Password is unlocked**:
   - Open 1Password app
   - Make sure it's unlocked (not locked)

2. **Check auto-lock settings**:
   - Settings → Security → Auto-lock
   - Should be set to 1 hour or longer

3. **Manually establish session**:
   ```bash
   opsignin
   ```

4. **Check if desktop app integration is enabled**:
   - 1Password → Settings → Developer
   - "Integrate with 1Password CLI" should be checked

### Session Expires Too Quickly

1Password CLI sessions expire after:
- **10 minutes of inactivity** (no `op` commands)
- **12 hours maximum** (regardless of activity)
- **When 1Password app locks**

**Solution**: Keep using `op` commands regularly, or keep 1Password unlocked longer.

### OP_SESSION Not Set

If `OP_SESSION` isn't set but `op` commands work, that's fine! Desktop app integration doesn't require `OP_SESSION` variables. The session manager will work with either method.

## What Changed

### Updated Session Manager

The session manager now:
- ✅ Checks both `OP_SESSION` and desktop app integration
- ✅ Works with either authentication method
- ✅ Properly establishes sessions when needed
- ✅ Runs automatically in new terminals

### Updated .zshrc

The `.zshrc` now:
- ✅ Checks for existing session before trying to create one
- ✅ Only prompts if no session exists
- ✅ Works with desktop app integration

## Expected Behavior

After this fix:

1. **First terminal session**: 
   - Open terminal → First `op` command prompts → Approve once
   - Subsequent commands work without prompts

2. **Session duration**:
   - Lasts 10 minutes of inactivity OR 12 hours maximum
   - Persists until 1Password locks

3. **New terminal tabs**:
   - Each new tab needs authorization once
   - Then works without prompts

## Summary

The updated session manager should significantly reduce authorization prompts. You'll still need to authorize:
- Once per terminal session (when you first open it)
- When sessions expire (10 min inactivity or 12 hours)
- When 1Password locks

But you shouldn't get prompts for every single `op` command anymore.

## Still Having Issues?

If you're still getting prompts for every command:

1. **Restart your terminal** (close and reopen)
2. **Run `opsignin`** manually
3. **Check 1Password Activity log** to see what's triggering prompts
4. **Verify desktop app integration** is enabled
