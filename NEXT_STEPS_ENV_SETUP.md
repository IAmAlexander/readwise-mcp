# Next Steps: Complete the .env Setup

## Current Status ✅

- ✅ `.env` files are mounted (virtual files from 1Password)
- ✅ Files exist at the correct paths
- ⚠️ Need to verify they're readable and find what's calling `op`

## Step 1: Authorize .env File Access

The `.env` files are virtual - they need authorization when first accessed:

1. **Try reading the file**:
   ```bash
   cat ~/Developer/readwise-mcp/.env
   ```

2. **You'll get an authorization prompt** - approve it once
3. **After approval**, the file contents will be displayed
4. **Subsequent reads** won't prompt (until 1Password locks)

## Step 2: Verify GitHub Token Is in Environment

After authorizing the `.env` file:

1. **Check if token is there**:
   ```bash
   cat ~/Developer/readwise-mcp/.env | grep -i github
   ```

2. **If it's there**: Great! ✅
3. **If not**: Add it to your 1Password Environment

## Step 3: Find What's Calling `op` in Cursor

The Activity log shows Cursor calling `op item get` repeatedly. We need to stop this:

### Check Cursor Extensions

1. **Cursor → Extensions** (Cmd+Shift+X)
2. **Look for**:
   - GitHub-related extensions
   - Git extensions that might fetch tokens
   - 1Password integrations
   - Secret management tools
3. **Disable** any that use 1Password CLI
4. **Configure** them to use `.env` files instead

### Check Cursor Settings

1. **Cursor → Settings** (Cmd+,)
2. **Search for**:
   - "github"
   - "git"
   - "token"
   - "secrets"
   - "1password"
3. **Look for** settings that fetch tokens via CLI
4. **Change** to use environment variables

### Check Git Configuration

```bash
# Check Git credential helpers
git config --list | grep credential

# If using 1Password helper, change it:
git config --global --unset credential.helper
# Or configure to use .env instead
```

## Step 4: Test the Setup

### Test .env File

```bash
# Authorize once, then read
cat ~/Developer/readwise-mcp/.env

# Should show your environment variables
# Including GITHUB_TOKEN if you added it
```

### Test in Cursor

1. **Open a terminal in Cursor**
2. **Check environment variables**:
   ```bash
   echo $GITHUB_TOKEN
   # Should show the token if it's in .env and loaded
   ```

3. **Monitor Activity log**:
   - 1Password → Settings → Developer → Activity
   - Should see **fewer/no `op item get` calls**

## Step 5: If Cursor Still Calls `op`

If Activity log still shows `op` calls:

1. **Identify the command** - What exact `op` command is being called?
2. **Find the source** - Extension, setting, or script?
3. **Replace with `.env` read** - Configure it to use environment variables

### Common Sources

- **Git credential helper** - Configure to use `.env`
- **Cursor extensions** - Disable or configure
- **Background processes** - Check Cursor's background agents
- **Git hooks** - Check `.git/hooks` for scripts calling `op`

## Success Checklist

- ✅ `.env` files mounted and accessible
- ✅ GitHub token in `.env` file
- ✅ Cursor reads from `.env` (no `op` calls)
- ✅ Activity log shows no `op item get` calls
- ✅ No authorization prompts

## Summary

**Setup is done!** Now:

1. ✅ **Authorize `.env` file** (one-time prompt)
2. ✅ **Verify token is in `.env`**
3. ✅ **Find what calls `op`** in Cursor
4. ✅ **Configure it** to use `.env` instead
5. ✅ **Monitor Activity log** to confirm

Once Cursor stops calling `op` commands, the prompts will stop!

## Quick Test

Run this to test everything:

```bash
# 1. Authorize and read .env (will prompt once)
cat ~/Developer/readwise-mcp/.env

# 2. Check for GitHub token
cat ~/Developer/readwise-mcp/.env | grep GITHUB

# 3. Check Activity log in 1Password
# Should see fewer/no op calls after this
```

If the Activity log still shows `op` calls, we need to find what's making them and configure it to use `.env` instead.
