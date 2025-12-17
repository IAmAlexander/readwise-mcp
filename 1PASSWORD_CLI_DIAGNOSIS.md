# 1Password CLI Prompt Frequency - Diagnosis

## Understanding Your Situation

You mentioned getting prompts "every two seconds" which is much more frequent than the expected 10-minute/12-hour timeout. This suggests something else might be happening.

## Possible Causes

### 1. Multiple Terminal Processes
Cursor might be creating new terminal processes frequently, each requiring new authorization.

### 2. Session Token Not Persisting
The session token might not be properly shared between Cursor's processes.

### 3. 1Password Locking Frequently
If 1Password is locking/unlocking frequently, sessions are cleared.

## Diagnostic Steps

### Check Current Session Status
```bash
op whoami
```

If this prompts for authorization, you don't have an active session.

### Check Session Environment Variables
```bash
env | grep OP_SESSION
```

You should see variables like `OP_SESSION_my` or `OP_SESSION_<account>`.

### Check 1Password Lock Status
- Is 1Password staying unlocked?
- Check Settings → Security → Auto-lock
- If it's locking frequently, that will clear CLI sessions

### Monitor When Prompts Occur
- Are prompts happening when you run `op` commands?
- Are prompts happening automatically (without running commands)?
- Are prompts happening when you switch between terminal tabs?

## Quick Test

1. Open a terminal in Cursor
2. Run: `op signin`
3. Approve the prompt
4. Run: `op whoami` (should work without prompt)
5. Wait 2 seconds
6. Run: `op whoami` again

**If the second `op whoami` prompts again**, something is clearing your session immediately.

**If it doesn't prompt**, the session is working, but something else (like Cursor's background processes) might be triggering prompts.

## What to Check Next

1. **1Password Auto-lock**: Settings → Security → Auto-lock
   - If set to a short time, increase it
   - This affects CLI sessions

2. **Cursor Terminal Behavior**: 
   - Are you using multiple terminal tabs?
   - Each tab might be a separate process requiring authorization

3. **Background Processes**:
   - Is Cursor running background processes that use `op`?
   - These would each need authorization

## If Prompts Are Truly Every 2 Seconds

This is abnormal and suggests:
- Sessions are being cleared immediately after creation
- Multiple processes are making simultaneous requests
- 1Password is locking/unlocking rapidly

Check:
- 1Password's lock status
- System activity (are there many `op` processes?)
- Cursor's process list
