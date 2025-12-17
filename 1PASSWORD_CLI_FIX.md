# Fixing 1Password CLI Frequent Prompts in Cursor

Based on your Developer settings screenshot, here's how to reduce the frequent authentication prompts:

## Current Settings Analysis

From your screenshot, I can see:
- ✅ **"Integrate with 1Password CLI"** is checked (good!)
- ⚠️ **"Remember key approval: until 1Password quits"** - This is too short
- ⚠️ **"Ask approval for each new: application"** - This might need adjustment

## Solution: Adjust the Settings

### Step 1: Change "Remember key approval" Duration

The current setting "until 1Password quits" means you'll be prompted every time 1Password restarts or locks. Change this to a longer duration:

1. In 1Password Settings → Developer
2. Find **"Remember key approval"** dropdown
3. Change it from **"until 1Password quits"** to:
   - **"For 4 hours"** or
   - **"For 12 hours"** or
   - **"Until 1Password locks"** (if available - this is better than "quits")

This will make approvals persist longer, reducing frequent prompts.

### Step 2: Check "Ask approval for each new" Options

Click the dropdown for **"Ask approval for each new"** and see what options are available:

- **"Application"** (current) - Should prompt once per application
- **"Application and terminal session"** - Would prompt more frequently (don't use this)
- Look for any option that says **"Session"** or **"Once"** - these would be better

If "Application" is the only option, that's fine - it should already prompt once per app.

### Step 3: Look for "Approve for all applications" in the Popup

When the authorization popup appears:
1. Look carefully at the popup - the checkbox might be small or at the bottom
2. It might say "Remember this choice" or "Don't ask again" instead
3. Check if there's a gear icon or "More options" button

### Step 4: Alternative - Use Session Token Approach

If the settings don't help, we can ensure your terminal sessions maintain the session token properly. The session manager we set up should help with this.

## Important Discovery: CLI Authorization is NOT Configurable

After further research, I found that **1Password CLI authorization settings are hardcoded and cannot be changed**:

- **Session Duration**: 10 minutes of inactivity OR maximum 12 hours with continuous activity
- **Per Terminal**: Each terminal window/tab requires separate authorization
- **No Configuration**: These timeouts cannot be adjusted in settings

The SSH Agent settings you see (like "Remember key approval") **do NOT apply to CLI authorization**. They only control SSH key usage, not CLI access.

## Why You're Getting Frequent Prompts

The prompts are happening because:
1. **Each terminal session needs separate authorization** - Cursor might be creating new terminal processes
2. **10-minute inactivity timeout** - If you're not using `op` commands continuously, sessions expire
3. **Cursor's process model** - Cursor might be making CLI requests from different processes, each requiring authorization

## The Real Solution

Since CLI authorization cannot be configured, we need to work within these constraints:

## Workarounds (Since Settings Can't Change CLI Behavior)

### Option 1: Keep Terminal Sessions Active

Since sessions expire after 10 minutes of inactivity:
- Keep using `op` commands regularly in your terminal
- The session will stay alive for up to 12 hours with continuous activity
- Use the session manager we set up to automatically maintain sessions

### Option 2: Use Service Accounts (For Automation)

If you're using 1Password CLI in scripts or automation:
- Consider using **1Password Service Accounts** instead
- Service Accounts provide persistent access without authorization prompts
- This is the recommended approach for automated workflows

### Option 3: Minimize Terminal Sessions

- Try to use fewer terminal tabs/windows in Cursor
- Each new terminal requires separate authorization
- Reuse existing terminals when possible

### Option 4: Accept the Security Trade-off

Unfortunately, the frequent prompts are by design for security. 1Password prioritizes security over convenience for CLI access. The 10-minute/12-hour limits are hardcoded and cannot be changed.

## What About the SSH Agent Settings?

The settings you see (like "Remember key approval") **only apply to SSH key usage**, not CLI authorization. They won't help with CLI prompts.

However, you can still optimize SSH Agent settings:
- **"Remember key approval: For 12 hours"** - Good for SSH keys
- **"Ask approval for each new: Application"** - Good for SSH keys

These will help with SSH operations, but won't affect CLI authorization prompts.

## Summary

**The bad news**: 1Password CLI authorization prompts cannot be reduced through settings. The 10-minute/12-hour limits are hardcoded for security.

**The good news**: 
- Sessions last up to 12 hours with continuous activity
- The session manager we set up will help maintain sessions
- Each terminal session only needs authorization once (not per command)
- After authorization, you won't be prompted again for that terminal session until it expires

**The reality**: You'll need to re-authorize:
- Every 10 minutes of inactivity, OR
- Every 12 hours maximum, OR  
- Each time you open a new terminal tab/window

This is a security feature, not a bug, and cannot be disabled.
