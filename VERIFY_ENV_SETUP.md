# Verify .env Setup and Stop Cursor from Calling `op`

## Setup Complete ✅

You've set up the `.env` files. Now we need to ensure Cursor uses them instead of calling `op` commands.

## Step 1: Verify .env Files Are Working

### Check Files Exist

```bash
# Check all your .env files
ls -la ~/Developer/readwise-mcp/.env
ls -la ~/Developer/agentx/.env  
ls -la ~/Developer/alexanderbastiencom/.env
```

### Test Reading from .env

```bash
# Try reading the .env file (will prompt once for authorization)
cat ~/Developer/readwise-mcp/.env

# Should show your environment variables
# First read: Authorization prompt
# Subsequent reads: No prompt (until 1Password locks)
```

## Step 2: Find What in Cursor Is Calling `op`

The Activity log shows Cursor calling `op item get` repeatedly. We need to find what's making these calls:

### Check Cursor Extensions

1. **Open Cursor → Extensions** (Cmd+Shift+X)
2. **Search for**:
   - "github"
   - "git"
   - "1password"
   - "secrets"
   - "environment"
3. **Look for extensions** that might:
   - Fetch GitHub tokens
   - Use 1Password CLI
   - Manage secrets
4. **Disable or configure** them to use `.env` files

### Check Cursor Settings

1. **Cursor → Settings** (Cmd+,)
2. **Search for**:
   - "github"
   - "token"
   - "secrets"
   - "1password"
   - "environment variables"
3. **Look for settings** that:
   - Fetch tokens via CLI
   - Use 1Password integration
   - Configure secret management

### Check Git Configuration

```bash
# Check if Git is configured to use 1Password
git config --list | grep -i credential
git config --list | grep -i github
git config --list | grep -i password
```

If Git is using 1Password credential helper, configure it to use `.env` instead.

## Step 3: Configure to Use .env

Once you find what's calling `op`:

### For Extensions

- **Disable** extensions that use 1Password CLI
- **Configure** them to read from `.env` files
- **Or replace** with extensions that use environment variables

### For Git Operations

If Git is using the token:

```bash
# Set GitHub token from .env
export GITHUB_TOKEN=$(grep GITHUB_TOKEN .env | cut -d'=' -f2 | tr -d '"')

# Or configure Git to use environment variable
git config --global credential.helper ""
# Then use GITHUB_TOKEN from .env
```

### For Cursor Settings

- **Change** any settings that fetch secrets via CLI
- **Use** environment variables from `.env` instead
- **Configure** Cursor to load `.env` files automatically (should be default)

## Step 4: Monitor Activity Log

After making changes:

1. **1Password → Settings → Developer → Activity**
2. **Watch for**:
   - Fewer `op item get` calls
   - No more calls for `dnobmkuibnr5vaqkfilottoasu`
3. **If calls stop**: Success! ✅
4. **If calls continue**: Something else is calling `op`

## Step 5: Test the Setup

### Test .env File Access

```bash
# Read .env file (should prompt once, then work)
cat ~/Developer/readwise-mcp/.env

# Check if GitHub token is there
grep GITHUB ~/Developer/readwise-mcp/.env
```

### Test in Cursor

1. **Open Cursor**
2. **Check if environment variables are loaded**:
   - In terminal: `echo $GITHUB_TOKEN`
   - Should show the token (if exported)
3. **Monitor Activity log**:
   - Should see fewer/no `op` calls

## Troubleshooting

### Still Getting Prompts

1. **Check Activity log** - See what's still calling `op`
2. **Find the source** - Extension, setting, or Git config
3. **Configure it** to use `.env` instead

### .env File Not Found

1. **Check 1Password Environment** is mounted
2. **Verify path** in Environment settings
3. **Restart 1Password** if needed

### Token Not Available

1. **Check `.env` file** has the token
2. **Verify variable name** matches what Cursor expects
3. **Export manually** if needed: `export GITHUB_TOKEN=...`

## Success Indicators

You'll know it's working when:

- ✅ **Activity log** shows no more `op item get` calls
- ✅ **No authorization prompts** in Cursor
- ✅ **Environment variables** available in Cursor
- ✅ **Git operations** work without prompts

## Summary

**Setup is complete!** Now:

1. ✅ **Verify `.env` files** are working
2. ✅ **Find what calls `op`** in Cursor (extensions/settings)
3. ✅ **Configure it** to use `.env` instead
4. ✅ **Monitor Activity log** to confirm it's working

Once Cursor stops calling `op` commands, the prompts will stop completely!
