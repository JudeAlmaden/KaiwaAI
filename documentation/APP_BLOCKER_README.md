# App Blocker Feature for Android

This feature allows KaiwaAI to intercept launches of blocked apps (like YouTube, Instagram, etc.) and require users to complete flashcards before accessing those apps.

## How It Works

1. **User Configuration**: Users select which apps to block and set how many flashcards must be completed
2. **Background Monitoring**: A foreground service monitors app launches using UsageStats API
3. **Interception**: When a blocked app is detected, KaiwaAI launches its flashcard interface
4. **Completion**: User must complete the required number of flashcards
5. **Access Granted**: After completion, the user can access the blocked app

## Setup Instructions

### 1. Build the Android App

First, build your Next.js app for static export:

```bash
npm run build
```

This creates the `out` directory with your static site.

### 2. Sync with Capacitor

```bash
npx cap sync android
```

This copies your web assets to the Android project.

### 3. Open in Android Studio

```bash
npx cap open android
```

### 4. Build and Run

In Android Studio:
1. Connect your Android device or start an emulator
2. Click "Run" (green play button) or press Shift+F10
3. The app will install and launch on your device

## Required Permissions

The app requires these permissions (automatically added to AndroidManifest.xml):

- **PACKAGE_USAGE_STATS**: To detect which apps are being launched
- **SYSTEM_ALERT_WINDOW**: To display the flashcard overlay
- **FOREGROUND_SERVICE**: To run the monitoring service in background
- **POST_NOTIFICATIONS**: To show service notification (Android 13+)
- **QUERY_ALL_PACKAGES**: To list installed apps

## Usage

### In the App

1. Navigate to **Settings → App Blocker**
2. Tap **"Grant Permissions"** and allow:
   - Usage Access
   - Display Over Other Apps
3. Select apps you want to block
4. Set the number of flashcards required (default: 10)
5. Tap **"Start Monitoring"**

### Testing

1. Make sure monitoring is active (green indicator)
2. Block an app like YouTube
3. Go to home screen and open YouTube
4. KaiwaAI should intercept and show flashcards
5. Complete flashcards to dismiss

## Integration with Review Session

The review session automatically tracks completion and notifies the app blocker:

```typescript
import { useAppBlockerCompletion } from '@/hooks/useAppBlockerCompletion';

// In your review component
const completedCount = tally.again + tally.good;
const requiredCount = 10; // Or get from settings

useAppBlockerCompletion(completedCount, requiredCount);
```

## Architecture

### TypeScript/React Layer
- **`src/plugins/app-blocker/`**: Capacitor plugin interface
  - `definitions.ts`: TypeScript types
  - `web.ts`: Web fallback (no-op)
  - `index.ts`: Plugin registration

- **`src/app/(app)/settings/app-blocker/page.tsx`**: Settings UI
- **`src/hooks/useAppBlockerCompletion.ts`**: Completion tracking hook

### Android Native Layer
- **`AppBlockerPlugin.kt`**: Capacitor plugin implementation
- **`AppMonitorService.kt`**: Background service that monitors app launches
- **`FlashcardBlockActivity.kt`**: Full-screen activity showing flashcards
- **`PermissionHelper.kt`**: Permission management utilities

### Data Storage
- SharedPreferences (`AppBlocker`):
  - `blocked_apps`: Set of blocked package names
  - `flashcard_requirement`: Number of flashcards required
  - `flashcards_completed`: Boolean flag (reset after access granted)

## Customization

### Change Check Interval

In `AppMonitorService.kt`:
```kotlin
private val checkInterval = 1000L // milliseconds (default: 1 second)
```

### Modify Completion Behavior

In `FlashcardBlockActivity.kt`, the `markCompleted()` function handles what happens after flashcards are done. You can add:
- Temporary access (reset flag after X minutes)
- Daily limits
- Time-based restrictions

### Add Notification

Customize the foreground service notification in `AppMonitorService.kt`:
```kotlin
private fun createNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
    .setContentTitle("Your Title")
    .setContentText("Your Message")
    // ...
```

## Troubleshooting

### Permissions Not Working

1. **Usage Stats**: Go to Settings → Special App Access → Usage Access → KaiwaAI → Enable
2. **Display Over Apps**: Go to Settings → Apps → KaiwaAI → Display Over Other Apps → Enable

### App Not Being Blocked

1. Check monitoring is active in settings
2. Verify the app is in blocked list
3. Check that permissions are granted
4. Look at Android Logcat for errors

### Service Stops

On some devices (especially Chinese OEMs), aggressive battery optimization kills background services:
- Go to Settings → Battery → Battery Optimization
- Find KaiwaAI and set to "Don't optimize"

## Known Limitations

1. **Android Only**: iOS doesn't allow this type of app interception
2. **Battery Usage**: Background monitoring consumes battery (minimal with 1s interval)
3. **Some Apps May Bypass**: System apps or apps with special permissions might not be detectable
4. **User Can Force Close**: Determined users can kill the service via Settings

## Future Enhancements

- [ ] Whitelist apps (never block certain apps)
- [ ] Time-based rules (only block during certain hours)
- [ ] Daily limits (block after X minutes of usage)
- [ ] Statistics dashboard (track blocked attempts)
- [ ] Smart scheduling (block based on study streak)
- [ ] Temporary "break" mode
- [ ] Integration with Screen Time limits

## Security & Privacy

- All data stored locally on device
- No analytics or tracking
- Open source implementation
- User has full control

## License

Same as KaiwaAI main project.
