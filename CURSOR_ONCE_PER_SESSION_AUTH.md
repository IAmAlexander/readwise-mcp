# Authorize Cursor Once Per Session - Complete Solution

## The Problem

Cursor spawns multiple processes (chat, terminals, renderers), and each one triggers a separate 1Password authorization prompt. You want to authorize Cursor **once per session**, not for every process.

## Solution: "Approve for All Applications" Checkbox

When the 1Password authorization prompt appears:

### Step 1: Look for the Checkbox

The prompt should have a checkbox that says:
- **"Approve for all applications"** OR
- **"Remember this choice"** OR  
- **"Don't ask again"**

### Step 2: Check the Box Before Authorizing

1. **Check the checkbox** first
2. **Then click "Authorize with Touch ID"** (or use password)
3. **This applies to ALL Cursor processes** for the session

### Step 3: Verify It Worked

After approving:
- **Open a new terminal in Cursor** → Should work without prompt
- **Use Cursor chat** → Should work without prompt
- **Run `op` commands** → Should work without prompt

## If the Checkbox Doesn't Appear

### Option 1: Check 1Password Settings

1. **1Password → Settings → Developer**
2. **Look for "Remember key approval"** setting
3. **Set to "Until 1Password quits"** or longest duration available
4. **This affects CLI authorization too**

### Option 2: Authorize in 1Password Activity Log

1. **1Password → Settings → Developer → Activity**
2. **Find Cursor authorization requests**
3. **See if there's an option to "Approve for all"**

### Option 3: Use Environment Variables (Workaround)

Set `OP_SESSION` globally for Cursor:

1. **Sign in once**:
   ```bash
   eval $(op signin)
   ```

2. **Get the session token**:
   ```bash
   echo $OP_SESSION_my
   ```

3. **Set in Cursor's environment** (if Cursor has env var settings):
   - Add `OP_SESSION_my=<token>` to Cursor's environment
   - All Cursor processes inherit this

**Note**: Token expires after 10 min/12 hours, needs refresh.

## Best Solution: Use .env Files Instead

If Cursor is making `op` calls to fetch secrets:

1. **Stop using `op` commands** in Cursor
2. **Use the .env files** we set up:
   - Cursor reads from `.env` files automatically
   - No `op` calls = no authorization prompts
   - Works seamlessly

This is the **cleanest solution** - no prompts at all.

## Alternative: Pre-Authorize All Cursor Processes

Create a script that authorizes once and shares the session:

```bash
#!/bin/zsh
# ~/bin/cursor-op-init.sh

# Sign in and get session token
eval $(op signin)

# Export for all processes
export OP_SESSION_my

echo "✅ 1Password session established for Cursor"
echo "Session token: ${OP_SESSION_my:0:20}..."
```

Run this before using Cursor, or add to Cursor's startup.

## Check What's Triggering Prompts

### 1. Check 1Password Activity Log

1. **1Password → Settings → Developer → Activity**
2. **Look for**:
   - Which Cursor processes are requesting?
   - How frequently?
   - Which commands?

### 2. Monitor Cursor Processes

```bash
# See all Cursor processes
ps aux | grep -i cursor | wc -l

# See which are making op calls
ps aux | grep -i cursor | grep -i op
```

## Expected Behavior After Fix

Once you check "Approve for all applications":

- ✅ **First prompt**: Authorize once with checkbox checked
- ✅ **All Cursor processes**: Work without prompts
- ✅ **New terminals**: Work without prompts
- ✅ **Cursor chat**: Works without prompts
- ✅ **Duration**: Until 1Password locks or quits

## Troubleshooting

### Still Getting Prompts

1. **Check if checkbox was actually checked** - Look carefully at the prompt
2. **Try authorizing again** - Check the box this time
3. **Check 1Password Activity log** - See what's still requesting
4. **Restart Cursor** - Sometimes needed to apply authorization

### Checkbox Not Appearing

1. **Update 1Password** - Newer versions have this feature
2. **Check Developer settings** - "Remember key approval" might need adjustment
3. **Use .env files** - Avoids the issue entirely

## Summary

**To authorize Cursor once per session**:

1. ✅ **When prompt appears**: Check "Approve for all applications"
2. ✅ **Then authorize**: Touch ID or password
3. ✅ **All Cursor processes**: Should work without prompts

**If checkbox doesn't appear**:
- Use `.env` files instead of `op` commands (best solution)
- Set `OP_SESSION` environment variable globally
- Increase "Remember key approval" duration in settings

The `.env` file approach is the most reliable - no prompts at all because Cursor doesn't need to call `op` commands.
