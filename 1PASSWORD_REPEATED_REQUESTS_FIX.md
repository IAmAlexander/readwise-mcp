# Fixing Repeated 1Password CLI Authorization Requests

## The Problem

Your Activity log shows Cursor repeatedly calling:
```
op item get dnobmkuibnr5vaqkfilottoasu --fields token --reveal
```

Each call is triggering a new authorization prompt, even though it's the same command. This suggests:

1. **No session token being reused** - Each call is treated as a new request
2. **Cursor making frequent requests** - Something in Cursor is polling or repeatedly fetching this token
3. **Session not persisting** - The authorization isn't being cached properly

## Root Causes

### 1. Cursor Extension/Feature Polling

Cursor might have:
- An extension that uses 1Password CLI
- A feature that periodically fetches secrets
- Background processes that don't share session tokens

### 2. Session Token Not Set

The `OP_SESSION` environment variable might not be set in the process making the requests.

### 3. Each Request is a New Process

If each `op item get` call is from a different process, they won't share session tokens.

## Solutions

### Solution 1: Identify What's Making the Requests

First, find out what in Cursor is calling this command:

1. **Check Cursor Extensions**:
   - Open Cursor → Extensions
   - Look for any extensions related to:
     - Secrets management
     - Environment variables
     - 1Password integration
     - API key management

2. **Check Cursor Settings**:
   - Look for settings related to:
     - Environment variable loading
     - Secret management
     - API key fetching

3. **Check for Background Processes**:
   ```bash
   ps aux | grep -i cursor | grep -i "op\|1password"
   ```

### Solution 2: Use 1Password Service Account (Recommended for Automation)

If Cursor is repeatedly fetching this token for automation/scripts, use a **Service Account** instead:

1. **Create a Service Account**:
   - Go to 1Password → Settings → Developer → Service Accounts
   - Create a new service account
   - Grant it access to the specific item

2. **Use Service Account Token**:
   - Service accounts don't require authorization prompts
   - They provide persistent access
   - Perfect for automated/background processes

**Reference**: [1Password Service Accounts](https://developer.1password.com/docs/service-accounts)

### Solution 3: Cache the Token Locally (Temporary Workaround)

If you can't use Service Accounts, cache the token:

```bash
# Fetch token once and save it
TOKEN=$(op item get dnobmkuibnr5vaqkfilottoasu --fields token --reveal)

# Use the cached token instead of calling op repeatedly
# Store it in an environment variable or file
export MY_API_TOKEN="$TOKEN"
```

**Note**: This reduces security but eliminates repeated prompts.

### Solution 4: Set Up Proper Session Management

Ensure the process making the requests has a valid session:

1. **In the terminal where Cursor runs**:
   ```bash
   # Sign in and get session token
   eval $(op signin)
   
   # Verify session is set
   env | grep OP_SESSION
   ```

2. **If Cursor runs background processes**, they might not inherit the session:
   - Check if Cursor has a way to set environment variables
   - Look for Cursor settings to pass environment variables to processes

### Solution 5: Disable the Feature Causing Requests

If the repeated requests aren't necessary:

1. **Disable the Cursor extension/feature** causing it
2. **Change the frequency** if it's polling too often
3. **Use a different method** to access the secret (like reading from a file)

## Immediate Fix: Approve Once Per Session

While investigating, you can reduce prompts by:

1. **When the authorization popup appears**:
   - Look for "Remember this choice" or "Approve for all applications"
   - This should reduce prompts within the same session

2. **Check 1Password Settings**:
   - Settings → Developer → Activity
   - See if you can approve Cursor for a longer duration

## Diagnostic Steps

### 1. Check What's Calling the Command

```bash
# Monitor op commands in real-time
sudo fs_usage | grep "op item get"
```

### 2. Check Cursor's Environment

If you can access Cursor's terminal or process environment:
```bash
# Check if OP_SESSION is set
env | grep OP_SESSION
```

### 3. Check Cursor Extensions

- Open Cursor → Extensions (Cmd+Shift+X)
- Search for: "1password", "secrets", "env", "api"
- Disable any that might be causing this

### 4. Check Cursor Settings

Look for settings related to:
- Environment variables
- Secret management  
- API key loading
- Background processes

## Long-Term Solution

### Option A: Use 1Password Environments with Local .env File (RECOMMENDED)

Instead of Cursor repeatedly calling `op item get`, sync the secret to a local `.env` file:

1. **Set up 1Password Environment**:
   - In 1Password, go to **Environments**
   - Create or use an existing environment
   - Add your token as an environment variable

2. **Configure Local .env File Sync**:
   - In the Environment settings, enable **"Local .env file"**
   - Set the destination path (e.g., `~/.1password/.env` or project-specific)
   - 1Password will sync the secret to this file automatically

3. **Cursor reads from .env file**:
   - Cursor can read from `.env` files without calling `op` repeatedly
   - No authorization prompts needed
   - Secrets stay secure (encrypted in 1Password, synced to local file)

**Reference**: [1Password Environments Local .env File](https://developer.1password.com/docs/environments/local-env-file/)

### Option B: Use 1Password Service Account

**For automated/background processes**: Use **1Password Service Accounts**
- No authorization prompts
- Persistent access
- Designed for this use case

**Reference**: [1Password Service Accounts](https://developer.1password.com/docs/service-accounts)

### Option C: Disable Cursor Feature Causing Requests

If Cursor has a feature that's repeatedly fetching secrets:
- Check Cursor settings for "Background agents" or "Secret management"
- Disable automatic secret fetching if not needed
- Configure it to use cached values instead of fetching repeatedly

**For interactive use**: Ensure proper session management
- Set `OP_SESSION` environment variable
- Use `eval $(op signin)` in your shell
- Keep 1Password unlocked

## Summary

The repeated `op item get` calls suggest:
- ✅ Something in Cursor is repeatedly fetching a token
- ❌ Each call isn't reusing the session token
- ❌ Authorization isn't being cached

**Best solution**: Use a **1Password Service Account** for automated token fetching, or identify and configure the Cursor feature/extension causing the repeated requests.
