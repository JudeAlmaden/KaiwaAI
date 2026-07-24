package com.kaiwaai.app

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class FlashcardBlockActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val blockedPackage = intent.getStringExtra("blocked_package")

        // Bring MainActivity (KaiwaAI) to the foreground open to the review page
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("route", "/app-lock?autostart=true&mode=app-blocker&blocked_package=$blockedPackage")
            putExtra("blocked_package", blockedPackage)
        }
        startActivity(mainIntent)
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Prevent back button from dismissing
    }
}
