# 1Password CLI Session Management

This guide explains how to configure 1Password CLI to maintain persistent sessions, reducing authentication prompts from "every command" to "once per terminal session."

## Problem

1Password CLI prompts for authentication too frequently (every few seconds/commands) when using Cursor IDE or Claude Code, even though you've already authenticated. This is disruptive to your workflow.

## Solution

There are two parts to solving this:

### Part 1: Approve Cursor and Claude Code for All Applications (PRIMARY SOLUTION)

When you see the "1Password Access Requested" popup in Cursor or Claude Code:

1. **Click "Authorize with Touch ID"** (or use your password)
2. **Look for an option to "Approve for all applications"** or similar
   - This option may appear in the prompt or in 1Password settings
   - This tells 1Password to trust Cursor/Claude Code for all CLI access requests
   - You'll only need to approve once per application, not for every command

**Alternative**: You can also manage this in 1Password settings:
1. Open 1Password desktop app
2. Go to **Settings** > **Developer**
3. Under **Authorized Applications**, you can see and manage applications you've granted access to
4. Ensure Cursor and Claude Code are listed and approved

### Part 2: Session Management (Additional Optimization)

We've also set up a session management system that:
- ✅ Checks for existing valid sessions before prompting
- ✅ Maintains session tokens per terminal session
- ✅ Only prompts once per terminal session (not per command)
- ✅ Works seamlessly with Cursor IDE's and Claude Code's integrated terminals

## How It Works

### Session Manager Script

A session manager script (`~/.1password-session.sh`) has been added that:

1. **Checks for existing sessions**: Before prompting, it verifies if you already have a valid session token
2. **Tests session validity**: Uses a lightweight command to verify the session is still active
3. **Only prompts when needed**: If no valid session exists, it prompts for authentication
4. **Stores session token**: Exports the session token as an environment variable for the terminal session

### Integration with Your Shell

The session manager is automatically loaded in your `~/.zshrc`:

- **Auto-signin**: When you open a new terminal in Cursor or Claude Code, it will automatically check for a session and prompt once if needed
- **Non-blocking**: The sign-in happens in the background so it doesn't slow down shell startup
- **Manual refresh**: You can run `opsignin` anytime to refresh your session

## Usage

### Automatic (Recommended)

Just open a terminal in Cursor or Claude Code. The session manager will:
1. Check if you have a valid session
2. If not, prompt you once to authenticate (via Touch ID or password)
3. Store the session token for that terminal session
4. All subsequent `op` commands in that terminal will use the session token

### Manual Session Refresh

If you need to refresh your session manually:

```bash
opsignin
```

This will check your session and prompt for authentication if needed.

### Check Current Session Status

To see if you have an active session:

```bash
op account get
```

If this works without prompting, you have an active session.

## Session Duration

1Password CLI sessions have these limits:
- **Inactivity timeout**: 10 minutes (session expires after 10 min of no `op` commands)
- **Maximum duration**: 12 hours (session expires after 12 hours regardless)
- **Per terminal session**: Each terminal session maintains its own session token

## Important: Approve Cursor and Claude Code for All Applications

The most important step is to **approve Cursor and Claude Code for all applications** when you see the authorization prompt. This is different from just authenticating - you need to grant persistent access.

### How to Approve Cursor and Claude Code

1. **When the popup appears**: Look for a checkbox or option that says something like:
   - "Remember this choice"
   - "Approve for all applications"
   - "Trust this application"

2. **If you don't see the option**: 
   - Go to 1Password > Settings > Developer
   - Check "Integrate with 1Password CLI" is enabled
   - Look for "Authorized Applications" section
   - Add Cursor and Claude Code if they're not listed

3. **Verify it worked**: After approving, you should only see the prompt once per Cursor/Claude Code session (when you first open the application), not for every command.

## Troubleshooting

### Still Getting Frequent Prompts

1. **Check if session manager is loaded**:
   ```bash
   type ensure_op_session
   ```
   
   If it says "not found", the session manager isn't loaded. Check your `~/.zshrc`.

2. **Verify session token is set**:
   ```bash
   env | grep OP_SESSION
   ```
   
   You should see `OP_SESSION_<account>` variables.

3. **Test session manually**:
   ```bash
   opsignin
   op account get
   ```

### Session Expires Too Quickly

1Password CLI sessions expire after 10 minutes of inactivity. This is a security feature and cannot be changed. However:
- The session manager will automatically detect expired sessions
- You'll only be prompted once per terminal session
- If you're actively using `op` commands, the session stays alive

### Multiple 1Password Accounts

If you have multiple accounts, the session manager uses your primary/default account. To switch accounts:

```bash
op account get  # Shows current account
op account list  # Lists all accounts
op signin <account-shorthand>  # Sign in to specific account
```

Then the session manager will use that account for that terminal session.

## Files Modified

- `~/.1password-session.sh` - Session management script (new)
- `~/.zshrc` - Added session manager integration

## Benefits

1. **One prompt per terminal session**: Instead of every command
2. **Automatic**: Works seamlessly without manual intervention
3. **Secure**: Still uses 1Password's security (Touch ID, etc.)
4. **Non-blocking**: Doesn't slow down shell startup
5. **Smart**: Only prompts when actually needed

## Advanced: Custom Session Management

If you need more control, you can modify `~/.1password-session.sh`:

- Change the auto-signin behavior
- Add custom account selection logic
- Integrate with other tools

The script is well-commented and easy to customize.

---

**Note**: This solution works by maintaining session tokens in environment variables. Each terminal session has its own environment, so you'll need to authenticate once per terminal window/tab you open in Cursor or Claude Code. This is expected behavior and provides good security while reducing authentication friction.
