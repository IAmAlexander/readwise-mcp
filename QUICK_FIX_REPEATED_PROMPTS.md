# Quick Fix for Repeated 1Password CLI Authorization Prompts

## The Issue

Cursor is repeatedly calling:
```
op item get dnobmkuibnr5vaqkfilottoasu --fields token --reveal
```

Each call triggers a new authorization prompt.

## Immediate Solutions (Try These First)

### Solution 1: Use 1Password Environments with Local .env File ⭐ RECOMMENDED

This eliminates the need for repeated `op` calls:

1. **In 1Password**:
   - Go to **Environments** (in sidebar)
   - Create a new Environment or use existing
   - Add your token as a variable (e.g., `MY_API_TOKEN`)

2. **Enable Local .env File Sync**:
   - In Environment settings, enable **"Local .env file"**
   - Set path: `~/.1password/.env` (or project-specific path)
   - 1Password will automatically sync secrets to this file

3. **Cursor will read from .env**:
   - Cursor can load `.env` files automatically
   - No repeated `op` calls needed
   - No authorization prompts

**Benefits**:
- ✅ No authorization prompts
- ✅ Secrets stay encrypted in 1Password
- ✅ Cursor reads from local file (fast)
- ✅ Auto-syncs when secrets change

### Solution 2: Approve Cursor for Longer Duration

While investigating, reduce prompts:

1. **When authorization popup appears**:
   - Look for "Remember this choice" checkbox
   - Check it if available

2. **In 1Password Settings**:
   - Settings → Developer → Activity
   - See if you can approve Cursor for a longer duration

### Solution 3: Check Cursor Settings

Cursor might have settings causing repeated requests:

1. **Open Cursor Settings** (Cmd+,)
2. **Search for**:
   - "1password"
   - "secrets"
   - "environment"
   - "env"
   - "background"
3. **Look for**:
   - Background agent settings
   - Secret fetching frequency
   - Environment variable loading
4. **Adjust or disable** features that repeatedly fetch secrets

### Solution 4: Use Service Account (For Automation)

If this is for automated/background processes:

1. **Create Service Account**:
   - 1Password → Settings → Developer → Service Accounts
   - Create new service account
   - Grant access to the specific item

2. **Use Service Account Token**:
   - No authorization prompts
   - Persistent access
   - Perfect for background processes

## Why This Happens

Cursor is likely:
- Polling for updated secrets
- Loading environment variables on startup/reload
- Background agents fetching secrets
- Not caching the session token between calls

## What to Check

1. **Cursor Extensions**:
   - Extensions → Search "1password", "secrets", "env"
   - Disable any that might be causing this

2. **Cursor Background Agents**:
   - Check if background agents are enabled
   - They might be fetching secrets repeatedly

3. **Project Configuration**:
   - Check if project has `.cursorrules` or config that loads secrets
   - Look for files that reference 1Password or `op item get`

## Best Long-Term Solution

**Use 1Password Environments with local .env file sync** - This is the recommended approach for IDEs like Cursor because:
- No repeated CLI calls
- No authorization prompts
- Fast access (reads from local file)
- Secure (encrypted in 1Password, synced securely)

## Summary

**Quick fix**: Use 1Password Environments → Local .env file sync
**Alternative**: Check Cursor settings and disable features causing repeated requests
**For automation**: Use Service Accounts instead of CLI
