# Quick Start: App Blocker Feature

## 🚀 Get Started in 5 Minutes

### Step 1: Build & Sync
```bash
npm run cap:sync
```

This will:
- Build your Next.js app
- Copy files to Android project
- Set up Capacitor

### Step 2: Open Android Studio
```bash
npm run cap:android
```

### Step 3: Run on Device
In Android Studio:
- Connect your Android phone via USB (with USB Debugging enabled)
- Click the green "Run" button
- Wait for the app to install

### Step 4: Grant Permissions
In the KaiwaAI app:
1. Go to **Settings → App Blocker** (you'll need to add this to your nav)
2. Tap **"Grant Permissions"**
3. Enable **Usage Access**
4. Enable **Display Over Other Apps**

### Step 5: Configure Blocking
1. Select apps to block (e.g., YouTube, Instagram)
2. Set flashcard count (default: 10)
3. Tap **"Start Monitoring"**

### Step 6: Test It!
1. Go to home screen
2. Try opening a blocked app
3. KaiwaAI should intercept it! 🎉

## 📱 Adding Settings Link to Your App

You need to add a link to the App Blocker settings page. Find your navigation component and add:

```tsx
<Link href="/settings/app-blocker">
  🔒 App Blocker
</Link>
```

## 🔧 Troubleshooting

**"Can't grant permissions"**
- Go to Android Settings → Apps → KaiwaAI
- Manually enable permissions

**"App not being blocked"**
- Make sure monitoring is ON (green indicator)
- Check permissions are granted
- Restart the app

**"Service keeps stopping"**
- Disable battery optimization for KaiwaAI
- Settings → Battery → Battery Optimization → KaiwaAI → Don't optimize

## 📚 Next Steps

- Read [APP_BLOCKER_README.md](./APP_BLOCKER_README.md) for full documentation
- Customize the blocking behavior in Android native code
- Add more features like scheduling, statistics, etc.

## 🎯 Key Files

- **Settings UI**: `src/app/(app)/settings/app-blocker/page.tsx`
- **Plugin Interface**: `src/plugins/app-blocker/`
- **Android Code**: `android/app/src/main/java/com/kaiwaai/app/`

Enjoy your productivity-boosting app blocker! 🚀
