# Fixing Frequent 1Password Auth Prompts in Cursor Chat/Terminal

## The Problem

Cursor chat/terminal is creating multiple processes, and each one needs separate 1Password authorization. You want to authorize Cursor **once per session**, not for every terminal/command.

## Root Cause

Cursor's integrated terminal and chat features spawn separate processes, and 1Password treats each as a separate "application" requiring authorization. Even though you've authorized Cursor, each subprocess needs its own authorization.

## Solutions

### Solution 1: Approve Cursor for All Applications (PRIMARY)

When the authorization prompt appears:

1. **Look carefully at the prompt** - there should be a checkbox or option
2. **Check "Approve for all applications"** or **"Remember this choice"**
3. **This should apply to all Cursor subprocesses**

**Note**: This option might not always appear, depending on 1Password version and settings.

### Solution 2: Use 1Password Service Accounts (For Automation)

If Cursor is making automated `op` calls:

1. **Create a Service Account** in 1Password
2. **Use service account token** instead of CLI
3. **No authorization prompts** needed

**Reference**: [1Password Service Accounts](https://developer.1password.com/docs/service-accounts/)

### Solution 3: Set Environment Variable Globally for Cursor

Try setting `OP_SESSION` in Cursor's environment:

1. **Check Cursor settings** for environment variables
2. **Add**: `OP_SESSION_my=<token>` (get token from `eval $(op signin)`)
3. **All Cursor processes** should inherit this

**Limitation**: Token expires after 10 minutes/12 hours, needs refresh.

### Solution 4: Use 1Password Environments (.env files)

Instead of Cursor calling `op` commands:

1. **Use the .env files** we set up earlier
2. **Cursor reads from .env** (no `op` calls needed)
3. **No authorization prompts**

This is the **best solution** if Cursor is fetching secrets.

### Solution 5: Increase 1Password Auto-Lock Duration

If 1Password is locking frequently:

1. **Settings → Security → Auto-lock**
2. **Set to 1 hour or longer** (or "Never" while developing)
3. **Sessions persist longer** = fewer prompts

## Diagnostic: What's Cursor Doing?

### Check Cursor Processes

```bash
# See all Cursor processes
ps aux | grep -i cursor | wc -l

# See which are making op calls
ps aux | grep -i cursor | grep -i op
```

### Check 1Password Activity Log

1. **1Password → Settings → Developer → Activity**
2. **Look for patterns**:
   - Are prompts from Cursor processes?
   - Which commands are triggering them?
   - How frequently?

### Monitor in Real-Time

```bash
# Watch for op commands from Cursor
sudo fs_usage | grep -i "cursor.*op\|op.*cursor"
```

## Best Solution: Use .env Files

If Cursor is repeatedly calling `op item get` or similar:

1. **Stop using `op` commands** in Cursor
2. **Use the .env files** we set up:
   - `readwise-mcp/.env`
   - `agentx/.env`
   - `alexanderbastiencom/.env`
3. **Cursor reads from .env** - no `op` calls needed
4. **No authorization prompts**

## Alternative: Authorize Once Per Cursor Session

Unfortunately, 1Password's security model requires authorization per process. However:

1. **First prompt in Cursor**: Authorize it
2. **Subsequent prompts**: Should be less frequent
3. **Each terminal tab**: Needs authorization once
4. **After 10 min inactivity**: Session expires

## Workaround: Script to Pre-Authorize

Create a script that authorizes once and shares the session:

```bash
#!/bin/zsh
# ~/bin/cursor-op-auth.sh

# Sign in and export session
eval $(op signin)

# Export for all child processes
export OP_SESSION_my

# Keep session alive
while true; do
  op account get >/dev/null 2>&1
  sleep 300  # Check every 5 minutes
done
```

Then run this before using Cursor.

## Summary

The frequent prompts are because:
- ✅ Cursor spawns multiple processes
- ✅ Each process needs authorization
- ✅ 1Password's security model requires this

**Best solutions**:
1. **Use .env files** instead of `op` commands (no prompts)
2. **Approve Cursor for all applications** when prompted
3. **Use Service Accounts** for automation
4. **Increase auto-lock duration** to keep sessions alive longer

The `.env` file approach is the cleanest - Cursor reads from files, no `op` calls, no prompts.
