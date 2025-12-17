# Fixing 1Password CLI Connection Issues

## Diagnosis Results

The diagnostic script revealed:
- ❌ **No OP_SESSION variables** - No active session
- ❌ **Connection timeout error**: "connecting to desktop app timed out"
- ⚠️ **32 Cursor processes** - Many processes that might need authorization
- ✅ **1Password app is running**

## The Real Problem

The error message is key:
```
[ERROR] connecting to desktop app timed out, make sure it is installed, 
running and CLI integration is enabled
```

This suggests 1Password CLI **cannot communicate with the 1Password desktop app**, which would cause:
- Every `op` command to fail
- Each failure triggering a new authorization prompt
- This explains prompts "every 2 seconds"

## Solutions to Try

### Solution 1: Restart 1Password Desktop App

1. **Quit 1Password completely**:
   - Right-click 1Password in menu bar → Quit
   - Or: Activity Monitor → Force Quit 1Password
   
2. **Restart 1Password**
3. **Unlock 1Password**
4. **Verify CLI integration is enabled**:
   - Settings → Developer → "Integrate with 1Password CLI" ✅

### Solution 2: Restart the 1Password CLI Daemon

The diagnostic showed an `op daemon` process running. Try restarting it:

```bash
# Kill the daemon
pkill -f "op daemon"

# It will restart automatically on next op command
op account list
```

### Solution 3: Verify CLI Integration is Actually Enabled

1. Open 1Password desktop app
2. Go to **Settings** → **Developer**
3. **Uncheck** "Integrate with 1Password CLI"
4. **Wait 5 seconds**
5. **Re-check** "Integrate with 1Password CLI"
6. Try `op account list` again

### Solution 4: Check 1Password App Permissions

On macOS, 1Password needs proper permissions:

1. **System Settings** → **Privacy & Security**
2. Check **"Accessibility"** - 1Password should be listed
3. Check **"Full Disk Access"** - 1Password should be listed
4. If not listed, add 1Password and restart it

### Solution 5: Reinstall 1Password CLI Integration

If nothing else works:

1. **Disable CLI integration**: Settings → Developer → Uncheck "Integrate with 1Password CLI"
2. **Quit 1Password**
3. **Restart 1Password**
4. **Re-enable CLI integration**: Settings → Developer → Check "Integrate with 1Password CLI"
5. **Test**: `op account list`

## Why This Causes Frequent Prompts

When 1Password CLI can't connect to the desktop app:
- Each `op` command fails immediately
- 1Password tries to establish a new connection
- This triggers a new authorization prompt
- If something is calling `op` repeatedly (like Cursor's background processes), you get prompts constantly

## Testing After Fix

After trying the solutions above:

```bash
# Test connection
op account list

# Should work without timeout error
# Should prompt for authorization ONCE
# After authorization, should work without prompts
```

## If Still Not Working

If you still get connection timeouts:

1. **Check 1Password app logs**:
   - Help → Troubleshooting → View Logs
   - Look for connection/CLI errors

2. **Check firewall/security software**:
   - Some security software blocks local connections
   - 1Password CLI needs to connect to the desktop app locally

3. **Contact 1Password Support**:
   - The connection timeout suggests a deeper issue
   - 1Password support can help diagnose further

## Summary

The frequent prompts are likely caused by **1Password CLI not being able to connect to the desktop app**, not by session timeouts. Each failed connection attempt triggers a new prompt.

**Try Solution 1 first** (restart 1Password) - this fixes the issue in most cases.
