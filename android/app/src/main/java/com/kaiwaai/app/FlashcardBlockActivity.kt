package com.kaiwaai.app

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class FlashcardBlockActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val blockedPackage = intent.getStringExtra("blocked_package")
        val preferredRoute = intent.getStringExtra("route")
            ?: "/app-lock?autostart=true&mode=app-blocker&blocked_package=$blockedPackage"

        // Bring MainActivity (KaiwaAI) to the foreground open to the review page,
        // passing through any extra flags/config that the caller supplied.
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                    Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            putExtra("route", preferredRoute)
            putExtra("blocked_package", blockedPackage)
            intent.extras?.let { putExtras(it) }
        }
        startActivity(mainIntent)
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Prevent back button from dismissing
    }
}
