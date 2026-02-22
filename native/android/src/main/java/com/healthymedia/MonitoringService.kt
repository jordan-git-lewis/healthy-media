package com.healthymedia

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Message
import android.os.Messenger
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Foreground service that continuously monitors which app is in the foreground and
 * emits events to the React Native layer when a blocked app is detected.
 *
 * Runs in the dedicated `:monitoring` Android process (declared in the manifest).
 *
 * IPC Protocol (via Messenger):
 *   MSG_START (1) — start monitoring with config bundle
 *   MSG_STOP  (2) — stop monitoring, emit onServiceStopped
 *   MSG_UPDATE_BLOCKED_APPS (3) — replace blocked package list at runtime
 *   MSG_GET_STATUS (4) — query whether the service is running (unused in current flow;
 *                         isRunning state read directly from the bridge module)
 *
 * Events emitted to React Native:
 *   onBlockedAppDetected  { packageName, appName }
 *   onServiceStopped      { reason, message }
 */
class MonitoringService : Service() {

    companion object {
        const val MSG_START = 1
        const val MSG_STOP = 2
        const val MSG_UPDATE_BLOCKED_APPS = 3
        const val MSG_GET_STATUS = 4

        const val CHANNEL_ID = "healthy_media_monitoring"
        const val NOTIFICATION_ID = 1001
        const val PREFS_NAME = "healthy_media_monitoring_config"
        const val PREFS_KEY_PACKAGES = "blocked_packages"
        const val PREFS_KEY_INTERVAL = "polling_interval_ms"

        const val EXTRA_PACKAGES = "packages"
        const val EXTRA_INTERVAL = "pollingIntervalMs"

        // Exposed so the bridge module can track whether the service is running.
        @Volatile
        var isRunning: Boolean = false
            private set
    }

    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------

    private var blockedPackages: Set<String> = emptySet()
    private var pollingIntervalMs: Long = 500L

    private val detector: ForegroundAppDetector by lazy {
        UsageStatsDetector(applicationContext)
    }

    private val handler = Handler(Looper.getMainLooper())
    private var lastForegroundPackage: String? = null

    private val pollingRunnable = object : Runnable {
        override fun run() {
            if (!isRunning) return
            try {
                checkForegroundApp()
            } catch (e: Exception) {
                emitServiceStopped("error", "Monitoring loop error: ${e.message}")
                stopSelf()
                return
            }
            handler.postDelayed(this, pollingIntervalMs)
        }
    }

    // ---------------------------------------------------------------------------
    // IPC Messenger
    // ---------------------------------------------------------------------------

    private val incomingHandler = object : Handler(Looper.getMainLooper()) {
        override fun handleMessage(msg: Message) {
            when (msg.what) {
                MSG_START -> handleStart(msg.data)
                MSG_STOP -> handleStop()
                MSG_UPDATE_BLOCKED_APPS -> handleUpdateBlockedApps(msg.data)
                MSG_GET_STATUS -> { /* Status read from static isRunning */ }
                else -> super.handleMessage(msg)
            }
        }
    }

    private val messenger = Messenger(incomingHandler)

    override fun onBind(intent: Intent?): IBinder = messenger.binder

    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        isRunning = true

        // If started via BootReceiver with config in the intent extras, apply it.
        intent?.let { applyConfigFromIntent(it) }

        // Start polling loop if we have packages to block.
        if (blockedPackages.isNotEmpty()) {
            detector.start()
            handler.post(pollingRunnable)
        }

        return START_STICKY
    }

    override fun onDestroy() {
        isRunning = false
        handler.removeCallbacks(pollingRunnable)
        detector.stop()
        emitServiceStopped("system_killed", "MonitoringService destroyed by system")
        super.onDestroy()
    }

    /**
     * When the user swipes away the task, do NOT stop the service. The service
     * continues running in the :monitoring process.
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        // Intentionally empty — service continues running.
        // Emit system_killed only if the service actually stops (onDestroy).
    }

    // ---------------------------------------------------------------------------
    // IPC Handlers
    // ---------------------------------------------------------------------------

    private fun handleStart(data: Bundle?) {
        val packages = data?.getStringArrayList(EXTRA_PACKAGES) ?: return
        val interval = data.getLong(EXTRA_INTERVAL, 500L)

        blockedPackages = packages.toSet()
        pollingIntervalMs = interval

        persistConfig()

        if (!isRunning) {
            isRunning = true
            startForeground(NOTIFICATION_ID, buildNotification())
        }

        handler.removeCallbacks(pollingRunnable)
        detector.start()
        handler.post(pollingRunnable)
    }

    private fun handleStop() {
        isRunning = false
        handler.removeCallbacks(pollingRunnable)
        detector.stop()
        emitServiceStopped("user_stopped", "MonitoringService stopped by user")
        stopSelf()
    }

    private fun handleUpdateBlockedApps(data: Bundle?) {
        val packages = data?.getStringArrayList(EXTRA_PACKAGES) ?: return
        blockedPackages = packages.toSet()
        persistConfig()
        // Reset last detected package so we re-evaluate on next poll.
        lastForegroundPackage = null
    }

    // ---------------------------------------------------------------------------
    // Polling
    // ---------------------------------------------------------------------------

    private fun checkForegroundApp() {
        val foregroundPackage = detector.getCurrentForegroundApp() ?: return

        // Only emit once per continuous foreground session for the same app.
        if (foregroundPackage == lastForegroundPackage) return
        lastForegroundPackage = foregroundPackage

        if (foregroundPackage in blockedPackages) {
            emitBlockedAppDetected(foregroundPackage)
        }
    }

    private fun emitBlockedAppDetected(packageName: String) {
        val appName = getAppName(packageName)
        val params = Arguments.createMap().apply {
            putString("packageName", packageName)
            putString("appName", appName)
        }
        emitEvent("onBlockedAppDetected", params)

        // Call OverlayManager to display the blocking overlay.
        // OverlayManager is implemented in #37.
        OverlayManager.showBlockedAppOverlay(applicationContext, packageName, appName)
    }

    private fun emitServiceStopped(reason: String, message: String) {
        val params = Arguments.createMap().apply {
            putString("reason", reason)
            putString("message", message)
        }
        emitEvent("onServiceStopped", params)
    }

    private fun emitEvent(eventName: String, params: com.facebook.react.bridge.WritableMap) {
        try {
            val reactApp = applicationContext as? ReactApplication ?: return
            reactApp.reactNativeHost.reactInstanceManager
                .currentReactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        } catch (_: Exception) {
            // React context may not be available in :monitoring process;
            // events are best-effort from this process.
        }
    }

    // ---------------------------------------------------------------------------
    // Config persistence (SharedPreferences)
    // ---------------------------------------------------------------------------

    private fun getPrefs(): SharedPreferences =
        applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun persistConfig() {
        getPrefs().edit().apply {
            putStringSet(PREFS_KEY_PACKAGES, blockedPackages)
            putLong(PREFS_KEY_INTERVAL, pollingIntervalMs)
            apply()
        }
    }

    private fun applyConfigFromIntent(intent: Intent) {
        val packages = intent.getStringArrayListExtra(EXTRA_PACKAGES) ?: return
        val interval = intent.getLongExtra(EXTRA_INTERVAL, 500L)
        blockedPackages = packages.toSet()
        pollingIntervalMs = interval
        persistConfig()
    }

    // ---------------------------------------------------------------------------
    // Notification
    // ---------------------------------------------------------------------------

    private fun createNotificationChannel() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Healthy Media Monitoring",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Healthy Media running to enforce app limits"
                setShowBadge(false)
            }
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Healthy Media is active")
            .setContentText("Monitoring app usage in the background")
            .setSmallIcon(android.R.drawable.ic_menu_manage)
            .setOngoing(true)
            .build()
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private fun getAppName(packageName: String): String {
        return try {
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (_: Exception) {
            packageName
        }
    }
}
