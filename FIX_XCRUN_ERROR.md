# How to Fix the xcrun Error

The error you're seeing is:
```
xcrun: error: invalid active developer path (/Library/Developer/CommandLineTools), missing xcrun at: /Library/Developer/CommandLineTools/usr/bin/xcrun
```

This means your Xcode Command Line Tools are either missing or incorrectly configured.

## Solution 1: Reinstall Command Line Tools (Recommended)

1. Open Terminal
2. Run this command:
   ```bash
   xcode-select --install
   ```
3. A popup window will appear asking you to install the tools
4. Click "Install" and wait for the installation to complete (this may take 10-15 minutes)
5. Once done, verify it works:
   ```bash
   git --version
   ```

## Solution 2: Reset the Developer Path

If Solution 1 doesn't work, try resetting the path:

1. Open Terminal
2. Run:
   ```bash
   sudo xcode-select --reset
   ```
   (You'll need to enter your Mac password)
3. Then try:
   ```bash
   xcode-select --install
   ```

## Solution 3: Manually Set the Path

If you have Xcode installed:

1. Open Terminal
2. Run:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   ```

Or if you only have Command Line Tools:

1. Check if they exist:
   ```bash
   ls -la /Library/Developer/CommandLineTools
   ```
2. If they exist, set the path:
   ```bash
   sudo xcode-select --switch /Library/Developer/CommandLineTools
   ```

## After Fixing

Once the xcrun error is resolved, you can push to GitHub:

```bash
cd "/Users/aanakhanduri/Desktop/untitled folder/compliance alert system"
git add .
git commit -m "feat: initial commit - compliance alert triage system

- Add React TypeScript application with Vite build tool
- Implement compliance alert management interface with 5 alert types
- Add 4 severity levels (Critical, High, Medium, Low) with color coding
- Add 5 status options (New, In Review, Escalated, Dismissed, Resolved)
- Implement metrics dashboard with 4 key performance indicators
- Add filtering functionality by severity and status
- Add real-time search by alert ID, trader name, or trader ID
- Add sorting by time and severity (ascending/descending)
- Implement alert detail modal with full information display
- Add action buttons: Start Investigation, Escalate, Dismiss, Mark Resolved
- Add investigation notes textarea with timeline tracking
- Implement toast notifications for user actions
- Add loading states on action buttons
- Add export to JSON functionality
- Configure Tailwind CSS with PostCSS and Autoprefixer
- Add professional UI/UX with smooth animations and transitions
- Generate 20 realistic mock compliance alerts with varied data
- Add empty state handling for filtered results
- Add responsive grid layout for alert cards
- Include trader details (ID, name, firm, email, registration date)
- Add action timeline with chronological event tracking"
git push -u origin main
```

## Quick Test

To verify git is working, run:
```bash
git --version
```

If this shows a version number (like `git version 2.x.x`), you're good to go!

