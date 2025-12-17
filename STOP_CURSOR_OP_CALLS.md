# Stop Cursor from Calling `op` Commands

## The Root Cause

Cursor is repeatedly calling:
```
op item get dnobmkuibnr5vaqkfilottoasu
```

This is a **GitHub Personal Access Token**. Each call triggers an authorization prompt.

## The Solution: Use .env Files Instead

Since 1Password **doesn't offer a checkbox** for persistent authorization, we need to **stop Cursor from calling `op`** entirely.

### Step 1: Get the GitHub Token

**In 1Password App**:
1. Open 1Password
2. Search for "GitHub" or find the item
3. Copy the **token** value (not the title)

**Or check what field name it uses**:
- Common field names: `token`, `credential`, `password`, `secret`

### Step 2: Add Token to 1Password Environment

1. **1Password → Environments → Your Environment**
2. **Add variable**:
   - **Name**: `GITHUB_TOKEN` (or `GH_TOKEN`, whatever Cursor expects)
   - **Value**: The token from Step 1
3. **Enable local .env file** destination
4. **Mount to your project's .env file**

The token will automatically sync to `.env` - no `op` calls needed!

### Step 3: Find What's Calling `op` in Cursor

We need to identify what in Cursor is making these calls:

**Check Cursor Extensions**:
1. **Cursor → Extensions** (Cmd+Shift+X)
2. **Search for**: 
   - "github"
   - "git" 
   - "1password"
   - "secrets"
   - "environment"
3. **Look for extensions** that might fetch tokens
4. **Disable or configure** them to use `.env` instead

**Check Cursor Settings**:
1. **Cursor → Settings** (Cmd+,)
2. **Search for**:
   - "github"
   - "token"
   - "secrets"
   - "1password"
   - "environment variables"
3. **Look for settings** that fetch secrets via CLI

**Check Git Configuration**:
```bash
# Check if Git is configured to use 1Password
git config --list | grep -i password
git config --list | grep -i credential
```

### Step 4: Configure to Use .env

Once you find what's calling `op`:

1. **Configure it to read from `.env`** instead
2. **Or disable the feature** if not needed
3. **Or replace with direct `.env` file reads**

## Quick Test

After adding token to `.env`:

1. **Check `.env` file has the token**:
   ```bash
   cat ~/Developer/readwise-mcp/.env | grep GITHUB
   ```

2. **Test Cursor reads it**:
   - Cursor should automatically load `.env` files
   - Check if the token is available as an environment variable

3. **Monitor Activity log**:
   - 1Password → Settings → Developer → Activity
   - Should see **fewer `op item get` calls**

## If You Can't Find What's Calling `op`

**Temporary workaround**:

1. **Add token to `.env` manually**:
   ```bash
   echo "GITHUB_TOKEN=your_token_here" >> ~/Developer/readwise-mcp/.env
   ```

2. **Export in your shell**:
   ```bash
   export GITHUB_TOKEN=$(grep GITHUB_TOKEN .env | cut -d'=' -f2)
   ```

3. **Cursor processes might inherit** this environment variable

**Better solution**: Find and configure the source of the `op` calls.

## Summary

**To eliminate prompts**:

1. ✅ **Get GitHub token** from 1Password
2. ✅ **Add to Environment/.env file**
3. ✅ **Find what in Cursor calls `op`** (extensions/settings)
4. ✅ **Configure it to use `.env`** instead of `op` commands

**Once Cursor stops calling `op`**, the prompts will stop.

The `.env` file approach is the **only reliable solution** since 1Password doesn't offer persistent authorization.
