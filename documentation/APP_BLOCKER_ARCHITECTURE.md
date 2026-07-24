# App Blocker Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         User Device                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              KaiwaAI App (React/Next.js)            │    │
│  │                                                      │    │
│  │  ┌──────────────────┐    ┌────────────────────┐   │    │
│  │  │  Settings Page   │    │  Review Session    │   │    │
│  │  │  - Configure     │    │  - Do flashcards   │   │    │
│  │  │  - Select apps   │    │  - Track progress  │   │    │
│  │  └────────┬─────────┘    └─────────┬──────────┘   │    │
│  │           │                         │              │    │
│  │           ▼                         ▼              │    │
│  │  ┌──────────────────────────────────────────┐    │    │
│  │  │      AppBlocker Capacitor Plugin         │    │    │
│  │  │  - startMonitoring()                     │    │    │
│  │  │  - addBlockedApp()                       │    │    │
│  │  │  - markFlashcardsCompleted()             │    │    │
│  │  └────────────────┬─────────────────────────┘    │    │
│  └───────────────────┼──────────────────────────────┘    │
│                      │ Capacitor Bridge                  │
│  ────────────────────┼─────────────────────────────────  │
│                      ▼                                    │
│  ┌──────────────────────────────────────────────────┐    │
│  │         Android Native Layer (Kotlin/Java)       │    │
│  │                                                   │    │
│  │  ┌───────────────────────────────────────────┐  │    │
│  │  │       AppMonitorService                   │  │    │
│  │  │  - Foreground service                     │  │    │
│  │  │  - Polls UsageStatsManager every 1s       │  │    │
│  │  │  - Detects foreground app changes         │  │    │
│  │  └──────────────────┬────────────────────────┘  │    │
│  │                     │                            │    │
│  │                     ▼                            │    │
│  │         Is app in blocked list?                 │    │
│  │                     │                            │    │
│  │           ┌─────────┴─────────┐                 │    │
│  │           NO                  YES                │    │
│  │           │                    │                 │    │
│  │      Do nothing        ┌───────▼──────────┐     │    │
│  │                        │  Check if flag:  │     │    │
│  │                        │ flashcards_done  │     │    │
│  │                        └───────┬──────────┘     │    │
│  │                                │                 │    │
│  │                      ┌─────────┴─────────┐      │    │
│  │                     YES                 NO       │    │
│  │                      │                   │       │    │
│  │                 Allow app      Launch    │       │    │
│  │                                          ▼       │    │
│  │               ┌──────────────────────────────┐  │    │
│  │               │  FlashcardBlockActivity      │  │    │
│  │               │  - Full screen               │  │    │
│  │               │  - Loads flashcard WebView   │  │    │
│  │               │  - Blocks back button        │  │    │
│  │               └──────────────────────────────┘  │    │
│  │                                                   │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │              SharedPreferences                    │   │
│  │  - blocked_apps: ["com.youtube", ...]            │   │
│  │  - flashcard_requirement: 10                      │   │
│  │  - flashcards_completed: false                    │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. Setup Flow
```
User opens Settings
        │
        ▼
Requests permissions
        │
        ├──▶ Usage Stats Access
        │
        └──▶ Display Over Apps
        │
        ▼
Selects apps to block
        │
        ▼
Sets flashcard requirement
        │
        ▼
Starts monitoring
        │
        ▼
AppMonitorService starts
        │
        ▼
Foreground notification shown
```

### 2. Blocking Flow
```
User tries to open YouTube
        │
        ▼
YouTube launches
        │
        ▼
UsageStatsManager detects
        │
        ▼
AppMonitorService checks:
"Is YouTube blocked?"
        │
        ├─ NO ──▶ Continue normally
        │
        └─ YES ─▶ Check completion flag
                        │
                        ├─ TRUE ──▶ Allow access
                        │
                        └─ FALSE ─▶ Launch FlashcardBlockActivity
                                            │
                                            ▼
                                    Show flashcard WebView
                                            │
                                            ▼
                                    User completes flashcards
                                            │
                                            ▼
                                    Set flag: flashcards_completed = true
                                            │
                                            ▼
                                    Dismiss activity
                                            │
                                            ▼
                                    YouTube resumes
```

### 3. Data Flow
```
┌──────────────────┐
│   React Layer    │
│  (TypeScript)    │
└────────┬─────────┘
         │
         │ AppBlocker.addBlockedApp({ packageName: "com.youtube" })
         │
         ▼
┌──────────────────────┐
│ Capacitor Bridge     │
│ (JavaScript/Native)  │
└────────┬─────────────┘
         │
         │ invoke AppBlockerPlugin.addBlockedApp()
         │
         ▼
┌──────────────────────┐
│   Native Plugin      │
│   (Kotlin)           │
└────────┬─────────────┘
         │
         │ getSharedPreferences("AppBlocker")
         │ .edit().putStringSet("blocked_apps", set).apply()
         │
         ▼
┌──────────────────────┐
│  SharedPreferences   │
│   (Android Storage)  │
└──────────────────────┘
```

## File Dependency Graph

```
Settings Page (page.tsx)
    │
    ├─▶ AppBlocker Plugin (index.ts)
    │       │
    │       ├─▶ definitions.ts (TypeScript types)
    │       │
    │       └─▶ web.ts (Web fallback)
    │
    └─▶ Capacitor Bridge
            │
            └─▶ AppBlockerPlugin.kt
                    │
                    ├─▶ AppMonitorService.kt
                    │       │
                    │       └─▶ FlashcardBlockActivity.kt
                    │
                    └─▶ PermissionHelper.kt
```

## Permission Flow

```
User clicks "Grant Permissions"
        │
        ▼
PermissionHelper.hasUsageStatsPermission()
        │
        ├─ FALSE ──▶ PermissionHelper.requestUsageStatsPermission()
        │                   │
        │                   └──▶ Opens Settings → Usage Access
        │
        ▼
PermissionHelper.hasOverlayPermission()
        │
        ├─ FALSE ──▶ PermissionHelper.requestOverlayPermission()
        │                   │
        │                   └──▶ Opens Settings → Display Over Apps
        │
        ▼
Both granted → Enable monitoring
```

## Monitoring Loop

```
AppMonitorService.onCreate()
        │
        ▼
Start foreground service
        │
        ▼
Post handler every 1 second
        │
        ▼
┌───────────────────────────┐
│   checkForegroundApp()    │
│                           │
│  1. Get current time      │
│  2. Query UsageEvents     │
│     from lastCheckedTime  │
│  3. Find last            │
│     MOVE_TO_FOREGROUND   │
│  4. Update lastCheckedTime│
│  5. Check if blocked     │
│                           │
└───────────┬───────────────┘
            │
            ▼
   Schedule next check (1s)
            │
            └──▶ Loop forever
```

## State Machine

```
                    ┌─────────────┐
                    │  INACTIVE   │
                    │ (Monitoring │
                    │    OFF)     │
                    └──────┬──────┘
                           │
              startMonitoring()
                           │
                           ▼
                    ┌─────────────┐
                    │   ACTIVE    │◀───────┐
                    │ (Monitoring │        │
                    │    ON)      │        │
                    └──────┬──────┘        │
                           │               │
             App launch detected       No block
                           │               │
                           ▼               │
                    ┌─────────────┐        │
                    │  CHECKING   │────────┘
                    │ (Is blocked?│
                    └──────┬──────┘
                           │
                      YES, blocked
                           │
                           ▼
                    ┌─────────────┐
                    │  BLOCKING   │
                    │(Show cards) │
                    └──────┬──────┘
                           │
                   Flashcards done
                           │
                           ▼
                    ┌─────────────┐
                    │  COMPLETED  │
                    │(Allow app)  │
                    └──────┬──────┘
                           │
                   Reset flag manually
                       or timeout
                           │
                           └──────▶ Back to ACTIVE
```

## Threading Model

```
Main Thread (UI)
    │
    ├─▶ Settings Page (React)
    ├─▶ Capacitor Bridge
    └─▶ AppBlockerPlugin methods
    
Background Thread
    │
    └─▶ AppMonitorService
            │
            └─▶ Handler.postDelayed()
                    │
                    └─▶ checkForegroundApp()
                            │
                            └─▶ UsageStatsManager queries
    
WebView Thread
    │
    └─▶ FlashcardBlockActivity
            │
            └─▶ WebView.loadUrl()
                    │
                    └─▶ React app running in WebView
```

## Security Boundaries

```
┌─────────────────────────────────────┐
│         Untrusted Boundary          │
│                                     │
│  ┌────────────────────────────┐    │
│  │   User Input               │    │
│  │   - App selection          │    │
│  │   - Flashcard count        │    │
│  └──────────┬─────────────────┘    │
│             │                       │
└─────────────┼───────────────────────┘
              │ Validate input
              │
┌─────────────▼───────────────────────┐
│         Trusted Boundary            │
│                                     │
│  ┌────────────────────────────┐    │
│  │   Plugin Logic             │    │
│  │   - Store in prefs         │    │
│  │   - Start service          │    │
│  └──────────┬─────────────────┘    │
│             │                       │
│  ┌──────────▼─────────────────┐    │
│  │   System APIs              │    │
│  │   - UsageStatsManager      │    │
│  │   - PackageManager         │    │
│  │   - ActivityManager        │    │
│  └────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

This architecture ensures:
- ✅ Separation of concerns (React UI, Capacitor bridge, Native logic)
- ✅ Type safety (TypeScript interfaces)
- ✅ Performance (1s polling is minimal battery impact)
- ✅ Reliability (Foreground service survives app closure)
- ✅ User control (Easy on/off toggle)
