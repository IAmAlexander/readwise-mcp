# 1Password + Cursor IDE & Claude Code Integration Guide

This guide explains how to configure 1Password to work seamlessly with both **Cursor IDE** and **Claude Code**, reducing frequent authentication prompts.

## Problem

1Password may prompt for authentication every few seconds when using Cursor IDE or Claude Code because it cannot verify the code signature or identity of these Electron-based applications. This is a security feature that ensures credentials are only filled into trusted applications.

## Solution

### Step 1: Add Cursor IDE and Claude Code as Trusted Browsers (PRIMARY SOLUTION)

Since Cursor IDE and Claude Code are Electron-based applications, you need to add them as trusted browsers in 1Password:

**On macOS:**
1. Open and unlock the **1Password desktop app**
2. Click your **account or collection** at the top of the sidebar
3. Choose **Settings**
4. Navigate to the **Browser** tab
5. Under **"Connect with 1Password in the browser"**, click **"Add Browser"**
6. Browse to and select the applications:
   - **Cursor IDE**: Typically located at `/Applications/Cursor.app` or `~/Applications/Cursor.app`
   - **Claude Code**: Typically located at `/Applications/Claude.app` or `~/Applications/Claude.app`
   - You may need to right-click and select "Show Package Contents" if needed, but usually selecting the `.app` bundle works
7. **Repeat step 5-6** for each application you want to add

This tells 1Password to trust these applications and establish secure connections with them, which should eliminate the frequent authentication prompts.

**Note**: This feature is currently available on macOS. For Windows and Linux, this functionality may not be fully supported yet.

**Reference**: [1Password Additional Browsers Support](https://support.1password.com/additional-browsers/)

### Step 2: Enable Integration with Other Apps (Alternative/Additional)

If Step 1 doesn't fully resolve the issue, you can also try:

1. Open and unlock the **1Password desktop app**
2. Click your **account or collection** at the top of the sidebar
3. Choose **Settings**
4. Navigate to the **Developer** tab
5. Under **"Integrate with the 1Password SDKs"**, select **"Integrate with other apps"**

**Reference**: [1Password Developer Documentation](https://developer.1password.com/docs/sdks/desktop-app-integrations/)

### Step 2: Update All Applications

Ensure 1Password, Cursor IDE, and Claude Code are updated to their latest versions:

- **1Password**: Check for updates in the app or visit [1password.com/downloads](https://1password.com/downloads)
- **Cursor IDE**: Check for updates in Cursor or visit [cursor.sh](https://cursor.sh)
- **Claude Code**: Check for updates in Claude or visit [claude.ai](https://claude.ai)

Outdated versions may have compatibility issues that cause repeated authentication prompts.

### Step 4: Adjust Auto-Lock Settings

Reduce how often 1Password locks itself:

1. In the 1Password app, navigate to **Settings** > **Security**
2. Adjust the **Auto-lock** settings to a longer duration that suits your workflow
   - Consider setting it to "Never" while actively developing, or to a longer time period (e.g., 30 minutes or 1 hour)

This helps prevent 1Password from locking too frequently during your development sessions.

### Step 5: Enable Biometric Unlock (Optional but Recommended)

Streamline authentication using biometric methods:

**On macOS:**
1. In 1Password app, go to **Settings** > **Security**
2. Turn on **"Unlock using Touch ID"** (or Face ID on newer Macs)

**On Windows:**
1. In 1Password app, go to **Settings** > **Security**
2. Turn on **"Unlock using Windows Hello"**

This allows you to authenticate quickly using your fingerprint or face, making re-authentication less disruptive.

**Reference**: 
- [1Password Touch ID Support](https://support.1password.com/touch-id/)
- [1Password Windows Hello Support](https://support.1password.com/windows-hello/)

### Step 6: Verify Code Signature (If Issue Persists)

If you continue to experience frequent prompts:

1. Ensure Cursor IDE and Claude Code are installed from official sources
2. Check that these applications have proper code signing (this is typically handled by the developers)
3. If the issue persists, contact:
   - **1Password Support**: [support.1password.com](https://support.1password.com/contact/)
   - **Cursor Support**: [cursor.sh](https://cursor.sh) (check their support channels)
   - **Claude Support**: [claude.ai](https://claude.ai) (check their support channels)

## Additional Notes

### About Code Signature Verification

1Password uses code signature verification to ensure that your credentials are only filled into trusted applications. If 1Password cannot verify Cursor IDE's or Claude Code's code signature, it will prompt for authentication more frequently as a security measure.

**On macOS and Windows:** 1Password verifies the application's code signature to ensure it hasn't been tampered with. By adding Cursor IDE and Claude Code as trusted browsers, you're explicitly telling 1Password to trust these applications despite any code signature verification issues.

### Device Trust Check

1Password has a Device Trust Check feature that helps enforce the presence and activation of the 1Password browser extension. This is separate from desktop app integration but may affect overall authentication behavior.

## Quick Checklist

- [ ] **Add Cursor IDE as a trusted browser** in 1Password Browser settings (PRIMARY SOLUTION)
- [ ] **Add Claude Code as a trusted browser** in 1Password Browser settings (PRIMARY SOLUTION)
- [ ] Enable "Integrate with other apps" in 1Password Developer settings (if needed)
- [ ] Update 1Password to the latest version
- [ ] Update Cursor IDE to the latest version
- [ ] Update Claude Code to the latest version
- [ ] Adjust auto-lock settings to a longer duration
- [ ] Enable biometric unlock (Touch ID/Windows Hello)
- [ ] Restart all applications after making changes

## References

- [1Password Additional Browsers](https://support.1password.com/additional-browsers/) - **Primary solution for Electron apps**
- [1Password Browser Connection Security](https://support.1password.com/1password-browser-connection-security/)
- [1Password Desktop App Integrations](https://developer.1password.com/docs/sdks/desktop-app-integrations/)
- [1Password Code Signature Verification](https://support.1password.com/code-signature/)
- [1Password Device Trust Check](https://1password.com/blog/new-device-trust-check-makes-browser-extension-enforcement-easier)

---

**Last Updated**: Based on research conducted in December 2024
