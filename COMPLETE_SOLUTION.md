# Complete Solution: Stop Frequent 1Password Prompts

## The Situation

✅ **Confirmed**: No checkbox option in authorization prompt  
✅ **Confirmed**: Cursor is repeatedly calling `op item get dnobmkuibnr5vaqkfilottoasu` (GitHub token)  
✅ **Problem**: Each call triggers a new authorization prompt

## The Only Real Solution

Since 1Password **doesn't offer persistent authorization**, we must **stop Cursor from calling `op` commands**.

### Solution: Add GitHub Token to .env File

#### Step 1: Get the Token from 1Password

1. **Open 1Password app**
2. **Search for "GitHub Personal Access Token"**
3. **Copy the token value** (the actual token string)

#### Step 2: Add to 1Password Environment

1. **1Password → Environments → Your Environment**
2. **Click "Add variable"**
3. **Set**:
   - **Name**: `GITHUB_TOKEN` (or `GH_TOKEN` - check what Cursor expects)
   - **Value**: Paste the token you copied
4. **Save**

#### Step 3: Ensure .env File is Mounted

1. **In Environment → Destinations tab**
2. **Make sure "Local .env file" is enabled**
3. **Path should point to your project's `.env` file**

The token will automatically sync to `.env` - Cursor can read it from there!

#### Step 4: Find What in Cursor Is Calling `op`

We need to stop whatever is making these calls:

**Check Extensions**:
1. **Cursor → Extensions** (Cmd+Shift+X)
2. **Search**: "github", "git", "1password", "secrets"
3. **Disable** any that use 1Password CLI
4. **Configure** them to use `.env` files instead

**Check Settings**:
1. **Cursor → Settings** (Cmd+,)
2. **Search**: "github", "token", "secrets", "environment"
3. **Look for** settings that fetch tokens via CLI
4. **Change** to use environment variables from `.env`

**Check Git Config**:
```bash
git config --list | grep -i credential
git config --list | grep -i github
```

If Git is configured to use 1Password, change it to use `.env` instead.

## Alternative: Manual .env Addition

If you prefer to add directly to `.env`:

1. **Get token** from 1Password app
2. **Add to your project's `.env` file**:
   ```bash
   echo "GITHUB_TOKEN=your_token_here" >> ~/Developer/readwise-mcp/.env
   ```
3. **Cursor will read it automatically**

## Verify It's Working

After adding to `.env`:

1. **Check `.env` file**:
   ```bash
   cat ~/Developer/readwise-mcp/.env | grep GITHUB
   ```

2. **Monitor Activity log**:
   - 1Password → Settings → Developer → Activity
   - Should see **fewer `op item get` calls**

3. **Test in Cursor**:
   - The token should be available as `process.env.GITHUB_TOKEN` or `$GITHUB_TOKEN`

## Summary

**Since there's no checkbox option**, the solution is:

1. ✅ **Add GitHub token to `.env` file** (via 1Password Environment)
2. ✅ **Find what in Cursor calls `op`** (extensions/settings)
3. ✅ **Configure it to use `.env`** instead of `op` commands
4. ✅ **No more `op` calls = No more prompts**

The `.env` file approach is the **only reliable way** to eliminate prompts since 1Password doesn't offer persistent authorization.

## Next Action

**Right now**: 
1. Open 1Password → Find the GitHub token → Copy it
2. Add it to your Environment as `GITHUB_TOKEN`
3. Check Cursor extensions/settings for what's calling `op`
4. Configure it to use `.env` instead

Once Cursor reads from `.env` instead of calling `op`, the prompts will stop completely.
