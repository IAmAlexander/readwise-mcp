# 1Password SSH Agent Setup Guide

This guide helps you migrate from storing SSH keys on disk to using 1Password's SSH Agent, which is more secure and eliminates the need for unencrypted keys on your filesystem.

## Current Situation

1Password Developer Watchtower has detected:
- **SSH Key**: `~/.ssh/id_ed25519`
- **Status**: Unencrypted and already stored in 1Password
- **Fingerprint**: `SHA256:DpSEoHEd9D9N/QtkYiqNGg474Hz2l8gfYuES68iTIVc`
- **Recommendation**: Delete the redundant copy on disk

## Solution: Use 1Password SSH Agent

Instead of keeping the key on disk, we'll configure your system to use 1Password's SSH Agent, which securely manages your SSH keys.

### Step 1: Enable 1Password SSH Agent

1. Open and unlock the **1Password desktop app**
2. Navigate to **1Password > Settings** (from the menu bar) or click your account → **Settings**
3. Select the **Developer** tab
4. Click **"Set Up SSH Agent"** and follow the prompts to configure it

This will create the SSH agent socket at `~/.1password/agent.sock`.

### Step 2: Configure SSH to Use 1Password SSH Agent

Edit your SSH configuration file to use the 1Password SSH Agent:

```bash
# Create or edit ~/.ssh/config
nano ~/.ssh/config
```

Add the following configuration:

```plaintext
Host *
  IdentityAgent ~/.1password/agent.sock
```

**Alternative**: If you want to use 1Password SSH Agent for all hosts but keep specific keys on disk for certain hosts, you can be more selective:

```plaintext
# Use 1Password SSH Agent for all hosts by default
Host *
  IdentityAgent ~/.1password/agent.sock

# Example: Use a specific key on disk for a particular host
Host special-server
  HostName example.com
  IdentityAgent ~/.1password/agent.sock
  # Or use a key on disk: IdentityFile ~/.ssh/special_key
```

Save the file and exit the editor.

### Step 3: Verify 1Password SSH Agent is Working

1. **Test SSH Agent Connection**:
   ```bash
   ssh-add -l
   ```
   
   If configured correctly, this should show your SSH keys from 1Password (you may need to authenticate with 1Password first).

2. **Test Git Operations**:
   ```bash
   # Try a Git operation that requires SSH authentication
   git ls-remote git@github.com:your-username/your-repo.git
   ```
   
   You should be prompted by 1Password to authorize the SSH key usage (via Touch ID, Apple Watch, or password).

3. **Check SSH Connection**:
   ```bash
   # Test SSH connection to a server (if you have one)
   ssh -T git@github.com
   ```

### Step 4: Verify Your Key is in 1Password

1. Open **1Password**
2. Search for your SSH key (look for "SSH Key" items)
3. Verify the fingerprint matches: `SHA256:DpSEoHEd9D9N/QtkYiqNGg474Hz2l8gfYuES68iTIVc`
4. Ensure the public key is also stored (you'll need it for adding to GitHub, GitLab, etc.)

### Step 5: Backup Your Public Key (Important!)

Before deleting the key from disk, make sure you have the public key saved:

```bash
# Display your public key
cat ~/.ssh/id_ed25519.pub
```

**Save this somewhere safe** (it's already in 1Password, but good to have a backup). You'll need this public key to:
- Add to GitHub/GitLab/Bitbucket
- Add to servers for SSH access
- Share with services that need your public key

### Step 6: Delete the Redundant Key from Disk

Once you've verified that 1Password SSH Agent is working correctly:

```bash
# First, make sure you've tested that everything works with 1Password SSH Agent
# Then remove the redundant keys from disk

# Remove the private key
rm ~/.ssh/id_ed25519

# Remove the public key (optional - you have it in 1Password)
# Keep it if you want a local copy, or remove it:
# rm ~/.ssh/id_ed25519.pub
```

**Important**: Only delete the keys after confirming that:
- ✅ 1Password SSH Agent is working
- ✅ Git operations work with 1Password SSH Agent
- ✅ SSH connections work with 1Password SSH Agent
- ✅ You have the public key saved/backed up

### Step 7: Update 1Password Watchtower

After deleting the key from disk:
1. Go back to **1Password > Settings > Developer > Watchtower**
2. Click **"Refresh"** to re-scan your `~/.ssh` folder
3. The warning should disappear

## Troubleshooting

### SSH Agent Not Found

If you get an error like "Could not open a connection to your authentication agent":

1. **Check if 1Password SSH Agent is running**:
   ```bash
   ls -la ~/.1password/agent.sock
   ```
   
   If the file doesn't exist, go back to Step 1 and ensure SSH Agent is set up.

2. **Restart 1Password** and try again.

### Git Still Using Old Key

If Git operations still try to use the old key:

1. **Clear SSH agent cache**:
   ```bash
   ssh-add -D  # This clears keys from the default SSH agent
   ```

2. **Verify your SSH config**:
   ```bash
   cat ~/.ssh/config
   ```
   
   Make sure `IdentityAgent ~/.1password/agent.sock` is set.

3. **Test with verbose SSH**:
   ```bash
   ssh -vT git@github.com
   ```
   
   This will show which keys are being tried.

### Multiple SSH Keys

If you have multiple SSH keys and need to use specific ones for different hosts:

```plaintext
# Use 1Password SSH Agent by default
Host *
  IdentityAgent ~/.1password/agent.sock
  IdentitiesOnly yes

# Specific host configuration
Host github.com
  IdentityAgent ~/.1password/agent.sock
  # 1Password will automatically offer the right key

Host gitlab.com
  IdentityAgent ~/.1password/agent.sock
```

When using 1Password SSH Agent, you can specify which key to use by setting `IdentityFile` to the **public key** path (if you've exported it from 1Password), but typically 1Password will automatically offer the correct key.

## Benefits of Using 1Password SSH Agent

1. **Security**: Private keys never leave 1Password's secure storage
2. **Convenience**: Keys are synced across all your devices
3. **Biometric Auth**: Use Touch ID/Apple Watch for SSH operations
4. **No Unencrypted Keys**: Eliminates security risk of plaintext keys on disk
5. **Centralized Management**: All SSH keys in one secure place

## References

- [1Password SSH Agent Documentation](https://developer.1password.com/docs/ssh/get-started)
- [1Password SSH Key Management](https://developer.1password.com/docs/ssh/manage-keys)
- [1Password SSH Agent Guide](https://developer.1password.com/docs/ssh/agent/)

---

**Your SSH Key Details**:
- **Key**: `~/.ssh/id_ed25519`
- **Type**: Ed25519
- **Fingerprint**: `SHA256:DpSEoHEd9D9N/QtkYiqNGg474Hz2l8gfYuES68iTIVc`
- **Status**: Already in 1Password ✅
