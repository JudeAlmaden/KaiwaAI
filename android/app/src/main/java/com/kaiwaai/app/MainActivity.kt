package com.kaiwaai.app

import android.content.Intent
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebView
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(AppBlockerPlugin::class.java)
        super.onCreate(savedInstanceState)

        // Enable cookies and third-party cookies for authentication
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(bridge.webView, true)

        // Enable DOM storage for session handling
        val webView: WebView = bridge.webView
        webView.settings.domStorageEnabled = true
        @Suppress("DEPRECATION")
        webView.settings.databaseEnabled = true

        handleRouteIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleRouteIntent(intent)
    }

    private fun handleRouteIntent(intent: Intent?) {
        val route = intent?.getStringExtra("route") ?: return

        // Consume the route so resuming the app doesn't re-trigger app-lock
        intent.removeExtra("route")

        val pathname = route.substringBefore('?')

        // If still within unlock grace period, launch the blocked app directly — skip app-lock
        if (pathname == "/app-lock" && isUnlockGracePeriodActive()) {
            val blockedPackage = intent.getStringExtra("blocked_package")
            intent.removeExtra("blocked_package")
            if (!blockedPackage.isNullOrEmpty()) {
                launchPackage(blockedPackage)
            }
            return
        }

        val prefs = getSharedPreferences("AppBlocker", MODE_PRIVATE)
        prefs.edit().putString("pending_route", route).apply()

        val escapedRoute = route.replace("'", "\\'")
        val navigateJs = "(function() { var cur = window.location.pathname + window.location.search; if (cur !== '$escapedRoute') { window.location.href = '$escapedRoute'; } })()"

        // Post immediate and staggered retries to ensure WebView handles navigation even if still loading on cold start
        val attempts = listOf(0L, 350L, 900L, 1600L)
        attempts.forEach { delay ->
            bridge.webView?.postDelayed({
                bridge.webView?.evaluateJavascript(navigateJs, null)
            }, delay)
        }
    }

    private fun isUnlockGracePeriodActive(): Boolean {
        val prefs = getSharedPreferences("AppBlocker", MODE_PRIVATE)
        val flashcardsCompleted = prefs.getBoolean("flashcards_completed", false)
        val unlockExpiration = prefs.getLong("unlock_expiration_time", 0L)
        return flashcardsCompleted && System.currentTimeMillis() < unlockExpiration
    }

    private fun launchPackage(packageName: String) {
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
            startActivity(launchIntent)
        } catch (_: Exception) {
            // Best-effort launch
        }
    }
}
