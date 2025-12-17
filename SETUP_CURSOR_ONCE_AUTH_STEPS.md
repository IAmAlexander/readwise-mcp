# Step-by-Step Setup: Cursor Once-Per-Session Authorization

## Current Status ✅

- ✅ 1Password CLI is working
- ✅ Desktop app integration is enabled
- ✅ Session is active (no OP_SESSION needed)

## Setup Steps

### Step 1: Check 1Password Settings

1. **Open 1Password desktop app**
2. **Go to Settings → Developer**
3. **Verify**:
   - ✅ "Integrate with 1Password CLI" is checked
   - ✅ Look for "Remember key approval" setting (if available)
   - ✅ Set it to longest duration possible

### Step 2: When Authorization Prompt Appears

**This is the key step!**

When you see the "1Password Access Requested" popup:

1. **LOOK CAREFULLY** at the prompt
2. **Find the checkbox** that says:
   - "Approve for all applications" OR
   - "Remember this choice" OR
   - "Don't ask again" OR
   - Similar wording
3. **CHECK THE BOX** before authorizing
4. **Then click** "Authorize with Touch ID" (or password)

### Step 3: Test It Works

After authorizing with the checkbox checked:

1. **Open a new terminal in Cursor**
2. **Run**: `op account get`
3. **Should work without prompt** ✅

If it still prompts, the checkbox might not have been checked.

### Step 4: Verify in Activity Log

1. **1Password → Settings → Developer → Activity**
2. **Look for Cursor authorization requests**
3. **See if they're being approved for all applications**

## Alternative Setup: Use .env Files (Recommended)

Since you already have `.env` files set up, this is the **best solution**:

### Your .env Files Are Ready

- ✅ `readwise-mcp/.env`
- ✅ `agentx/.env`  
- ✅ `alexanderbastiencom/.env`

### How to Use Them

1. **Cursor automatically reads `.env` files** in your project
2. **No `op` commands needed** = No authorization prompts
3. **Secrets are available** as environment variables

### If Cursor Is Still Calling `op` Commands

Check what's triggering the calls:

1. **1Password → Settings → Developer → Activity**
2. **See which commands are being called**
3. **Replace those with `.env` file reads**

## Quick Setup Script

I've created a setup script. Run it to establish a proper session:

```bash
cd /Users/alex/Developer/readwise-mcp
./setup-cursor-once-auth.sh
```

This will:
- ✅ Establish a 1Password session
- ✅ Set up OP_SESSION if needed
- ✅ Give you instructions for the checkbox

## What to Do Right Now

### Option A: Wait for Next Prompt

1. **Wait for the next authorization prompt** in Cursor
2. **Look for the checkbox** (might be small or at bottom)
3. **Check it** before authorizing
4. **Test** if it works

### Option B: Trigger a Prompt to Test

1. **Open a new terminal in Cursor**
2. **Run**: `op account get`
3. **When prompt appears**, look for checkbox
4. **Check it**, then authorize
5. **Test again** - should work without prompt

### Option C: Use .env Files (Best)

1. **Stop using `op` commands** in Cursor
2. **Use `.env` files** instead
3. **No prompts at all** ✅

## Troubleshooting

### Checkbox Not Appearing?

1. **Update 1Password** to latest version
2. **Check Developer settings** for "Remember key approval"
3. **Use .env files** instead (no prompts needed)

### Still Getting Prompts?

1. **Check Activity log** - see what's requesting
2. **Verify checkbox was checked** - try again
3. **Restart Cursor** - sometimes needed
4. **Use .env files** - most reliable solution

## Summary

**To set up once-per-session authorization**:

1. ✅ **When prompt appears**: Look for checkbox
2. ✅ **Check the box**: "Approve for all applications"
3. ✅ **Authorize**: Touch ID or password
4. ✅ **Test**: New terminals should work without prompts

**Best solution**: Use `.env` files - no prompts at all!
