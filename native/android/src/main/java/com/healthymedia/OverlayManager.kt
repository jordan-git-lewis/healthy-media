package com.healthymedia

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.provider.Settings
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import java.time.Instant

/**
 * Manages the SYSTEM_ALERT_WINDOW blocking overlay displayed over all apps.
 *
 * Inflates [blocking_overlay.xml], populates it from an OverlayConfig, and
 * adds it to the WindowManager using TYPE_APPLICATION_OVERLAY. Wired up to
 * emit the 'onOverrideConfirmed' React Native event when the user completes
 * the slide gesture.
 *
 * Must be used from the :monitoring process (where MonitoringService runs).
 */
object OverlayManager {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    // ---------------------------------------------------------------------------
    // Public API called by MonitoringService
    // ---------------------------------------------------------------------------

    /**
     * Convenience method called by MonitoringService when a blocked app is detected.
     * Creates a minimal config and delegates to [show].
     */
    fun showBlockedAppOverlay(context: Context, packageName: String, appName: String) {
        val config = OverlayConfig(
            appName = appName,
            packageName = packageName,
            taskProgress = null,
            timeRemaining = null,
            enforcementLevel = "hard_block"
        )
        show(context, config, onOverrideConfirmed = { pkg, name ->
            emitOverrideConfirmed(context, pkg, name)
        })
    }

    /**
     * Shows the overlay with full config (called from OverlayManagerModule).
     */
    fun show(
        context: Context,
        config: OverlayConfig,
        onOverrideConfirmed: ((packageName: String, appName: String) -> Unit)? = null
    ) {
        if (!Settings.canDrawOverlays(context)) {
            throw SecurityException("SYSTEM_ALERT_WINDOW permission is not granted")
        }

        // Dismiss existing overlay first (no leaks).
        dismiss()

        val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        windowManager = wm

        val inflater = LayoutInflater.from(context)
        val view = inflater.inflate(R.layout.blocking_overlay, null)
        overlayView = view

        // Populate view content
        view.findViewById<TextView>(R.id.tv_app_name).text = config.appName

        // Task progress
        val taskRow = view.findViewById<LinearLayout>(R.id.row_task_progress)
        val taskText = view.findViewById<TextView>(R.id.tv_task_progress)
        if (config.taskProgress != null) {
            val tp = config.taskProgress
            taskText.text = "${tp.completed} of ${tp.total} tasks done"
            taskRow.visibility = View.VISIBLE
        }

        // Time remaining
        val timeRow = view.findViewById<LinearLayout>(R.id.row_time_remaining)
        val timeText = view.findViewById<TextView>(R.id.tv_time_remaining)
        if (config.timeRemaining != null) {
            val minutes = config.timeRemaining.minutes
            val displayText = if (minutes >= 60) {
                val h = minutes / 60
                val m = minutes % 60
                if (m > 0) "${h}h ${m}m left" else "${h}h left"
            } else {
                "${minutes}m left"
            }
            timeText.text = displayText
            timeRow.visibility = View.VISIBLE
        }

        // Slide-to-confirm
        val slideView = view.findViewById<SlideToConfirmView>(R.id.slide_to_confirm)
        slideView.completionThreshold = if (config.enforcementLevel == "soft_warning") 0.40f else 0.95f
        slideView.onConfirmed = {
            onOverrideConfirmed?.invoke(config.packageName, config.appName)
            dismiss()
        }

        // WindowManager layout params
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        )

        wm.addView(view, params)
    }

    /**
     * Removes the overlay from the WindowManager. Safe to call when no overlay is shown.
     */
    fun dismiss() {
        val view = overlayView ?: return
        try {
            windowManager?.removeView(view)
        } catch (_: Exception) {
            // View may already be detached.
        } finally {
            overlayView = null
            windowManager = null
        }
    }

    /**
     * Returns true if an overlay is currently visible.
     */
    fun isShowing(): Boolean = overlayView != null

    // ---------------------------------------------------------------------------
    // Event emission
    // ---------------------------------------------------------------------------

    private fun emitOverrideConfirmed(context: Context, packageName: String, appName: String) {
        try {
            val timestamp = Instant.now().toString()
            val reactApp = context.applicationContext as? com.facebook.react.ReactApplication ?: return
            val params = com.facebook.react.bridge.Arguments.createMap().apply {
                putString("packageName", packageName)
                putString("appName", appName)
                putString("timestamp", timestamp)
            }
            reactApp.reactNativeHost.reactInstanceManager
                .currentReactContext
                ?.getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("onOverrideConfirmed", params)
        } catch (_: Exception) {
            // Best-effort from :monitoring process.
        }
    }
}

// ---------------------------------------------------------------------------
// Config data class (mirrors TypeScript OverlayConfig)
// ---------------------------------------------------------------------------

data class OverlayConfig(
    val appName: String,
    val packageName: String,
    val taskProgress: TaskProgress?,
    val timeRemaining: TimeRemaining?,
    val enforcementLevel: String
) {
    data class TaskProgress(val completed: Int, val total: Int, val threshold: Int)
    data class TimeRemaining(val minutes: Int)
}
