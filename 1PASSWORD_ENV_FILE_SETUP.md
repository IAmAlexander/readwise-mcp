# Setting Up 1Password Local .env File on macOS

## The Problem

macOS hides files starting with "." (dot files) by default, which makes it hard to select `.env` file paths in file pickers.

## Solutions

### Solution 1: Use Keyboard Shortcut in File Picker (EASIEST)

When the 1Password file picker opens:

1. **Press `Cmd + Shift + .`** (Command + Shift + Period)
   - This toggles showing/hiding hidden files in the file picker
   - Press it once to show hidden files
   - You should now see `.env` files and folders starting with "."

2. **Navigate to your desired location**:
   - For project-specific: Navigate to your project folder
   - For global: Navigate to `~/.1password/` or `~/.config/`

3. **Select or create the file**:
   - If `.env` exists, select it
   - If not, you can type `.env` in the filename field

### Solution 2: Type the Path Directly

Instead of browsing, type the full path:

1. **In the file picker**, look for a path field or "Go to folder" option
2. **Press `Cmd + Shift + G`** (Go to Folder)
3. **Type the full path**:
   - Project-specific: `/Users/alex/Developer/readwise-mcp/.env`
   - Global: `~/.1password/.env` or `/Users/alex/.1password/.env`
4. **Press Enter**

### Solution 3: Create the Directory First

If the directory doesn't exist:

1. **Create the directory**:
   ```bash
   mkdir -p ~/.1password
   ```

2. **In 1Password file picker**:
   - Press `Cmd + Shift + .` to show hidden files
   - Navigate to `~/.1password/`
   - Type `.env` as the filename

### Solution 4: Use Terminal to Create the File First

1. **Create an empty .env file**:
   ```bash
   touch ~/.1password/.env
   # or for project-specific:
   touch /Users/alex/Developer/readwise-mcp/.env
   ```

2. **In 1Password**:
   - Press `Cmd + Shift + .` in the file picker
   - Navigate to the file you just created
   - Select it

## Step-by-Step Guide

### 1. Open 1Password Environments

1. Open **1Password desktop app**
2. Click **"Environments"** in the sidebar (or create a new environment)
3. Select your environment

### 2. Configure Local .env File Destination

1. Click the **"Destinations"** tab
2. Click **"Configure destination"** for "Local `.env` file"
3. Click **"Choose file path"**

### 3. Select/Create the File

**Option A: Show Hidden Files**
- Press `Cmd + Shift + .` in the file picker
- Navigate to your desired location
- Select existing `.env` or type `.env` to create new

**Option B: Type Path Directly**
- Press `Cmd + Shift + G` (Go to Folder)
- Type: `~/.1password/.env` or your project path
- Press Enter

### 4. Mount the File

1. After selecting the path, click **"Mount .env file"**
2. The file will be mounted and ready to use

## Recommended Paths

### For Project-Specific Secrets
```
/Users/alex/Developer/readwise-mcp/.env
```
- Good for: Project-specific secrets
- Each project has its own .env file

### For Global Secrets
```
~/.1password/.env
# or
/Users/alex/.1password/.env
```
- Good for: Shared secrets across projects
- One .env file for all projects

## Verification

After mounting, verify it works:

```bash
# Navigate to the directory
cd ~/.1password  # or your project directory

# Try to read the file (will prompt for authorization)
cat .env
```

You should see:
1. Authorization prompt from 1Password
2. After approving, your environment variables displayed

## Troubleshooting

### File Picker Still Not Showing .env

1. **Make sure you pressed `Cmd + Shift + .`** - This is the toggle
2. **Try typing the path directly** using `Cmd + Shift + G`
3. **Create the file first** using `touch` command

### "File Already Exists" Error

If you have an existing `.env` file tracked by Git:
1. Delete the existing file: `rm .env`
2. Commit the deletion: `git commit -m "Remove .env (now using 1Password)"`
3. Then mount the 1Password .env file

### File Not Found After Mounting

1. **Check the path** - Make sure it's correct
2. **Restart 1Password** - Sometimes remounting is needed
3. **Check 1Password is running** - The file only exists while 1Password is running

## Important Notes

- The `.env` file is **not actually stored on disk** - it's a virtual file
- Contents are only available when you read it (after authorization)
- The file disappears when 1Password locks
- **Don't commit this file to Git** - it's automatically ignored

## Next Steps

After setting up the .env file:

1. **Add your secrets** to the Environment in 1Password
2. **Cursor will automatically read** from the .env file
3. **No more repeated `op item get` calls** needed!

## References

- [1Password Local .env Files Documentation](https://developer.1password.com/docs/environments/local-env-file/)
