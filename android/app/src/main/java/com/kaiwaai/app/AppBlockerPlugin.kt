package com.kaiwaai.app

import android.content.Intent
import android.util.Log
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "AppBlocker")
class AppBlockerPlugin : Plugin() {

    private var monitoringService: AppMonitorService? = null

    override fun load() {
        monitoringService = AppMonitorService.getInstance(activity.applicationContext)
    }

    @PluginMethod
    fun startMonitoring(call: PluginCall) {
        val prefs = activity.getSharedPreferences("AppBlocker", android.content.Context.MODE_PRIVATE)
        prefs.edit().putBoolean("flashcards_completed", false).apply()

        val intent = Intent(activity, AppMonitorService::class.java)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            activity.startForegroundService(intent)
        } else {
            activity.startService(intent)
        }
        call.resolve()
    }

    @PluginMethod
    fun stopMonitoring(call: PluginCall) {
        val intent = Intent(activity, AppMonitorService::class.java)
        activity.stopService(intent)
        call.resolve()
    }

    @PluginMethod
    fun isMonitoring(call: PluginCall) {
        val active = AppMonitorService.isRunning
        val ret = com.getcapacitor.JSObject()
        ret.put("active", active)
        call.resolve(ret)
    }

    @PluginMethod
    fun addBlockedApp(call: PluginCall) {
        val packageName = call.getString("packageName")
        if (packageName == null) {
            call.reject("Package name is required")
            return
        }

        val prefs = activity.getSharedPreferences("AppBlocker", android.content.Context.MODE_PRIVATE)
        val blockedApps = HashSet(prefs.getStringSet("blocked_apps", emptySet()) ?: emptySet())
        blockedApps.add(packageName)
        prefs.edit().putStringSet("blocked_apps", blockedApps).apply()

        call.resolve()
    }

    @PluginMethod
    fun removeBlockedApp(call: PluginCall) {
        val packageName = call.getString("packageName")
        if (packageName == null) {
            call.reject("Package name is required")
            return
        }

        val prefs = activity.getSharedPreferences("AppBlocker", android.content.Context.MODE_PRIVATE)
        val blockedApps = HashSet(prefs.getStringSet("blocked_apps", emptySet()) ?: emptySet())
        blockedApps.remove(packageName)
        prefs.edit().putStringSet("blocked_apps", blockedApps).apply()

        call.resolve()
    }

    @PluginMethod
    fun getBlockedApps(call: PluginCall) {
        val prefs = activity.getSharedPreferences("AppBlocker", android.content.Context.MODE_PRIVATE)
        val blockedApps = prefs.getStringSet("blocked_apps", setOf()) ?: setOf()

        val ret = com.getcapacitor.JSObject()
        ret.put("apps", com.getcapacitor.JSArray(blockedApps.toList()))
        call.resolve(ret)
    }

    @PluginMethod
    fun getInstalledApps(call: PluginCall) {
        val pm = activity.packageManager
        val apps = pm.getInstalledApplications(android.content.pm.PackageManager.GET_META_DATA)
        
        val appsList = com.getcapacitor.JSArray()
        for (app in apps) {
            if (pm.getLaunchIntentForPackage(app.packageName) != null) {
                val appObj = com.getcapacitor.JSObject()
                appObj.put("packageName", app.packageName)
                appObj.put("appName", pm.getApplicationLabel(app).toString())
                appsList.put(appObj)
            }
        }

        val ret = com.getcapacitor.JSObject()
        ret.put("apps", appsList)
        call.resolve(ret)
    }

    @PluginMethod
    fun setFlashcardRequirement(call: PluginCall) {
        val count = call.getInt("count")
        if (count == null) {
            call.reject("Count is required")
            return
        }

        val prefs = activity.getSharedPreferences("AppBlocker", android.content.Context.MODE_PRIVATE)
        prefs.edit().putInt("flashcard_requirement", count).apply()

        call.resolve()
    }

    @PluginMethod
    fun getFlashcardRequirement(call: PluginCall) {
        val prefs = activity.getSharedPreferences("AppBlocker", android.content.Context.MODE_PRIVATE)
        val count = prefs.getInt("flashcard_requirement", 10)

        val ret = com.getcapacitor.JSObject()
        ret.put("count", count)
        call.resolve(ret)
    }

    @PluginMethod
    fun getAppBlockerConfig(call: PluginCall) {
        val prefs = activity.getSharedPreferences("AppBlocker", android.content.Context.MODE_PRIVATE)
        
        val ret = com.getcapacitor.JSObject().apply {
            put("count", prefs.getInt("flashcard_requirement", 10))
            put("blockChance", prefs.getInt("block_chance_pct", 100))
            put("unlockDurationMinutes", prefs.getInt("unlock_duration_minutes", 15))
            put("reviewType", prefs.getString("review_type", "vocabulary"))
            put("direction", prefs.getString("direction", "jp-to-en"))
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun setAppBlockerConfig(call: PluginCall) {
        val prefs = activity.getSharedPreferences("AppBlocker", android.content.Context.MODE_PRIVATE)
        val editor = prefs.edit()

        call.getInt("count")?.let { editor.putInt("flashcard_requirement", it) }
        call.getInt("blockChance")?.let { editor.putInt("block_chance_pct", it) }
        call.getInt("unlockDurationMinutes")?.let { editor.putInt("unlock_duration_minutes", it) }
        call.getString("reviewType")?.let { editor.putString("review_type", it) }
        call.getString("direction")?.let { editor.putString("direction", it) }

        editor.apply()
        call.resolve()
    }

    @PluginMethod
    fun markFlashcardsCompleted(call: PluginCall) {
        val prefs = activity.getSharedPreferences("AppBlocker", android.content.Context.MODE_PRIVATE)
        val unlockDurationMinutes = prefs.getInt("unlock_duration_minutes", 15)
        val expirationTime = System.currentTimeMillis() + (unlockDurationMinutes * 60 * 1000L)
        
        prefs.edit()
            .putBoolean("flashcards_completed", true)
            .putLong("unlock_expiration_time", expirationTime)
            .apply()

        call.resolve()
    }

    @PluginMethod
    fun launchApp(call: PluginCall) {
        val packageName = call.getString("packageName")
        if (packageName == null) {
            call.reject("Package name is required")
            return
        }

        try {
            val pm = activity.packageManager
            val intent = pm.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
                activity.startActivity(intent)
                call.resolve()
            } else {
                call.reject("App not found: $packageName")
            }
        } catch (e: Exception) {
            call.reject("Failed to launch app: ${e.message}")
        }
    }

    @PluginMethod
    fun isNetworkAvailable(call: PluginCall) {
        val connected = NetworkUtils.isNetworkAvailable(activity.applicationContext)
        val ret = com.getcapacitor.JSObject()
        ret.put("connected", connected)
        call.resolve(ret)
    }

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        val type = call.getString("type") ?: "all"
        
        try {
            if (type == "usageStats") {
                PermissionHelper.requestUsageStatsPermission(activity)
            } else if (type == "overlay") {
                PermissionHelper.requestOverlayPermission(activity)
            } else {
                if (!PermissionHelper.hasUsageStatsPermission(activity)) {
                    PermissionHelper.requestUsageStatsPermission(activity)
                } else if (!PermissionHelper.hasOverlayPermission(activity)) {
                    PermissionHelper.requestOverlayPermission(activity)
                }
            }
        } catch (e: Exception) {
            Log.e("AppBlockerPlugin", "Error in requestPermissions: ${e.message}", e)
        }

        val hasUsageStats = PermissionHelper.hasUsageStatsPermission(activity)
        val hasOverlay = PermissionHelper.hasOverlayPermission(activity)

        val ret = com.getcapacitor.JSObject()
        ret.put("granted", hasUsageStats && hasOverlay)
        ret.put("usageStats", hasUsageStats)
        ret.put("overlay", hasOverlay)
        call.resolve(ret)
    }

    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        val hasUsageStats = PermissionHelper.hasUsageStatsPermission(activity)
        val hasOverlay = PermissionHelper.hasOverlayPermission(activity)

        val ret = com.getcapacitor.JSObject()
        ret.put("granted", hasUsageStats && hasOverlay)
        ret.put("usageStats", hasUsageStats)
        ret.put("overlay", hasOverlay)
        call.resolve(ret)
    }
}
