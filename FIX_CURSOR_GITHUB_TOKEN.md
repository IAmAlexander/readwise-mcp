# Fix: Cursor Repeatedly Fetching GitHub Token

## The Problem

Cursor is repeatedly calling:
```
op item get dnobmkuibnr5vaqkfilottoasu
```

This is a **GitHub Personal Access Token**. Each call triggers an authorization prompt because there's no "remember" option.

## The Solution: Add Token to .env File

### Step 1: Get the Token Value

You need to get the token value from 1Password:

**Option A: Via 1Password App**
1. Open 1Password
2. Search for the GitHub token item
3. Copy the token value

**Option B: Via CLI (one-time authorization)**
```bash
op item get dnobmkuibnr5vaqkfilottoasu --fields credential
```
(You'll need to authorize once, then we'll add it to .env)

### Step 2: Add to 1Password Environment

1. **Open 1Password → Environments**
2. **Select your environment** (or create one)
3. **Add variable**:
   - **Name**: `GITHUB_TOKEN` (or whatever Cursor expects)
   - **Value**: Paste the token
4. **Enable local .env file** destination
5. **Mount to your project's .env file**

### Step 3: Or Add Directly to .env File

If you prefer to add it directly:

1. **Get the token** (from Step 1)
2. **Add to your project's .env file**:
   ```bash
   # In readwise-mcp/.env or whichever project needs it
   GITHUB_TOKEN=your_token_here
   ```

### Step 4: Find What in Cursor Is Calling `op`

Check Cursor for:

1. **Extensions**:
   - Cursor → Extensions (Cmd+Shift+X)
   - Search: "github", "git", "1password", "secrets"
   - Disable or configure any that use 1Password CLI

2. **Settings**:
   - Cursor → Settings (Cmd+,)
   - Search: "github", "token", "secrets", "environment"
   - Look for settings that fetch tokens via `op`

3. **Git Configuration**:
   - Cursor might be using the token for Git operations
   - Configure Git to use the token from `.env` instead

### Step 5: Configure Cursor to Use .env

Make sure Cursor reads from `.env` files:

1. **Cursor automatically loads `.env` files** in project root
2. **Your projects already have `.env` files** set up
3. **Add the GitHub token** to the appropriate `.env` file
4. **Cursor will use it** without calling `op`

## Alternative: Use Git Credential Helper

If Cursor is using this for Git operations:

1. **Configure Git to use the token from .env**:
   ```bash
   git config --global credential.helper ""
   # Or use a helper that reads from .env
   ```

2. **Set GITHUB_TOKEN in environment**:
   ```bash
   export GITHUB_TOKEN=$(cat .env | grep GITHUB_TOKEN | cut -d'=' -f2)
   ```

## Quick Fix: Disable the Feature

If you can't find what's calling `op`:

1. **Check Cursor's Activity/Logs**:
   - See if there's a log showing what's triggering the calls
   
2. **Temporarily disable**:
   - Any GitHub-related extensions
   - Any secret management features
   - Any background Git operations

3. **Use `.env` files** for all secrets instead

## Summary

**To stop the repeated prompts**:

1. ✅ **Get the GitHub token** from 1Password
2. ✅ **Add it to your `.env` file** (or 1Password Environment)
3. ✅ **Find what in Cursor is calling `op`** and configure it to use `.env`
4. ✅ **Disable any extensions** that use 1Password CLI

**Once Cursor reads from `.env` instead of calling `op`**, the prompts will stop.

## Next Steps

1. **Get the token value** (from 1Password app or CLI)
2. **Add it to your Environment/.env file**
3. **Check Cursor extensions/settings** for what's calling `op`
4. **Configure it to use `.env`** instead

This is the only way to eliminate the prompts since 1Password doesn't offer persistent authorization.
