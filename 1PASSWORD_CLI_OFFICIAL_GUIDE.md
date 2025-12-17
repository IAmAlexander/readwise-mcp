# 1Password CLI Authorization - Official Documentation Guide

Based on the [official 1Password CLI documentation](https://developer.1password.com/docs/cli/get-started/), here's what you need to know about authorization and session management.

## How 1Password CLI Authorization Works

According to the [1Password app integration security documentation](https://developer.1password.com/docs/cli/app-integration-security):

### Authorization Model

1. **Per Terminal Session**: Each terminal window or tab requires separate authorization
   - On **macOS and Linux**: Authorization extends to sub-shell processes within the same terminal window
   - On **Windows**: Sub-shell processes require separate authorization

2. **Session Duration**:
   - **Inactivity Timeout**: 10 minutes - if no `op` commands are executed, the session expires
   - **Maximum Duration**: 12 hours - hard limit regardless of activity
   - **Auto-refresh**: Session automatically refreshes with each use (up to the 12-hour limit)

3. **1Password App Lock**: If the 1Password app is locked, **all prior authorizations are revoked**

### What This Means for You

- ✅ **Once per terminal session**: You authorize once when you open a terminal, not per command
- ✅ **Sessions persist**: As long as you use `op` commands within 10 minutes, the session stays alive
- ✅ **Up to 12 hours**: With continuous activity, sessions can last up to 12 hours
- ❌ **Not configurable**: These timeouts are hardcoded and cannot be changed

## Why You're Getting Frequent Prompts

If you're seeing prompts "every two seconds" (much more frequent than the 10-minute timeout), here are the likely causes:

### 1. 1Password App is Locking Frequently ⚠️ **MOST LIKELY CAUSE**

**From the docs**: "If the 1Password app is locked, all prior authorizations are revoked."

**Check this first**:
1. Open 1Password desktop app
2. Go to **Settings** → **Security** → **Auto-lock**
3. If it's set to a short time (like 1 minute, 5 minutes), **increase it to 1 hour or longer**
4. This is the #1 cause of frequent CLI authorization prompts

### 2. Multiple Terminal Processes

Each terminal tab/window in Cursor is a separate process requiring authorization. If Cursor is:
- Creating new terminal processes frequently
- Running background processes that use `op`
- Each would need separate authorization

### 3. 1Password App Not Staying Unlocked

If 1Password keeps locking/unlocking, all CLI sessions are cleared each time.

## Solution: Check Your 1Password Auto-Lock Settings

**This is the most important step**:

1. Open **1Password desktop app**
2. Go to **Settings** → **Security**
3. Find **"Auto-lock"** setting
4. **Increase it to at least 1 hour** (or longer if you're comfortable)
   - Recommended: **1 hour** or **"Never"** (while actively developing)
5. Also ensure **"Lock when computer sleeps"** is set appropriately

**Why this matters**: Every time 1Password locks, it revokes ALL CLI authorizations. If it's locking every few minutes, you'll get prompts constantly.

## Understanding the Authorization Flow

Based on the official docs:

```
1. You open a terminal in Cursor
2. You run an `op` command (or it runs automatically)
3. 1Password prompts: "Allow Cursor to get CLI access"
4. You authorize (Touch ID/password)
5. Session is established for that terminal
6. All `op` commands in that terminal work without prompts
7. Session expires after:
   - 10 minutes of no `op` commands, OR
   - 12 hours maximum, OR
   - When 1Password app locks
```

## Best Practices

### 1. Keep 1Password Unlocked Longer
- Set auto-lock to **1 hour minimum** while developing
- This prevents frequent session revocations

### 2. Reuse Terminal Sessions
- Keep terminal tabs open instead of closing/reopening
- Each new terminal requires new authorization

### 3. Keep Sessions Active
- Use `op` commands regularly (within 10 minutes)
- This keeps the session alive for up to 12 hours

### 4. Use Service Accounts for Automation
- For scripts/automation, use [1Password Service Accounts](https://developer.1password.com/docs/service-accounts)
- Service Accounts don't require authorization prompts

## Verification Steps

### Check if 1Password is Locking Frequently

1. Open 1Password app
2. Note the time
3. Wait and see how quickly it locks
4. If it locks within minutes, that's your problem

### Check Current Session Status

```bash
op whoami
```

If this prompts for authorization, you don't have an active session.

### Check Auto-Lock Settings

1. 1Password → Settings → Security
2. Check "Auto-lock" duration
3. If it's less than 1 hour, increase it

## Summary

**The Key Insight**: According to the official documentation, **if 1Password app locks, all CLI authorizations are revoked**. This is likely why you're getting frequent prompts.

**The Fix**: 
1. ✅ Increase 1Password auto-lock duration to **1 hour or longer**
2. ✅ Keep terminal sessions open (don't close/reopen frequently)
3. ✅ Keep using `op` commands regularly to maintain sessions

**The Reality**: 
- Sessions last 10 minutes of inactivity OR 12 hours max
- Each terminal needs separate authorization
- These limits are hardcoded and cannot be changed
- But if 1Password stays unlocked, you'll only need to authorize once per terminal session

## References

- [1Password CLI Get Started](https://developer.1password.com/docs/cli/get-started/)
- [1Password App Integration Security](https://developer.1password.com/docs/cli/app-integration-security/)
