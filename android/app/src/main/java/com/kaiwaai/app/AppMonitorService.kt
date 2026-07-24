package com.kaiwaai.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

class AppMonitorService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private val checkInterval = 500L // Check every 500ms
    private var isMonitoringActive = false
    private var lastForegroundPackage: String? = null
    private var lastInterceptTime: Long = 0
    private var overlayView: View? = null

    companion object {
        var isRunning = false
        private var instance: AppMonitorService? = null
        private const val TAG = "AppBlockerService"
        private const val INTERCEPT_COOLDOWN_MS = 2500L // Prevent rapid re-launch spam

        fun getInstance(context: Context): AppMonitorService? {
            return instance
        }

        const val CHANNEL_ID = "AppBlockerChannel"
        const val NOTIFICATION_ID = 1001
        const val BLOCK_ALERT_NOTIFICATION_ID = 2002
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        isRunning = true
        createNotificationChannel()

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(
                    NOTIFICATION_ID,
                    createNotification(),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                )
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    createNotification(),
                    0
                )
            } else {
                startForeground(NOTIFICATION_ID, createNotification())
            }
            Log.d(TAG, "Foreground service started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start foreground service: ${e.message}", e)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!isMonitoringActive) {
            isMonitoringActive = true
            startMonitoring()
            Log.d(TAG, "App monitoring loop started")
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        isMonitoringActive = false
        instance = null
        removeOverlayWindow()
        handler.removeCallbacksAndMessages(null)
        Log.d(TAG, "AppMonitorService destroyed")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "App Blocker Service",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Monitoring for blocked apps"
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }

    private fun createNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("KaiwaAI App Blocker")
        .setContentText("Monitoring active")
        .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setOngoing(true)
        .build()

    private fun startMonitoring() {
        handler.postDelayed(object : Runnable {
            override fun run() {
                if (isRunning) {
                    checkForegroundApp()
                    handler.postDelayed(this, checkInterval)
                }
            }
        }, checkInterval)
    }

    private fun checkForegroundApp() {
        try {
            val currentTime = System.currentTimeMillis()
            val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

            // Query rolling 60-second window to reliably detect foreground package
            val events = usageStatsManager.queryEvents(currentTime - 60000, currentTime)
            val event = UsageEvents.Event()

            var latestPackageInEvents: String? = null

            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                // Event type 1 is MOVE_TO_FOREGROUND / ACTIVITY_RESUMED (API 29+)
                if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND || event.eventType == 1) {
                    latestPackageInEvents = event.packageName
                }
            }

            if (latestPackageInEvents != null) {
                lastForegroundPackage = latestPackageInEvents
            }

            lastForegroundPackage?.let { targetPackage ->
                checkIfBlocked(targetPackage)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in checkForegroundApp: ${e.message}", e)
        }
    }

    private fun checkIfBlocked(lastAppPackage: String) {
        val prefs = getSharedPreferences("AppBlocker", MODE_PRIVATE)
        val blockedApps = prefs.getStringSet("blocked_apps", setOf()) ?: setOf()
        val flashcardsCompleted = prefs.getBoolean("flashcards_completed", false)
        val unlockExpirationTime = prefs.getLong("unlock_expiration_time", 0L)
        val currentTime = System.currentTimeMillis()

        // Check if unlock grace period has expired
        val isUnlockValid = flashcardsCompleted && currentTime < unlockExpirationTime

        if (flashcardsCompleted && !isUnlockValid) {
            Log.d(TAG, "Unlock grace period expired. Resetting flashcards_completed to false.")
            prefs.edit()
                .putBoolean("flashcards_completed", false)
                .putLong("unlock_expiration_time", 0L)
                .apply()
        }

        if (blockedApps.contains(lastAppPackage)) {
            if (!isUnlockValid) {
                // Rate limit interception trigger
                if (currentTime - lastInterceptTime < INTERCEPT_COOLDOWN_MS) {
                    return
                }

                // Check block chance probability percentage (1-100%)
                val blockChancePct = prefs.getInt("block_chance_pct", 100)
                if (blockChancePct < 100) {
                    val roll = kotlin.random.Random.nextInt(100)
                    if (roll >= blockChancePct) {
                        Log.d(TAG, "Block skipped by probability roll: $roll vs threshold $blockChancePct%")
                        return
                    }
                }

                lastInterceptTime = currentTime

                val isConnected = NetworkUtils.isNetworkAvailable(this)
                val targetCount = prefs.getInt("flashcard_requirement", 10)
                val reviewType = prefs.getString("review_type", "vocabulary")
                val direction = prefs.getString("direction", "jp-to-en")

                Log.i(TAG, "🚨 BLOCKING DETECTED: $lastAppPackage | Online: $isConnected | Requirement: $targetCount cards ($reviewType/$direction)")

                // 1. KICK THE BLOCKED APP OUT TO HOME SCREEN IMMEDIATELY
                try {
                    val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                        addCategory(Intent.CATEGORY_HOME)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    startActivity(homeIntent)
                } catch (e: Exception) {
                    Log.e(TAG, "Error launching home intent: ${e.message}")
                }

                val fullScreenIntent = Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or 
                            Intent.FLAG_ACTIVITY_SINGLE_TOP or
                            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    putExtra("route", "/app-lock?autostart=true&mode=app-blocker&count=$targetCount&blocked_package=$lastAppPackage&reviewType=$reviewType&direction=$direction")
                    putExtra("blocked_package", lastAppPackage)
                    putExtra("is_online", isConnected)
                }

                // 2. Launch KaiwaAI Flashcard Review Screen directly (no overlay intermediate)
                handler.postDelayed({
                    try {
                        startActivity(fullScreenIntent)
                    } catch (e: Exception) {
                        Log.e(TAG, "Direct startActivity failed: ${e.message}", e)
                    }
                }, 100L)

                // 3. Notification fallback (tap opens flashcards directly)
                try {
                    val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    } else {
                        PendingIntent.FLAG_UPDATE_CURRENT
                    }

                    val fullScreenPendingIntent = PendingIntent.getActivity(
                        this,
                        0,
                        fullScreenIntent,
                        pendingFlags
                    )

                    val alertNotification = NotificationCompat.Builder(this, CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                        .setContentTitle("🔒 KaiwaAI Focus Guard")
                        .setContentText("Complete $targetCount flashcards to unlock app")
                        .setPriority(NotificationCompat.PRIORITY_MAX)
                        .setCategory(NotificationCompat.CATEGORY_ALARM)
                        .setFullScreenIntent(fullScreenPendingIntent, true)
                        .setAutoCancel(true)
                        .build()

                    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    notificationManager.notify(BLOCK_ALERT_NOTIFICATION_ID, alertNotification)
                } catch (e: Exception) {
                    Log.e(TAG, "FullScreen notification trigger failed: ${e.message}", e)
                }
            } else {
                removeOverlayWindow()
            }
        } else if (lastAppPackage == packageName) {
            removeOverlayWindow()
        }
    }

    private fun showOverlayWindow(targetPackage: String, targetCount: Int, reviewType: String = "vocabulary", direction: String = "jp-to-en") {
        if (overlayView != null) return

        handler.post {
            try {
                val windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
                val layoutParams = WindowManager.LayoutParams().apply {
                    type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    } else {
                        @Suppress("DEPRECATION")
                        WindowManager.LayoutParams.TYPE_PHONE
                    }
                    flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                            WindowManager.LayoutParams.FLAG_FULLSCREEN
                    format = PixelFormat.TRANSLUCENT
                    width = WindowManager.LayoutParams.MATCH_PARENT
                    height = WindowManager.LayoutParams.MATCH_PARENT
                    gravity = Gravity.CENTER
                }

                val layout = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    gravity = Gravity.CENTER
                    setBackgroundColor(Color.parseColor("#EE0F172A")) // Translucent dark slate background
                    setPadding(60, 60, 60, 60)
                }

                val lockIcon = TextView(this).apply {
                    text = "🔒"
                    textSize = 56f
                    gravity = Gravity.CENTER
                }

                val titleView = TextView(this).apply {
                    text = "KaiwaAI Focus Guard"
                    textSize = 22f
                    setTextColor(Color.WHITE)
                    setTypeface(null, Typeface.BOLD)
                    gravity = Gravity.CENTER
                    setPadding(0, 20, 0, 10)
                }

                val subtitleView = TextView(this).apply {
                    text = "Complete $targetCount flashcards to unlock app"
                    textSize = 14f
                    setTextColor(Color.parseColor("#94A3B8"))
                    gravity = Gravity.CENTER
                    setPadding(0, 0, 0, 40)
                }

                val btn = Button(this).apply {
                    text = "Start Review Session 🚀"
                    setBackgroundColor(Color.parseColor("#6366F1"))
                    setTextColor(Color.WHITE)
                    textSize = 15f
                    setPadding(40, 20, 40, 20)
                    setOnClickListener {
                        removeOverlayWindow()
                        val fullScreenIntent = Intent(context, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                            putExtra("route", "/app-lock?autostart=true&mode=app-blocker&count=$targetCount&blocked_package=$targetPackage&reviewType=$reviewType&direction=$direction")
                            putExtra("blocked_package", targetPackage)
                        }
                        startActivity(fullScreenIntent)
                    }
                }

                layout.addView(lockIcon)
                layout.addView(titleView)
                layout.addView(subtitleView)
                layout.addView(btn)

                windowManager.addView(layout, layoutParams)
                overlayView = layout
            } catch (e: Exception) {
                Log.e(TAG, "Error showing overlay window: ${e.message}", e)
            }
        }
    }

    private fun removeOverlayWindow() {
        overlayView?.let { view ->
            try {
                val windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
                windowManager.removeView(view)
            } catch (e: Exception) {
                Log.e(TAG, "Error removing overlay window: ${e.message}")
            }
            overlayView = null
        }
    }
}
