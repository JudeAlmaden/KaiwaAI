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
        handleRouteIntent(intent)
    }

    private fun handleRouteIntent(intent: Intent?) {
        val route = intent?.getStringExtra("route")
        if (!route.isNullOrEmpty()) {
            bridge.webView?.post {
                bridge.webView?.loadUrl("javascript:if (window.location.pathname !== '$route') { window.location.href = '$route'; }")
            }
        }
    }
}
